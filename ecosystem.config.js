module.exports = {
  apps: [
    {
      name: "roadmap-app",
      script: "./node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      exec_mode: "fork",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: "3000"
      }
    }
  ]
};