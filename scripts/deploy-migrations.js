#!/usr/bin/env node

/**
 * Production Database Migration Deployment Script
 * Applies all pending migrations to the target SQL Server database
 *
 * Usage:
 *   node scripts/deploy-migrations.js [--server=10.100.0.20] [--database=GPCLFinanceResource] [--backup]
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const config = {
  server: process.env.DB_SERVER || '10.100.0.20',
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_NAME || 'GPCLFinanceResource',
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD,
    },
  },
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
  },
};

const migrationsDir = path.join(__dirname, 'migrations');

async function runMigration(connection, filePath) {
  const fileName = path.basename(filePath);
  const sqlContent = fs.readFileSync(filePath, 'utf-8');

  console.log(`\n📝 Running migration: ${fileName}`);
  console.log('─'.repeat(60));

  try {
    const request = connection.request();
    await request.batch(sqlContent);
    console.log(`✅ Migration ${fileName} completed successfully`);
    return true;
  } catch (err) {
    console.error(`❌ Migration ${fileName} failed:`);
    console.error(err.message);
    throw err;
  }
}

async function createBackup(connection) {
  console.log('\n💾 Creating database backup...');
  const dbName = config.database;
  const backupPath = `C:\\Backups\\${dbName}_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;

  try {
    const request = connection.request();
    await request.query(`
      BACKUP DATABASE [${dbName}]
      TO DISK = '${backupPath}'
      WITH INIT, COMPRESSION
    `);
    console.log(`✅ Backup created at: ${backupPath}`);
  } catch (err) {
    console.warn(`⚠️  Backup failed (non-critical): ${err.message}`);
  }
}

async function deployMigrations() {
  console.log('🚀 GPCL Finance Service - Database Migration Deployment');
  console.log('═'.repeat(60));
  console.log(`\nTarget Database: ${config.server}:${config.port}/${config.database}`);
  console.log(`User: ${config.authentication.options.userName}`);

  let connection;

  try {
    connection = new sql.ConnectionPool(config);
    await connection.connect();
    console.log('\n✅ Connected to database successfully');

    const migrations = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (migrations.length === 0) {
      console.log('\n⚠️  No migrations found');
      return;
    }

    console.log(`\n📋 Found ${migrations.length} migration(s):`);
    migrations.forEach(m => console.log(`  • ${m}`));

    // Create backup before running migrations
    await createBackup(connection);

    // Run each migration
    for (const migration of migrations) {
      const filePath = path.join(migrationsDir, migration);
      await runMigration(connection, filePath);
    }

    // Verify schema
    console.log('\n✅ Verifying schema...');
    const request = connection.request();
    const tables = await request.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    const tableNames = tables.recordset.map(r => r.TABLE_NAME);
    console.log(`\n📊 Database contains ${tableNames.length} tables:`);
    tableNames.forEach(t => console.log(`  • ${t}`));

    // Verify Roles and RolePermissions
    const req2 = connection.request();
    const rolesCheck = await req2.query('SELECT COUNT(*) as cnt FROM Roles');

    const req3 = connection.request();
    const permsCheck = await req3.query('SELECT COUNT(*) as cnt FROM RolePermissions');

    console.log(`\n✅ Roles table: ${rolesCheck.recordset[0].cnt} roles`);
    console.log(`✅ RolePermissions table: ${permsCheck.recordset[0].cnt} permissions`);

    // Verify Clients columns
    const req4 = connection.request();
    const clientsColumns = await req4.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Clients'
      ORDER BY COLUMN_NAME
    `);

    console.log(`\n✅ Clients table has ${clientsColumns.recordset.length} columns`);
    const requiredCols = ['Address', 'TaxId', 'IsActive', 'UpdatedAt'];
    const actualCols = clientsColumns.recordset.map(r => r.COLUMN_NAME);
    const missingCols = requiredCols.filter(c => !actualCols.includes(c));

    if (missingCols.length === 0) {
      console.log('  ✅ All required columns present');
    } else {
      console.log(`  ❌ Missing columns: ${missingCols.join(', ')}`);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ All migrations applied successfully!');
    console.log('═'.repeat(60));

  } catch (err) {
    console.error('\n❌ Migration deployment failed:');
    console.error(err.message);
    console.error('\nRollback any changes manually if needed.');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

// Run
deployMigrations();
