@echo off
setlocal
echo ===================================================
echo   GPCL Finance Service - Windows Server PM2 Deploy
echo ===================================================

if not exist ".env.production" if not exist ".env" (
  echo ERROR: No .env.production or .env file found. Copy .env.example and fill it in first.
  exit /b 1
)

if not exist "logs" mkdir logs

echo Installing dependencies (including build tooling)...
call npm ci || exit /b 1

echo Type-checking, testing and building...
call npm run typecheck || exit /b 1
call npm test -- --ci || exit /b 1
call npm run build || exit /b 1

echo Applying database migrations...
call npm run migrate || exit /b 1

echo Removing development dependencies...
call npm prune --omit=dev || exit /b 1

echo Restarting under PM2...
call pm2 delete gpcl-finance-service 2>nul
call pm2 start ecosystem.config.js || exit /b 1
call pm2 save

echo.
echo ===================================================
echo   Deployment complete. Service on port 3006.
echo   Health:  curl http://localhost:3006/api/v1/health
echo   Status:  pm2 status
echo   Logs:    pm2 logs gpcl-finance-service
echo ===================================================
endlocal
