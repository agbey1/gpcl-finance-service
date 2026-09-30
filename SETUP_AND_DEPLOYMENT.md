# GPCL Finance Service - Setup & Windows PM2 Deployment Guide

## 1. Prerequisites
- **Node.js** 20.9 or later
- **PM2** installed globally on the Windows server (`npm install -g pm2`)
- **Microsoft SQL Server** 2019+ and a dedicated SQL login for the application
  (`db_datareader` + `db_datawriter`, plus DDL rights only while running migrations). Do not use `sa`.
- HTTPS in front of the service (IIS ARR / nginx). Session cookies are `Secure` by default.

## 2. Configuration
Copy `.env.example` to `.env` in the application directory and fill it in. Never commit it.

```ini
NODE_ENV=production
PORT=3006
JWT_SECRET=<48+ random characters: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))">
SQLSERVER_HOST=<sql server host>
SQLSERVER_PORT=1433
SQLSERVER_DATABASE=GPCLFinanceResource
SQLSERVER_USER=gpcl_finance_app
SQLSERVER_PASSWORD=<password>
SQLSERVER_ENCRYPT=true
SQLSERVER_TRUST=false        # true only for a self-signed SQL Server certificate
TRUST_PROXY=true             # when behind IIS/nginx that sets X-Forwarded-For
```

The application validates this on the first request and refuses to run with missing
or weak values.

## 3. Database migrations
Back up the database first. Then:

```cmd
npm run migrate:status
npm run migrate
```

Migrations are idempotent and recorded in `dbo.SchemaMigrations`. Each one runs in a transaction.

Migration `009` **disables `admin@gpcl.com` if it still has the published default password**.
Create or restore an administrator with:

```cmd
npm run create-admin -- --email finance.admin@gpcl.com.gh --name "Finance Administrator"
```

## 4. Deploy with PM2
From the application directory, as Administrator:

```cmd
deploy-windows.bat
```

This runs `npm ci`, type-check, tests, `next build`, migrations and `npm prune --omit=dev`,
then restarts the `gpcl-finance-service` PM2 process on port 3006.

## 5. Verification & monitoring
- Health: `curl http://localhost:3006/api/v1/health` returns `200 {"status":"ok"}` (`503` if the database is unreachable)
- Unauthenticated API call: `curl http://localhost:3006/api/v1/auth/me` returns `401`
- Process: `pm2 status`, logs: `pm2 logs gpcl-finance-service` (JSON lines on stdout/stderr)
- Optional file logs: set `LOG_TO_FILE=true` to also write `logs\app.log`, `error.log`, `audit.log`

## 6. Upgrading from releases before the production-hardening update
- **SQL connections now default to encrypted with certificate verification** (`SQLSERVER_ENCRYPT=true`,
  `SQLSERVER_TRUST=false`). If the SQL Server has no trusted TLS certificate, set `SQLSERVER_TRUST=true`
  explicitly (or install a certificate) before upgrading, or the service cannot connect.
- `JWT_SECRET` is now required (32+ characters); the built-in fallback secret is gone.
- All existing sessions become invalid (token signing now uses standard HMAC-SHA256). Users sign in again.
- Run `npm run migrate` to add the new permissions (`admin.users.manage`, `finance.invoices.void`,
  `accounting.journal.view`, `accounting.accounts.*`) and the `InvoiceLines` table.
- User administration now requires `admin.users.manage` (ADMIN / SUPER_ADMIN have it by role).
- Payment method `MOMO` is now `MOBILE_MONEY`. The API rejects unknown methods.
- Voiding requires a reason and `finance.invoices.void`. It is refused once an invoice has payments or credits.
