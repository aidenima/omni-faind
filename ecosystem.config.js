module.exports = {
  apps: [
    {
      name: "omnifaind",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/var/www/omnifaind",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/log/pm2/omnifaind-error.log",
      out_file: "/var/log/pm2/omnifaind-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      watch: false,
    },
  ],
};

