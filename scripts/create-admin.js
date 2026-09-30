#!/usr/bin/env node
/**
 * Creates an administrator, or resets an existing user's password and makes
 * them an active administrator.
 *
 *   npm run create-admin -- --email finance.admin@gpcl.com.gh --name "Finance Admin"
 *
 * The password is read from ADMIN_PASSWORD or prompted for (input hidden).
 * Uses the same SQLSERVER_* settings as the application.
 */
const readline = require('readline');
const bcrypt = require('bcryptjs');
const sql = require('mssql');
const path = require('path');
const fs = require('fs');

for (const file of ['.env.local', '.env']) {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  break;
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

async function main() {
  const email = (arg('email') || '').toLowerCase().trim();
  const name = arg('name') || 'Administrator';
  const role = arg('role') || 'SUPER_ADMIN';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('--email is required');

  const password = process.env.ADMIN_PASSWORD || (await promptHidden('New password: '));
  if (password.length < 10 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('Password must be at least 10 characters and contain a letter and a number');
  }
  if (password === 'Password123!') throw new Error('That password is published; choose another');

  const pool = await new sql.ConnectionPool({
    server: process.env.SQLSERVER_HOST,
    port: process.env.SQLSERVER_INSTANCE ? undefined : parseInt(process.env.SQLSERVER_PORT || '1433', 10),
    database: process.env.SQLSERVER_DATABASE,
    user: process.env.SQLSERVER_USER,
    password: process.env.SQLSERVER_PASSWORD,
    options: {
      instanceName: process.env.SQLSERVER_INSTANCE || undefined,
      encrypt: (process.env.SQLSERVER_ENCRYPT || 'true') === 'true',
      trustServerCertificate: process.env.SQLSERVER_TRUST === 'true',
    },
  }).connect();

  try {
    const hash = await bcrypt.hash(password, 12);
    const r = await pool.request()
      .input('email', email).input('name', name).input('role', role).input('hash', hash)
      .query(`
        MERGE Users AS t
        USING (SELECT @email AS Email) AS s ON t.Email = s.Email
        WHEN MATCHED THEN UPDATE SET PasswordHash = @hash, Role = @role, IsActive = 1, UpdatedAt = GETDATE()
        WHEN NOT MATCHED THEN INSERT (Email, Name, PasswordHash, Role, IsActive) VALUES (@email, @name, @hash, @role, 1)
        OUTPUT $action AS action;
      `);
    console.log(`${r.recordset[0].action === 'INSERT' ? 'Created' : 'Updated'} ${role} ${email}`);
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error('create-admin failed:', err.message);
  process.exit(1);
});
