module.exports = {
  apps: [
    {
      name: 'digital-fte',
      script: 'dist/cli/index.js',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_file: 'logs/pm2-combined.log',
      time: true,
      kill_timeout: 30000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
