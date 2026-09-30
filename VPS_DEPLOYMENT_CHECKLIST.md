# VPS Deployment Checklist - GPCL Finance Service

**Deployment Date**: _______________  
**Deployed By**: _______________  
**VPS Address**: _______________  
**Domain**: _______________  

---

## Pre-Deployment Phase (Day -1)

### Infrastructure Preparation
- [ ] VPS provisioned and accessible via SSH
- [ ] Minimum specifications verified (2 CPU, 4GB RAM, 20GB disk)
- [ ] SSH key configured and tested
- [ ] Firewall configured (ports 22, 80, 443 open)
- [ ] Static IP assigned to VPS

### Software Prerequisites
- [ ] Node.js 18+ installed and working
  - Command: `node --version` → Expected: v18.x.x or higher
  - Command: `npm --version` → Expected: 9.x.x or higher
- [ ] Git installed
  - Command: `git --version`
- [ ] PM2 installed globally
  - Command: `pm2 --version`
- [ ] SQL Server connectivity verified from VPS

### Secrets & Credentials Prepared
- [ ] JWT_SECRET generated (32+ character random string)
  - Saved in secure location (password manager/vault)
- [ ] Database password created (16+ chars, mixed case, numbers, symbols)
  - Saved in secure location
- [ ] Database user configured on SQL Server
- [ ] GitHub access verified (SSH key or personal access token)
- [ ] SSL certificate obtained or Let's Encrypt ready
  - If using Let's Encrypt, domain must be properly configured

---

## Deployment Phase (Day 0)

### Step 1: Clone Repository (5 min)
- [ ] SSH into VPS
  ```bash
  ssh user@vps-ip
  ```
- [ ] Navigate to application directory
  ```bash
  cd /var/www
  # or Windows: cd C:\WebHost
  ```
- [ ] Clone repository
  ```bash
  git clone https://github.com/agbey1/gpcl-finance-service.git finance
  cd finance
  ```
- [ ] Verify files cloned correctly
  ```bash
  ls -la | head -20
  ```

### Step 2: Configure Environment (10 min)
- [ ] Create `.env` file
  ```bash
  nano .env
  # or on Windows: notepad .env
  ```
- [ ] Set environment variables:
  ```
  JWT_SECRET=<generated-secret>
  JWT_EXPIRY=24h
  
  DB_SERVER=<sql-server-hostname>
  DB_PORT=1433
  DB_NAME=GPCLFinanceResource
  DB_USER=sa
  DB_PASSWORD=<strong-password>
  DB_ENCRYPT=true
  DB_TRUST_SERVER_CERTIFICATE=true
  
  NODE_ENV=production
  PORT=3006
  ```
- [ ] Verify `.env` is NOT committed (check .gitignore)
- [ ] Test database connection
  ```bash
  node -e "require('mssql').connect({server: process.env.DB_SERVER, authentication: {type: 'default', options: {userName: process.env.DB_USER, password: process.env.DB_PASSWORD}}, options: {encrypt: true}}).then(() => console.log('✓ DB Connected')).catch(e => console.log('✗ DB Error:', e.message))"
  ```

### Step 3: Install Dependencies (15 min)
- [ ] Install npm packages
  ```bash
  npm ci
  ```
- [ ] Wait for completion (may take 3-5 minutes)
- [ ] Verify installation
  ```bash
  npm list --depth=0
  ```

### Step 4: Build Application (15 min)
- [ ] Build for production
  ```bash
  npm run build
  ```
- [ ] Expected output: "Compiled client and server successfully"
- [ ] Verify `.next` directory created
  ```bash
  ls -la .next
  ```

### Step 5: Database Migration (20 min)
- [ ] **IMPORTANT: Backup existing database first**
  ```bash
  sqlcmd -S <server> -U sa -P <password> -Q "BACKUP DATABASE [GPCLFinanceResource] TO DISK='C:\Backups\pre_deploy_$(date +%Y%m%d_%H%M%S).bak' WITH INIT, COMPRESSION"
  ```
- [ ] Run migration script
  ```bash
  node scripts/deploy-migrations.js
  ```
- [ ] Expected output shows all migrations applied:
  ```
  ✅ Roles table: 4 roles
  ✅ RolePermissions table: 42 permissions
  ✅ Clients table has 10 columns
  ✅ All migrations applied successfully!
  ```
- [ ] Verify schema from SQL Server:
  ```sql
  SELECT COUNT(*) FROM Roles;  -- Expected: 4
  SELECT COUNT(*) FROM Users;  -- Expected: 1 (admin)
  ```

