module.exports = {
  apps: [
    {
      name: "bus-ticket",
      script: "npm",
      args: "start",
      cwd: "/root/ticket-booking",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/log/bus-ticket/err.log",
      out_file: "/var/log/bus-ticket/out.log",
      log_file: "/var/log/bus-ticket/combined.log",
      time: true,
      max_memory_restart: "1G",
      restart_delay: 4000,
      watch: false,
      ignore_watch: ["node_modules", ".next", "logs"],
    },
  ],
};
