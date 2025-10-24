module.exports = {
  apps: [
    {
      name: "roadmap",
      // Zeigen Sie direkt auf die ausführbare Next.js-Datei in node_modules
      script: "./node_modules/next/dist/bin/next",
      // Geben Sie 'start' als Argument an
      args: "start", 
      cwd: __dirname,
      exec_mode: "fork",
      // (Optional, aber explizit)
      // Sagt PM2, dass dies mit Node.js ausgeführt werden soll
      interpreter: "node" 
    }
  ]
};