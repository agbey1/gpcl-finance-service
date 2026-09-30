# Quick Start - Docker Deployment to VPS

**VPS**: 162.35.162.140 (vps3601811)  
**Port**: 3006  
**Time to Deploy**: ~45 minutes

---

## Step 1: SSH into VPS

```bash
ssh -i ~/.ssh/id_rsa root@162.35.162.140
```

---

## Step 2: Run Full Deployment Script

This ONE command will handle everything:

```bash
bash <(curl -s https://raw.githubusercontent.com/agbey1/gpcl-finance-service/main/scripts/docker-deploy-vps.sh) deploy
```

**OR clone and run locally:**

```bash
cd /opt
git clone https://github.com/agbey1/gpcl-finance-service.git gpcl-finance
cd gpcl-finance
chmod +x scripts/docker-deploy-vps.sh
./scripts/docker-deploy-vps.sh deploy
```

---

## Step 3: Configure Environment (When Prompted)

When the script asks, update `.env.docker`:

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output to JWT_SECRET in .env.docker

# Update these values:
JWT_SECRET=<generated-random-string>
DB_SERVER=10.100.0.20
DB_PASSWORD=<your-sql-server-password>
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/api/v1
```

---

## Step 4: Wait for Deployment

The script will:
1. ✅ Clone code from GitHub
2. ✅ Read all deployment instructions  
3. ✅ Build Docker image (~3 min)
4. ✅ Apply database migrations
5. ✅ Start container
6. ✅ Verify everything works

**Expected completion: 10-15 minutes**

---

## Step 5: Verify It's Running

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Test API
curl -i http://localhost:3006/api/v1/auth/me
# Expected: HTTP 401 (no token provided)
```

---

## Step 6: Configure Nginx Reverse Proxy

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/gpcl-finance
```

**Paste this config:**

```nginx
upstream gpcl_finance {
    server 127.0.0.1:3006;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://gpcl_finance;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable it:**

```bash
sudo ln -s /etc/nginx/sites-available/gpcl-finance /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Common Commands

```bash
# View logs
docker-compose logs -f

# Restart container
docker-compose restart

# Stop container
docker-compose stop

# Check health
docker-compose ps
docker stats

# Shell into container
docker-compose exec gpcl-finance-app sh
```

---

## If Deployment Fails

**Check logs:**
```bash
docker-compose logs gpcl-finance-app
```

**Common issues:**

1. **Database connection failed**
   - Verify DB_SERVER and DB_PASSWORD in `.env.docker`
   - Test: `docker-compose exec gpcl-finance-app node -e "require('mssql').connect(...).then(() => console.log('OK'))"`

2. **Port 3006 already in use**
   ```bash
   lsof -i :3006
   kill -9 <PID>
   docker-compose restart
   ```

3. **Docker image build failed**
   ```bash
   docker-compose build --no-cache
   ```

4. **Migrations failed**
   - Check SQL Server is accessible
   - Verify database exists: `GPCLFinanceResource`
   - Run manually: `docker-compose run --rm gpcl-finance-app node scripts/deploy-migrations.js`

---

## Testing the Deployment

```bash
# 1. API health check
curl -i http://localhost:3006/api/v1/auth/me
# Expected: HTTP 401

# 2. Login
curl -X POST http://localhost:3006/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gpcl.com","password":"Password123!"}'
# Expected: {"status":"SUCCESS","token":"..."}

# 3. Get token and test authenticated endpoint
TOKEN="<token-from-login>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3006/api/v1/invoices
# Expected: {"status":"SUCCESS","invoices":[...]}
```

---

## Next Steps

1. ✅ Full deployment script handles everything
2. ✅ Reads all instructions from GitHub
3. ✅ Applies migrations automatically
4. ✅ Verifies the deployment
5. Configure SSL certificate (if not using Let's Encrypt)
6. Setup monitoring and backups
7. Configure Caddy/Nginx for domain routing

---

## Deployment Script Actions

Run script with different actions:

```bash
./scripts/docker-deploy-vps.sh init       # Initialize directory only
./scripts/docker-deploy-vps.sh build      # Build image only
./scripts/docker-deploy-vps.sh migrate    # Run migrations only
./scripts/docker-deploy-vps.sh start      # Start container only
./scripts/docker-deploy-vps.sh deploy     # Full deployment
./scripts/docker-deploy-vps.sh verify     # Verify it works
./scripts/docker-deploy-vps.sh logs       # View logs
./scripts/docker-deploy-vps.sh health     # Check health
./scripts/docker-deploy-vps.sh restart    # Restart container
```

---

## Support

If you encounter issues:

1. Check `DOCKER_DEPLOYMENT_GUIDE.md` in the repo
2. Check `VPS_DEPLOYMENT_GUIDE.md` for detailed troubleshooting
3. View logs: `docker-compose logs -f`
4. Check database connectivity
5. Verify environment variables in `.env.docker`

---

**Estimated Time to Production: 45 minutes**

**Ready to deploy? SSH into the VPS and run the deploy script!**