### Step 6: Start Application (10 min)
- [ ] Start with PM2
  ```bash
  pm2 start npm --name "gpcl-finance" -- start
  ```
- [ ] Verify PM2 status
  ```bash
  pm2 status
  # Expected: gpcl-finance - online
  ```
- [ ] Save PM2 config
  ```bash
  pm2 save
  ```
- [ ] Enable startup on reboot
  ```bash
  pm2 startup
  ```
- [ ] Wait 10-15 seconds for full startup
- [ ] Check logs
  ```bash
  pm2 logs gpcl-finance --lines 20
  ```

### Step 7: Verify Application (15 min)
- [ ] Health check - API endpoint
  ```bash
  curl -i http://localhost:3006/api/v1/auth/me
  # Expected: HTTP 401 (no token)
  ```
- [ ] Login test
  ```bash
  curl -X POST http://localhost:3006/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@gpcl.com","password":"Password123!"}'
  # Expected: {"status":"SUCCESS","token":"..."}
  ```
- [ ] Verify database connection works
  ```bash
  curl -H "Authorization: Bearer <token>" \
    http://localhost:3006/api/v1/roles
  # Expected: List of 4 roles
  ```
- [ ] Check application logs for errors
  ```bash
  pm2 logs gpcl-finance --lines 50
  ```

### Step 8: Configure Reverse Proxy (20 min)
- [ ] Install Nginx
  ```bash
  sudo apt-get install -y nginx  # Linux
  # or Windows: Download from nginx.org
  ```
- [ ] Create Nginx configuration
  ```bash
  sudo nano /etc/nginx/sites-available/gpcl-finance
  ```
  - Copy template from VPS_DEPLOYMENT_GUIDE.md
  - Update domain name
- [ ] Enable configuration
  ```bash
  sudo ln -s /etc/nginx/sites-available/gpcl-finance /etc/nginx/sites-enabled/
  ```
- [ ] Test Nginx config
  ```bash
  sudo nginx -t
  # Expected: nginx: configuration file test is successful
  ```
- [ ] Reload Nginx
  ```bash
  sudo systemctl reload nginx
  ```

### Step 9: SSL Certificate Setup (10 min)
- [ ] Install Certbot
  ```bash
  sudo apt-get install -y certbot python3-certbot-nginx
  ```
- [ ] Get certificate from Let's Encrypt
  ```bash
  sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
  ```
- [ ] Verify certificate
  ```bash
  sudo certbot certificates
  ```
- [ ] Test SSL/TLS
  ```bash
  openssl s_client -connect yourdomain.com:443
  ```

---

## Post-Deployment Phase (Day 0 - Evening)

### Application Verification
- [ ] Access application via web browser
  - URL: `https://yourdomain.com`
  - Expected: Login page loads
  - Check browser console for errors (F12)
- [ ] Test login with admin credentials
  - Email: `admin@gpcl.com`
  - Password: `Password123!`
  - Expected: Redirected to dashboard
- [ ] Test different user roles (if available)
  - [ ] Create test users for each role
  - [ ] Verify proper access control per role
- [ ] Test invoice creation (sample transaction)
  - [ ] Navigate to Finance → Invoices
  - [ ] Create sample invoice
  - [ ] Verify auto-calculated taxes (VAT 15%, NHIS 2.5%, GETFund 2.5%)
- [ ] Test payment recording
  - [ ] Record payment against invoice
  - [ ] Verify invoice status changes
- [ ] Test journal entry posting
  - [ ] Post sample manual journal entry
  - [ ] Verify double-entry balance

### API Testing
- [ ] Test authentication endpoint
  ```bash
  curl -X POST https://yourdomain.com/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@gpcl.com","password":"Password123!"}'
  ```
- [ ] Test protected endpoints with token
  ```bash
  curl -H "Authorization: Bearer $TOKEN" \
    https://yourdomain.com/api/v1/invoices
  ```
- [ ] Test error handling (invalid requests)
  ```bash
  curl https://yourdomain.com/api/v1/nonexistent
  # Expected: 404 error
  ```

### Database Verification
- [ ] Verify all tables have data
  ```sql
  SELECT 
    'Users' as TableName, COUNT(*) as RecordCount FROM Users
  UNION ALL
  SELECT 'Roles', COUNT(*) FROM Roles
  UNION ALL
  SELECT 'Invoices', COUNT(*) FROM Invoices
  UNION ALL
  SELECT 'Payments', COUNT(*) FROM Payments
  UNION ALL
  SELECT 'JournalEntries', COUNT(*) FROM JournalEntries;
  ```
