import fs from 'fs';
import path from 'path';
import { getDb } from '../src/lib/db';
import { logger } from '../src/lib/logger';

async function runMigrations() {
  logger.info('Starting SQL Database Migrations...');
  try {
    const db = await getDb();
    const candidateDirs = [
      path.resolve(process.cwd(), 'scripts', 'migrations'),
      path.join(__dirname, 'migrations'),
      path.join(__dirname, '..', 'scripts', 'migrations'),
    ];

    const migrationsDir = candidateDirs.find(d => fs.existsSync(d));

    if (!migrationsDir) {
      logger.warn('No migrations directory found in candidate paths', { candidateDirs });
      return;
    }

    logger.info(`Resolved migrations directory: ${migrationsDir}`);
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      logger.info(`Applying migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');

      // Split SQL script by GO statements if present or execute block
      const statements = sqlContent.split(/\bGO\b/i).filter(s => s.trim().length > 0);
      for (const statement of statements) {
        await db.request().query(statement);
      }
      logger.info(`Successfully applied: ${file}`);
    }

    logger.info('All database migrations completed successfully.');
  } catch (err: any) {
    logger.error('Migration failed', { error: err.message });
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations();
}
