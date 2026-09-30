# GPCL Finance Service - VPS Deployment Guide

**Project**: GPCL Finance Service v1.0  
**Status**: Production Ready  
**Last Updated**: September 30, 2026  
**Deployment Target**: Linux/Windows VPS  

---

## Table of Contents

1. [Pre-Deployment Requirements](#pre-deployment-requirements)
2. [System Architecture](#system-architecture)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Database Setup](#database-setup)
5. [Application Configuration](#application-configuration)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Requirements

### Server Requirements

**Minimum Specifications:**
- **OS**: Windows Server 2019+ OR Linux (Ubuntu 20.04+ / CentOS 8+)
- **CPU**: 2 cores minimum (4 cores recommended)
- **RAM**: 4GB minimum (8GB recommended)
- **Disk Space**: 20GB minimum available
- **Network**: Outbound HTTPS access required

### Software Prerequisites

**Required Software:**
```
✓ Node.js 18.x LTS or higher (https://nodejs.org/)
✓ npm 9.x or higher (installed with Node.js)
✓ SQL Server 2019 or higher (or compatible database)
✓ Git (for cloning repository)
✓ PM2 (for process management)
```

**Optional but Recommended:**
```
✓ Docker & Docker Compose
✓ Nginx (reverse proxy)
✓ SSL/TLS Certificate
✓ Azure Key Vault (secrets management)
```

### Access Requirements

- Access to GitHub repository: `https://github.com/agbey1/gpcl-finance-service`
- SQL Server connection credentials
- SSH access to VPS
- Domain/IP address for application

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         VPS SERVER                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Load Balancer / Nginx Reverse Proxy        │  │
│  │              (Port 80/443 → 3006)                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │        GPCL Finance Service Application             │  │
│  │         (Node.js/Next.js on Port 3006)             │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  API Routes (v1)                              │ │  │
│  │  │  - /api/v1/auth (JWT authentication)          │ │  │
│  │  │  - /api/v1/invoices (AR operations)           │ │  │
│  │  │  - /api/v1/payments (AP operations)           │ │  │
│  │  │  - /api/v1/journals (GL operations)           │ │  │
│  │  │  - /api/v1/reconciliation (Bank rec)          │ │  │
│  │  │  - /api/v1/reports (Financial reports)        │ │  │
│  │  │  - /api/v1/admin (User & system mgmt)        │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  Frontend (Next.js App Router)                │ │  │
│  │  │  - Dashboard & Navigation                      │ │  │
│  │  │  - Module Pages (Accounting, Finance, etc)    │ │  │
│  │  │  - Role-based UI rendering                     │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              SQL Server Database                     │  │
│  │  - Users (authentication)                           │  │
│  │  - Invoices & Payments (AR/AP)                      │  │
│  │  - Journal Entries & GL (Accounting)               │  │
│  │  - Bank Statements & Reconciliation                 │  │
│  │  - Audit Logs (complete change history)            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Deployment

### Phase 1: Server Preparation (30 minutes)

#### 1.1 Install Node.js and npm

**Windows:**
```powershell
# Download and install from https://nodejs.org/
# Or use Chocolatey:
choco install nodejs

# Verify installation
node --version
npm --version
```

**Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### 1.2 Install PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Enable PM2 startup on reboot
pm2 startup
pm2 save
```

#### 1.3 Create Application Directory

**Windows:**
```powershell
mkdir "C:\WebHost\finance"
cd "C:\WebHost\finance"
```

**Linux:**
```bash
sudo mkdir -p /var/www/gpcl-finance
sudo chown -R $USER:$USER /var/www/gpcl-finance
cd /var/www/gpcl-finance
```

---

### Phase 2: Clone and Setup Application (15 minutes)

#### 2.1 Clone Repository

```bash
git clone https://github.com/agbey1/gpcl-finance-service.git .
git checkout main
```

#### 2.2 Install Dependencies

```bash
npm ci  # Use npm ci instead of npm install for production
```

#### 2.3 Create Environment Configuration

**Create `.env` file:**

```bash
# Authentication
JWT_SECRET=<generate-32-char-random-string>
JWT_EXPIRY=24h

# Database Configuration
DB_SERVER=<sql-server-hostname-or-ip>
DB_PORT=1433
DB_NAME=GPCLFinanceResource
DB_USER=sa
DB_PASSWORD=<strong-password-16-chars>
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# Application
NODE_ENV=production
PORT=3006
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/api/v1

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/gpcl-finance/app.log
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Important:** Never commit `.env` file. Keep it secure!

#### 2.4 Build Application

```bash
npm run build
```

Expected output:
```
✓ Compiled client and server successfully
✓ Next.js build complete
```

---

### Phase 3: Database Setup (45 minutes)

#### 3.1 Backup Existing Database (if applicable)

**Windows (SQL Server):**
```powershell
sqlcmd -S <sql-server> -U sa -P <password> -Q `
  "BACKUP DATABASE [GPCLFinanceResource] TO DISK='C:\Backups\gpcl_pre_deploy_$(Get-Date -Format 'yyyyMMdd_HHmmss').bak' WITH INIT, COMPRESSION"
```

**Linux (if using SQL Server in Docker):**
```bash
docker exec <sql-container> /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P <password> \
  -Q "BACKUP DATABASE [GPCLFinanceResource] TO DISK='/var/opt/mssql/backup/gpcl_pre_deploy_$(date +%Y%m%d_%H%M%S).bak' WITH INIT, COMPRESSION"
```

#### 3.2 Apply Database Migrations

```bash
cd /path/to/app
node scripts/deploy-migrations.js
```

**Expected output:**
```
✓ Roles table: 4 roles
  - ADMIN
  - SENIOR_ACCOUNTANT
  - ACCOUNTS_RECEIVABLE_CLERK
  - AUDITOR

✓ RolePermissions table: 42 permissions
  - ADMIN: 19 permissions
  - SENIOR_ACCOUNTANT: 13 permissions
  - ACCOUNTS_RECEIVABLE_CLERK: 5 permissions
  - AUDITOR: 5 permissions

✓ Clients table verified (10 columns)
✓ Users table verified
✓ Invoices table verified
✓ Payments table verified
✓ Journal Entries table verified
✓ Bank Reconciliation tables verified
✓ Audit Logs table verified

✅ All migrations applied successfully!
```

#### 3.3 Verify Database Schema

```sql
-- Connect to GPCLFinanceResource database

-- Check Users table
SELECT COUNT(*) as AdminCount FROM Users WHERE Role = 'SUPER_ADMIN';

-- Check Roles
SELECT Name, COUNT(*) as PermissionCount 
FROM Roles r
LEFT JOIN RolePermissions rp ON r.Name = rp.RoleName
GROUP BY r.Name;

-- Check Clients
SELECT COUNT(*) as ClientCount FROM Clients;

-- Check system is ready
SELECT 'System Ready' as Status;
```

---

### Phase 4: Start Application (10 minutes)

#### 4.1 Start with PM2

```bash
cd /path/to/app

# Start application
pm2 start npm --name "gpcl-finance" -- start

# Verify it's running
pm2 list

# View logs
pm2 logs gpcl-finance
```

#### 4.2 Alternative: Start with npm directly

```bash
cd /path/to/app
npm start
```

#### 4.3 Wait for Application Startup

```bash
# Wait 10-15 seconds for application to fully start
sleep 15

# Check if port 3006 is listening
netstat -an | grep 3006  # Windows
ss -an | grep 3006       # Linux
```

---

### Phase 5: Configure Reverse Proxy (Nginx)

#### 5.1 Install Nginx

**Windows:** Use Windows Subsystem for Linux (WSL) or pre-built binaries

**Linux:**
```bash
sudo apt-get update
sudo apt-get install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 5.2 Create Nginx Configuration

**File: `/etc/nginx/sites-available/gpcl-finance`**

```nginx
upstream gpcl_finance_backend {
    server 127.0.0.1:3006;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Compression
    gzip on;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
    gzip_vary on;
    gzip_disable "msie6";

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Proxy settings
    proxy_buffering on;
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;

    location / {
        proxy_pass http://gpcl_finance_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for long-running requests (file uploads, reconciliation)
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

#### 5.3 Enable Configuration

```bash
sudo ln -s /etc/nginx/sites-available/gpcl-finance /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Post-Deployment Verification

### 1. Health Check

```bash
# Test API endpoint without authentication (should return 401)
curl -i http://localhost:3006/api/v1/auth/me

# Expected response:
# HTTP/1.1 401 Unauthorized
# {"status":"ERROR","message":"No authentication token provided"}
```

### 2. Login Test

```bash
curl -X POST http://localhost:3006/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gpcl.com",
    "password": "Password123!"
  }'

# Expected response:
# {"status":"SUCCESS","token":"eyJ0eXA...","user":{"id":1,"email":"admin@gpcl.com","role":"SUPER_ADMIN"}}
```

### 3. API Verification

```bash
# Save token from login response
TOKEN="<token-from-login>"

# Test authenticated endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3006/api/v1/roles

# Expected: List of 4 roles with permissions
```

### 4. Database Connectivity Check

```bash
# Test from application
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3006/api/v1/clients

# Should return: {"status":"SUCCESS","clients":[...],"count":...}
```

### 5. Frontend Accessibility

Open browser and navigate to:
```
https://yourdomain.com
```

You should see:
- ✓ GPCL Finance Service login page
- ✓ No console errors
- ✓ HTTPS connection (green lock icon)

---

## Monitoring & Maintenance

### 1. Setup Logging

**Create log directory:**
```bash
sudo mkdir -p /var/log/gpcl-finance
sudo chown -R $USER:$USER /var/log/gpcl-finance
```

**Rotate logs with logrotate:**

**File: `/etc/logrotate.d/gpcl-finance`**
```
/var/log/gpcl-finance/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
}
```

### 2. Monitor Application

```bash
# Check PM2 status
pm2 status

# View application logs
pm2 logs gpcl-finance

# Monitor in real-time
pm2 monit
```

### 3. Performance Monitoring

**Check memory usage:**
```bash
free -h  # Linux
Get-Process node | Select-Object -Property Name, WorkingSet  # Windows
```

**Check disk usage:**
```bash
df -h /var/www/gpcl-finance  # Linux
```

### 4. Database Backups

**Automated daily backup (cron):**

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * /usr/local/bin/backup-gpcl-finance.sh
```

**Create backup script: `/usr/local/bin/backup-gpcl-finance.sh`**

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/gpcl-finance"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/gpcl_finance_$DATE.sql"

mkdir -p $BACKUP_DIR

sqlcmd -S <sql-server> -U sa -P <password> \
  -Q "BACKUP DATABASE [GPCLFinanceResource] TO DISK='$BACKUP_FILE' WITH INIT, COMPRESSION"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

---

## Troubleshooting

### Issue 1: Application Won't Start

**Symptoms:**
```
Error: EADDRINUSE: address already in use :::3006
```

**Solution:**
```bash
# Find process using port 3006
lsof -i :3006  # Linux
Get-NetTCPConnection -LocalPort 3006  # Windows

# Kill the process
kill -9 <PID>  # Linux
Stop-Process -Id <PID> -Force  # Windows

# Try starting again
pm2 start npm --name "gpcl-finance" -- start
```

### Issue 2: Database Connection Error

**Symptoms:**
```
Error: connect ECONNREFUSED 10.100.0.20:1433
```

**Solutions:**
1. Verify SQL Server is running and accessible
2. Check `.env` database credentials
3. Verify firewall allows connection to port 1433
4. Test connection manually:
   ```bash
   sqlcmd -S <server> -U sa -P <password> -Q "SELECT 1"
   ```

### Issue 3: High Memory Usage

**Symptoms:**
```
Node.js process consuming >1GB memory
```

**Solutions:**
1. Check for memory leaks in logs
2. Restart application: `pm2 restart gpcl-finance`
3. Increase server RAM
4. Enable garbage collection monitoring:
   ```bash
   pm2 start app.js --max-memory-restart 1G
   ```

### Issue 4: Slow API Responses

**Symptoms:**
```
API calls taking >5 seconds
```

**Solutions:**
1. Check database performance
2. Verify network connectivity
3. Monitor CPU/Memory usage
4. Check application logs for errors
5. Consider adding caching layer (Redis)

### Issue 5: SSL Certificate Issues

**Symptoms:**
```
ERR_SSL_VERSION_OR_CIPHER_MISMATCH
```

**Solutions:**
```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Manual renewal
sudo certbot renew --force-renewal

# Check certificate validity
openssl s_client -connect yourdomain.com:443
```

---

## Security Checklist

- [ ] Change default admin password immediately
- [ ] Generate strong JWT_SECRET (32+ characters)
- [ ] Use HTTPS/TLS for all communications
- [ ] Configure firewall to allow only required ports (80, 443)
- [ ] Enable audit logging for all transactions
- [ ] Regular database backups (daily)
- [ ] Keep Node.js and npm updated
- [ ] Review security logs regularly
- [ ] Implement rate limiting on login endpoint
- [ ] Configure database user permissions properly (sa → dedicated user)
- [ ] Store secrets in vault (not in .env)

---

## Support & Additional Resources

- **GitHub Repository**: https://github.com/agbey1/gpcl-finance-service
- **API Documentation**: See `API_DOCUMENTATION.md` in repo
- **System Specification**: See `docs/SPECIFICATION.md` in repo
- **Deployment Checklist**: See `PRODUCTION_DEPLOYMENT_CHECKLIST.md` in repo

---

**Document Version**: 1.0  
**Last Updated**: September 30, 2026  
**Maintained By**: Development Team
