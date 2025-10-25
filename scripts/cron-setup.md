# Daily Ticket Seeding Cron Job Setup

This document explains how to set up a cron job to run the daily ticket seeding script.

## Prerequisites

1. Ensure the script runs correctly manually:

   ```bash
   npm run db:seed:tickets:daily
   ```

2. Make sure the database is accessible from the cron environment.

## Setting up the Cron Job

### Option 1: Using crontab (Linux/macOS)

1. Open your crontab:

   ```bash
   crontab -e
   ```

2. Add the following line to run the script daily at 2:00 AM:

   ```bash
   0 2 * * * cd /path/to/your/project && /usr/bin/npm run db:seed:tickets:daily >> /var/log/daily-ticket-seed.log 2>&1
   ```

   Replace `/path/to/your/project` with the actual path to your project directory.

### Option 2: Using systemd timer (Linux)

1. Create a service file:

   ```bash
   sudo nano /etc/systemd/system/daily-ticket-seed.service
   ```

2. Add the following content:

   ```ini
   [Unit]
   Description=Daily Ticket Seeding
   After=network.target

   [Service]
   Type=oneshot
   User=your-username
   WorkingDirectory=/path/to/your/project
   ExecStart=/usr/bin/npm run db:seed:tickets:daily
   Environment=NODE_ENV=production
   ```

3. Create a timer file:

   ```bash
   sudo nano /etc/systemd/system/daily-ticket-seed.timer
   ```

4. Add the following content:

   ```ini
   [Unit]
   Description=Run daily ticket seeding
   Requires=daily-ticket-seed.service

   [Timer]
   OnCalendar=daily
   Persistent=true

   [Install]
   WantedBy=timers.target
   ```

5. Enable and start the timer:
   ```bash
   sudo systemctl enable daily-ticket-seed.timer
   sudo systemctl start daily-ticket-seed.timer
   ```

### Option 3: Using PM2 (Cross-platform)

1. Install PM2 globally if not already installed:

   ```bash
   npm install -g pm2
   ```

2. Create a PM2 configuration file `ecosystem.ticket-seed.config.js`:

   ```javascript
   module.exports = {
     apps: [
       {
         name: "daily-ticket-seed",
         script: "npm",
         args: "run db:seed:tickets:daily",
         cwd: "/path/to/your/project",
         cron_restart: "0 2 * * *", // Run daily at 2:00 AM
         max_memory_restart: "1G",
         env: {
           NODE_ENV: "production",
         },
       },
     ],
   };
   ```

3. Start the PM2 process:

   ```bash
   pm2 start ecosystem.ticket-seed.config.js
   ```

4. Save the PM2 configuration:
   ```bash
   pm2 save
   ```

## Monitoring and Logging

The script outputs logs to the console. When run via cron, these are redirected to a log file as shown in the examples above.

You can also implement more sophisticated logging by modifying the script to write to a specific log file or use a logging service.

## Troubleshooting

1. **Permission Issues**: Ensure the user running the cron job has the necessary permissions to execute the script and access the database.

2. **Environment Variables**: Make sure all required environment variables are available in the cron environment. You may need to source your environment file in the cron command.

3. **Path Issues**: Use absolute paths in your cron commands to avoid issues with the working directory.

4. **Database Connection**: Verify that the database is accessible from the environment where the cron job runs.
