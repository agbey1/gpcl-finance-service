# GPCL Finance Service - Setup & Windows PM2 Deployment Guide

## 1. Prerequisites
- **Node.js**: v20.x or higher
- **PM2**: Global PM2 process manager installed on Windows Server (`npm install -g pm2`)
- **Database**: Microsoft SQL Server 2019+ or Azure SQL DB

---

## 2. Environment Configuration (`.env.local`)
Create a `.env.local` file in the root directory on the production server (refer to `.env.example`):

```ini
NODE_ENV=production
PORT=3006

# Cryptographic Security
JWT_SECRET=generate-a-secure-random-32-character-secret-key-here!

# Microsoft SQL Server Database Credentials
SQLSERVER_HOST=10.100.0.12
SQLSERVER_PORT=1433
SQLSERVER_DATABASE=gpcl_finance_db
SQLSERVER_USER=sa
SQLSERVER_PASSWORD=ProductionPassword123!
SQLSERVER_ENCRYPT=false
SQLSERVER_TRUST=true
```

---

## 3. Database Migrations
Run the SQL database schema migration before starting the application:

```cmd
npx ts-node scripts/migrate.ts
```
Or execute [`scripts/migrations/001_initial_schema.sql`](file:///c:/projects/gpcl-finance-service/scripts/migrations/001_initial_schema.sql) directly in SQL Server Management Studio (SSMS).

---

## 4. Deploying with PM2 on Windows Server

1. **Unzip** the deployment archive into `C:\webhost\gpcl-finance-service`.
2. Ensure `.env.local` is present in the application root directory.
3. Open PowerShell or Command Prompt as Administrator and run:
   ```cmd
   deploy-windows.bat
   ```
4. Or execute manually:
   ```cmd
   npm install --omit=dev
   npm run build
   pm2 start ecosystem.config.js
   pm2 save
   ```

---

## 5. Verification & Monitoring
- **Process Status**: `pm2 status`
- **Application Logs**: `pm2 logs gpcl-finance-service`
- **Persistent Disk Logs**: Check `C:\webhost\gpcl-finance-service\logs\app.log` and `error.log`.
- **Health & Health Metric Endpoint**: `http://localhost:3006/api/v1/auth/me`
