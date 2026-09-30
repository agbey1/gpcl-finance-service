const fs = require('fs');
const path = require('path');
const sql = require('mssql');

// Simple native env file loader without external dependencies
function loadEnv() {
  const candidates = ['.env.local', '.env'];
  for (const file of candidates) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`[MIGRATE] Loading environment file: ${file}`);
      const content = fs.readFileSync(filePath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.substring(0, idx).trim();
          let val = trimmed.substring(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
      break;
    }
  }
}

loadEnv();

async function runMigrations() {
  console.log('[MIGRATE] Starting SQL Database Migrations...');

  const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'GPCL_Finance',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '1433', 10),
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    },
  };

  console.log(`[MIGRATE] Target SQL Server: ${config.server}, Database: ${config.database}`);

  try {
    const pool = await sql.connect(config);
    console.log('[MIGRATE] Connected to SQL Server successfully.');

    const candidateDirs = [
      path.resolve(process.cwd(), 'scripts', 'migrations'),
      path.join(__dirname, 'migrations'),
      path.join(__dirname, '..', 'scripts', 'migrations'),
    ];

    const migrationsDir = candidateDirs.find(d => fs.existsSync(d));

    if (!migrationsDir) {
      console.warn('[MIGRATE] No migrations directory found in candidate paths:', candidateDirs);
      process.exit(0);
    }

    console.log(`[MIGRATE] Resolved migrations directory: ${migrationsDir}`);
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      console.log(`[MIGRATE] Applying migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');

      // Split SQL script by GO statements if present
      const statements = sqlContent.split(/\bGO\b/i).filter(s => s.trim().length > 0);
      for (const statement of statements) {
        await pool.request().query(statement);
      }
      console.log(`[MIGRATE] Successfully applied: ${file}`);
    }

    console.log('[MIGRATE] All database migrations completed successfully.');
    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATE ERROR] Migration failed:', err.message);
    process.exit(1);
  }
}

runMigrations();
