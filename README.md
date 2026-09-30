# GPCL Finance Service

Finance and accounting service for Ghana Publishing Company Limited: double-entry
general ledger, invoicing and accounts receivable with Ghana statutory levies,
payments, credit notes, bank reconciliation, budgets and financial reporting.

Built with Next.js 16 (App Router, API routes) on Node.js 20 and Microsoft SQL Server.

- User guide: [USER_MANUAL.md](USER_MANUAL.md) ([PDF](GPCL_Finance_User_Manual.pdf))
- API reference: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- Deployment: [SETUP_AND_DEPLOYMENT.md](SETUP_AND_DEPLOYMENT.md), [PRODUCTION_DEPLOYMENT_CHECKLIST.md](PRODUCTION_DEPLOYMENT_CHECKLIST.md)

## Quick start (development)

```bash
npm ci
cp .env.example .env.local      # fill in SQL Server details and a JWT_SECRET
# for http://localhost set COOKIE_SECURE=false in .env.local
npm run migrate                 # create/upgrade the schema
npm run create-admin -- --email you@example.com --name "Your Name"
npm run dev                     # http://localhost:3000
```

The service refuses to start without a valid configuration. There are no
default secrets, database credentials or user accounts.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server on port 3006 |
| `npm test` | Unit and route tests (Jest, no database needed) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run migrate` | Apply pending migrations in `scripts/migrations` |
| `npm run migrate:status` | List applied / pending migrations |
| `npm run create-admin -- --email … --name …` | Create an administrator or reset their password |

## Configuration

All settings come from environment variables. See [.env.example](.env.example) for the full list.

| Variable | Required | Notes |
| --- | --- | --- |
| `JWT_SECRET` | yes | 32+ random characters. Changing it signs everyone out. |
| `SQLSERVER_HOST`, `SQLSERVER_DATABASE`, `SQLSERVER_USER`, `SQLSERVER_PASSWORD` | yes | Use a dedicated least-privilege login, not `sa`. |
| `SQLSERVER_ENCRYPT` / `SQLSERVER_TRUST` | no | Default `true` / `false` (encrypted, certificate verified). |
| `JWT_EXPIRES_IN_SECONDS` | no | Session length, default 8 hours. |
| `COOKIE_SECURE` | no | Default `true`. Set `false` only for plain-http development. |
| `TRUST_PROXY` | no | `true` only behind a reverse proxy that sets `X-Forwarded-For`. |
| `LOG_TO_FILE` | no | Also write `logs/*.log`. Logs always go to stdout. |

## Deployment

**Windows Server + PM2** (current production): run `deploy-windows.bat` from the
project directory. It installs dependencies, type-checks, tests, builds, migrates
the database and restarts the PM2 process defined in `ecosystem.config.js`.

**Docker**:

```bash
cp .env.example .env    # fill in
docker compose up -d --build finance-service --no-deps     # against an existing SQL Server
docker compose run --rm finance-service node scripts/migrate.js
docker compose run --rm -it finance-service node scripts/create-admin.js --email you@example.com --name "You"
```

`docker compose up -d` without `--no-deps` also starts a local SQL Server for testing.

**Health check**: `GET /api/v1/health` returns `200` when the database is reachable and `503` otherwise. It needs no authentication.

Run the service over HTTPS (for example behind IIS or nginx). Session cookies are
`Secure` by default and will not be sent over plain http.

## Security model

- Sessions are HS256 JWTs (HMAC-SHA256 with `JWT_SECRET`), sent as an
  `httpOnly` cookie or `Authorization: Bearer` header.
- Permissions come from the `RolePermissions` table for the user's role. `ADMIN`
  and `SUPER_ADMIN` roles have all permissions. Unknown roles get none.
- Login is rate-limited per client (10/min) and other API calls are limited to 300/min.
- Mutating finance endpoints accept an `Idempotency-Key` header, so retries do not
  post twice. Keys are scoped per user and endpoint.
- Server errors are logged in full and returned to clients as a generic message.

## Accounting rules enforced by the API

- Every posting is a balanced journal (to the cent) and is rejected for a closed
  fiscal period (month) or an inactive account.
- Invoice, payment, credit-note and journal numbers are allocated under a lock
  inside the posting transaction, so concurrent postings cannot collide.
- Invoices post AR / revenue / VAT / NHIL / GETFund. Voiding reverses all of them and is
  only allowed while nothing has been paid or credited. Otherwise issue a credit note.
- Credit notes against an invoice reverse revenue and levies pro rata and cannot exceed the balance due.
- Payments must match the invoice's client. Overpayments become an open credit note.

## Known limitations

- Several dashboard screens (Dashboard, Journal Entries, Budgets, Tax Reports,
  Vouchers, Audit Logs, parts of Reports) still show sample data and are not yet
  connected to the API. Invoices, Payments, Chart of Accounts, Bank
  Reconciliation, Users, Roles and Settings use live data.
- Rate limiting and idempotency keys are held in process memory, which is correct
  for the single-instance PM2 deployment. Running several instances needs a shared store.
- GL account codes for postings (1001, 1002, 1100, 2100, 2102, 2103, 4001) are fixed in code.
