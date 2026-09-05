// PM2 process definitions for the anyprint droplet.
//
// nginx terminates TLS and proxies:
//   /      -> localhost:3000  (anyprint-web)
//   /api/  -> localhost:3001  (anyprint-api, prefix stripped by the trailing slash)
//
// Each app loads its own env file (api/.env via dotenv, web/.env.local at build
// time), so secrets stay out of this file and out of git.

const path = require("path");

const LOGS = path.join(__dirname, "logs");

module.exports = {
  apps: [
    {
      name: "anyprint-api",
      cwd: path.join(__dirname, "api"),
      script: "server.js",

      instances: 1,
      exec_mode: "fork",

      autorestart: true,
      max_restarts: 10,
      min_uptime: "20s",
      max_memory_restart: "400M",

      // PORT comes from api/.env (3001).
      env: { NODE_ENV: "production" },

      time: true,
      out_file: path.join(LOGS, "api-out.log"),
      error_file: path.join(LOGS, "api-err.log")
    },
    {
      // Call the next binary directly rather than going through `npm start`, so
      // pm2 signals reach the real process instead of an npm wrapper.
      name: "anyprint-web",
      cwd: path.join(__dirname, "web"),
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",

      instances: 1,
      exec_mode: "fork",

      autorestart: true,
      max_restarts: 10,
      min_uptime: "20s",
      max_memory_restart: "600M",

      env: { NODE_ENV: "production", PORT: "3000" },

      time: true,
      out_file: path.join(LOGS, "web-out.log"),
      error_file: path.join(LOGS, "web-err.log")
    }
  ]
};
