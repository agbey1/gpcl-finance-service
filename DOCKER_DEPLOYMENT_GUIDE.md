# Docker Deployment Guide - GPCL Finance Service

**VPS**: vps3601811 (162.35.162.140)  
**Deployment Method**: Docker Container  
**Port**: 3006  
**Network**: Docker bridge network (gpcl-network)

---

## Prerequisites

✅ Docker installed (29.1.3)  
✅ Docker Compose installed  
✅ Git installed (2.53.0)  
✅ SSH access to VPS  
✅ SQL Server running (external or Docker)  

---

## Deployment Steps

### Step 1: SSH into VPS

```bash
ssh -i ~/.ssh/id_rsa root@162.35.162.140
```

### Step 2: Clone Repository

```bash
cd /opt
git clone https://github.com/agbey1/gpcl-finance-service.git gpcl-finance
cd gpcl-finance
```

### Step 3: Create Environment File

```bash
cp .env.docker.example .env.docker
nano .env.docker
```

**Update these critical values:**
```env
JWT_SECRET=<generate-32-char-random-string>
DB_SERVER=10.100.0.20  # Your SQL Server
DB_PASSWORD=<your-db-password>
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/api/v1
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Build Docker Image

```bash
docker compose build --no-cache
```

**Expected output:**
```
[+] Building 45.3s (13/13) FINISHED
 => => naming to gpcl-finance-service:latest
```

### Step 5: Run Database Migrations

**Before starting the app, apply migrations:**

```bash
docker compose run --rm gpcl-finance-app node scripts/deploy-migrations.js
```

**Expected output:**
```
✅ Roles table: 4 roles
✅ RolePermissions table: 42 permissions
✅ Migrations applied successfully!
```

### Step 6: Start the Container

```bash
docker compose up -d
```

**Verify it's running:**
```bash
docker compose ps
```

**Expected output:**
```
CONTAINER ID   IMAGE                                  STATUS          PORTS
abc12345       gpcl-finance-service:latest            Up 2 minutes    0.0.0.0:3006->3006/tcp
```

### Step 7: Check Logs

```bash
docker compose logs -f gpcl-finance-app
```

**Wait for message:**
```
> npm start

> gpcl-finance-service@1.0.0 start
> next start

  ▲ Next.js 16.3.4
  - Local:        http://localhost:3006
  - Network:      http://0.0.0.0:3006

✓ Ready in 2.3s
```

### Step 8: Verify Health

```bash
curl -i http://localhost:3006/api/v1/auth/me
# Expected: HTTP 401 (no token)
```

```bash
curl -X POST http://localhost:3006/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gpcl.com","password":"Password123!"}'
# Expected: {"status":"SUCCESS","token":"..."}
```

---

## Post-Deployment: Nginx Reverse Proxy Setup

### Step 1: Create Nginx Config

**File: `/etc/nginx/sites-available/gpcl-finance`**

```nginx
upstream gpcl_finance {
    server 127.0.0.1:3006;
    keepalive 64;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    client_max_body_size 100M;
    
    gzip on;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/json;

    location / {
        proxy_pass http://gpcl_finance;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long operations
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

### Step 2: Enable and Test

```bash
sudo ln -s /etc/nginx/sites-available/gpcl-finance /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Docker Management Commands

### View Logs
```bash
docker compose logs gpcl-finance-app
docker compose logs -f gpcl-finance-app --tail 50
```

### Stop Container
```bash
docker compose stop
```

### Restart Container
```bash
docker compose restart
```

### Remove Container (keeping image)
```bash
docker compose down
```

### Remove Everything (cleanup)
```bash
docker compose down -v  # Also removes volumes
```

### Enter Container Shell
```bash
docker compose exec gpcl-finance-app sh
```

### Check Container Status
```bash
docker compose ps
docker stats
```

---

## Backup & Restore

### Backup Database
```bash
docker compose exec -T gpcl-finance-app node -e "
const sql = require('mssql');
sql.connect(process.env.DB_SERVER, ...).then(() => {
  // Backup logic
}).catch(e => console.log(e));
"
```

**Or backup directly from SQL Server:**
```bash
sqlcmd -S 10.100.0.20 -U sa -P <password> \
  -Q "BACKUP DATABASE [GPCLFinanceResource] TO DISK='C:\Backups\gpcl_$(date +%Y%m%d).bak' WITH INIT, COMPRESSION"
```

---

## Troubleshooting

### Container Won't Start
```bash
docker compose logs gpcl-finance-app
docker compose ps
```

### Port Already in Use
```bash
# Check what's using port 3006
lsof -i :3006
# Kill the process
kill -9 <PID>
```

### Database Connection Error
```bash
# Verify database connectivity from container
docker compose exec gpcl-finance-app node -e "
const sql = require('mssql');
sql.connect({
  server: process.env.DB_SERVER,
  authentication: { type: 'default', options: { userName: process.env.DB_USER, password: process.env.DB_PASSWORD } },
  options: { encrypt: true }
}).then(() => console.log('Connected!')).catch(e => console.log(e.message));
"
```

### High Memory Usage
```bash
docker stats gpcl-finance-app
docker compose down
docker compose up -d
```

---

## Production Best Practices

1. **Use environment variables** - Never hardcode secrets
2. **Enable health checks** - Container auto-restarts if unhealthy
3. **Set resource limits** - Prevent runaway processes
4. **Use named volumes** - For persistent data
5. **Enable logging** - For debugging and monitoring
6. **Regular backups** - Daily database backups
7. **Monitor logs** - Watch for errors and warnings

### Add Resource Limits to docker-compose.yml

```yaml
services:
  gpcl-finance-app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## Coexistence with Online Gazette

GPCL Finance runs on port **3006** while Online Gazette runs on ports **80/443/3000/8080**. They can coexist safely:

| App | Container | Port | Status |
|-----|-----------|------|--------|
| GPCL Finance | gpcl_finance_app | 3006 | ✅ New |
| Online Gazette Frontend | online_gazette_frontend | 3000 | ✅ Existing |
| Online Gazette Backend | online_gazette_backend | 8080 | ✅ Existing |
| Caddy Reverse Proxy | online_gazette_caddy | 80/443 | ✅ Existing |

**Route both apps through Caddy:**

```caddyfile
yourdomain.com {
    reverse_proxy /finance* localhost:3006
    reverse_proxy /* localhost:3000
}

finance.yourdomain.com {
    reverse_proxy localhost:3006
}
```

---

## Monitoring & Alerts

### Setup Health Check Monitoring

```bash
cat > /usr/local/bin/check-gpcl-health.sh << 'EOF'
#!/bin/bash
if curl -sf http://localhost:3006/api/v1/auth/me > /dev/null; then
    echo "✓ GPCL Finance is healthy"
else
    echo "✗ GPCL Finance is down!"
    # Send alert or restart
    docker compose restart gpcl-finance-app
fi
EOF

chmod +x /usr/local/bin/check-gpcl-health.sh
```

### Add to Crontab (every 5 minutes)
```bash
*/5 * * * * /usr/local/bin/check-gpcl-health.sh
```

---

## Next Steps

1. ✅ Pull code from GitHub
2. ✅ Configure environment variables
3. ✅ Build Docker image
4. ✅ Run database migrations
5. ✅ Start Docker container
6. ✅ Configure Nginx reverse proxy
7. ✅ Setup SSL with Let's Encrypt
8. ✅ Configure monitoring and backups

**Ready to deploy? Run the deployment script!**

---

**Last Updated**: September 30, 2026  
**Version**: 1.0