- [ ] Check audit logging is working
  ```sql
  SELECT TOP 5 * FROM AuditLogs ORDER BY CreatedAt DESC;
  ```
- [ ] Verify user authentication works end-to-end
  ```sql
  SELECT Id, Email, Role, IsActive FROM Users;
  ```

### Performance & Monitoring
- [ ] Check application memory usage
  ```bash
  pm2 monit
  ```
- [ ] Check disk space
  ```bash
  df -h
  ```
- [ ] Check uptime
  ```bash
  pm2 status
  ```
- [ ] Test log rotation (if configured)
  ```bash
  ls -lah /var/log/gpcl-finance/
  ```

---

## Post-Deployment Phase (Day +1)

### Security Hardening
- [ ] Reset admin password
  - [ ] Login to admin account
  - [ ] Navigate to Settings
  - [ ] Change password to something strong (>16 characters)
- [ ] Create first limited-access user (non-admin)
- [ ] Configure backup schedule
  ```bash
  crontab -e
  # Add: 0 2 * * * /usr/local/bin/backup-gpcl-finance.sh
  ```
- [ ] Enable database encryption at rest
- [ ] Review security logs for suspicious activity

### Backup Verification
- [ ] Test backup script
  ```bash
  /usr/local/bin/backup-gpcl-finance.sh
  ```
- [ ] Verify backup file created
  ```bash
  ls -lah /var/backups/gpcl-finance/
  ```
- [ ] Test backup restore procedure (dry-run)
  - Do NOT actually restore to production
  - Verify backup can be restored on test server

### Documentation & Runbooks
- [ ] Document actual deployment steps taken
- [ ] Update VPS_DEPLOYMENT_GUIDE.md with any deviations
- [ ] Document database password location (secure vault)
- [ ] Create operational runbooks:
  - [ ] How to restart application
  - [ ] How to view logs
  - [ ] How to restore from backup
  - [ ] How to add new users
  - [ ] How to troubleshoot common issues
- [ ] Share documentation with operations team

### Monitoring Setup
- [ ] Setup health check monitoring
  ```bash
  # Test scheduled health check
  curl -s http://localhost:3006/api/v1/auth/me > /dev/null && echo "OK" || echo "DOWN"
  ```
- [ ] Setup alert for application crashes
- [ ] Setup alert for disk space threshold
- [ ] Setup alert for database connection failures

---

## Contingency & Rollback

### If Deployment Fails
- [ ] Stop current application
  ```bash
  pm2 stop gpcl-finance
  ```
- [ ] Restore database from backup
  ```bash
  sqlcmd -S <server> -U sa -P <password> \
    -Q "RESTORE DATABASE [GPCLFinanceResource] FROM DISK='<backup-file>' WITH REPLACE"
  ```
- [ ] Restore previous application version
  ```bash
  cd /var/www
  rm -rf finance
  git clone -b <previous-tag> https://github.com/agbey1/gpcl-finance-service.git finance
  ```
- [ ] Restart with previous version
  ```bash
  cd /var/www/finance
  npm ci && npm run build
  pm2 restart gpcl-finance
  ```

### Known Issues & Workarounds
- [ ] Large file uploads timeout
  - Workaround: Increase proxy_read_timeout in Nginx
  - See VPS_DEPLOYMENT_GUIDE.md for Nginx config
- [ ] Database connection pool exhaustion
  - Workaround: Restart application
  - Long-term: Increase connection pool size in .env

---

## Sign-Off

### Deployment Verified By
- [ ] Developer: _________________ Date: _________
- [ ] QA/Tester: _________________ Date: _________
- [ ] Operations: _________________ Date: _________

### Go-Live Approval
- [ ] All checks passed ✓
- [ ] Stakeholder approval obtained ✓
- [ ] Users notified of deployment ✓
- [ ] Support team briefed ✓

---

**Deployment Completion Time**: _______________  
**Total Duration**: _______________  
**Any Issues Encountered**: _______________ (describe on separate sheet)  
**Notes**: _______________

---

For questions or issues, refer to:
- VPS_DEPLOYMENT_GUIDE.md (detailed deployment guide)
- API_DOCUMENTATION.md (API reference)
- PRODUCTION_DEPLOYMENT_CHECKLIST.md (original production checklist)
- GitHub: https://github.com/agbey1/gpcl-finance-service
