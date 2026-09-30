#!/usr/bin/env node
/**
 * Database migration runner for gpcl-finance-service.
 *
 *   npm run migrate            apply pending migrations
 *   npm run migrate -- --status list applied / pending migrations and exit
 *
 * Reads the same SQLSERVER_* variables as the application (from the
 * environment, or from .env.local / .env in the working directory).
 * Applied migrations are recorded in dbo.SchemaMigrations; each migration runs
 * in its own transaction. Scripts in scripts/migrations are written to be
 * idempotent, so the first run against an existing database is safe.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sql = require('mssql');

function loadEnvFile() {
  for (const file of ['.env.local', '.env']) {
    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
    console.log(`[migrate] loaded ${file}`);
    return;
  }
}

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`[migrate] ${name} is not set`);
    process.exit(2);
  }
  return v;
}

function splitBatches(content) {
  // SQL Server batch separator: a line containing only GO.
  return content.split(/^\s*GO\s*;?\s*$/gim).map((s) => s.trim()).filter(Boolean);
}

async function main() {
  loadEnvFile();
  const statusOnly = process.argv.includes('--status');

  const config = {
    server: required('SQLSERVER_HOST'),
    port: process.env.SQLSERVER_INSTANCE ? undefined : parseInt(process.env.SQLSERVER_PORT || '1433', 10),
    database: required('SQLSERVER_DATABASE'),
    user: required('SQLSERVER_USER'),
    password: required('SQLSERVER_PASSWORD'),
    requestTimeout: 300000,
    options: {
      instanceName: process.env.SQLSERVER_INSTANCE || undefined,
      encrypt: (process.env.SQLSERVER_ENCRYPT || 'true') === 'true',
      trustServerCertificate: process.env.SQLSERVER_TRUST === 'true',
    },
  };

  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();

  console.log(`[migrate] target ${config.server}/${config.database}`);
  const pool = await new sql.ConnectionPool(config).connect();
  try {
    await pool.request().batch(`
      IF OBJECT_ID('dbo.SchemaMigrations', 'U') IS NULL
      CREATE TABLE dbo.SchemaMigrations (
        Name NVARCHAR(255) NOT NULL PRIMARY KEY,
        Checksum CHAR(64) NOT NULL,
        AppliedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    `);
    const applied = new Map(
      (await pool.request().query('SELECT Name, Checksum FROM dbo.SchemaMigrations')).recordset.map((r) => [r.Name, r.Checksum])
    );

    const pending = [];
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      const checksum = crypto.createHash('sha256').update(content).digest('hex');
      if (applied.has(file)) {
        if (applied.get(file) !== checksum) {
          console.warn(`[migrate] WARNING: ${file} changed after it was applied; migrations must not be edited. Add a new one instead.`);
        }
        continue;
      }
      pending.push({ file, content, checksum });
    }

    if (statusOnly) {
      files.forEach((f) => console.log(`  ${applied.has(f) ? 'applied' : 'PENDING'}  ${f}`));
      return;
    }
    if (!pending.length) {
      console.log('[migrate] database is up to date');
      return;
    }

    for (const { file, content, checksum } of pending) {
      console.log(`[migrate] applying ${file}`);
      const tx = new sql.Transaction(pool);
      await tx.begin();
      try {
        for (const batch of splitBatches(content)) {
          await new sql.Request(tx).batch(batch);
        }
        await new sql.Request(tx)
          .input('name', file)
          .input('checksum', checksum)
          .query('INSERT INTO dbo.SchemaMigrations (Name, Checksum) VALUES (@name, @checksum)');
        await tx.commit();
      } catch (err) {
        await tx.rollback().catch(() => {});
        throw new Error(`${file}: ${err.message}`);
      }
    }
    console.log(`[migrate] applied ${pending.length} migration(s)`);
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error('[migrate] FAILED:', err.message);
  process.exit(1);
});
