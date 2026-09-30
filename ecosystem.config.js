module.exports = {
  apps: [
    {
      name: 'gpcl-finance-service',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3006,
        LOG_LEVEL: 'info',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.next'],
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      kill_timeout: 5000,
    },
  ],
};
