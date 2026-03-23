module.exports = {
  apps: [
    {
      name: 'roadmap-app',
      script: './scripts/start-next-with-env-log.js',
      args: 'start -p 3000',
      cwd: __dirname,
      exec_mode: 'fork',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      autorestart: true,
      max_restarts: 3,
      min_uptime: '10s',
    },
  ],
};
