@echo off
echo ===================================================
echo   GPCL Finance Service - Windows Server PM2 Setup
echo ===================================================

REM Ensure logs directory exists
if not exist "logs" mkdir logs

echo Installing production dependencies...
call npm install --omit=dev

echo Running Database Migrations...
call npm run migrate

echo Managing PM2 process...
call pm2 stop gpcl-finance-service 2>nul
call pm2 delete gpcl-finance-service 2>nul
call pm2 start ecosystem.config.js
call pm2 save

echo.
echo ===================================================
echo   Deployment Completed Successfully!
echo   Service Running under PM2 on port 3006.
echo   Check status: npx pm2 status
echo   View logs: npx pm2 logs gpcl-finance-service
echo ===================================================
