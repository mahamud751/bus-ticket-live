# Automated Cron Jobs Setup

This document explains how to set up automated cron jobs for the bus ticketing system.

## Prerequisites

1. Ensure the scripts run correctly manually:

   ```bash
   # Daily ticket seeding
   npm run db:seed:tickets:daily
   
   # Automatic schedule creation (run every day at 3:00 AM)
   npm run db:schedules:auto
   ```

2. Make sure the database is accessible from the cron environment.

## Setting up the Cron Jobs

### Option 1: Using crontab (Linux/macOS)

1. Open your crontab:

   ```bash
   crontab -e
   ```

2. Add the following lines to run the scripts:

   ```bash
   # Daily ticket seeding at 2:00 AM
   0 2 * * * cd /path/to/your/project && /usr/bin/npm run db:seed:tickets:daily >> /var/log/daily-ticket-seed.log 2>&1
   
   # Automatic schedule creation at 3:00 AM
   0 3 * * * cd /path/to/your/project && /usr/bin/npm run db:schedules:auto >> /var/log/auto-schedule-creation.log 2>&1
   ```

   Replace `/path/to/your/project` with the actual path to your project directory.

### Option 2: Using systemd timer (Linux)

1. Create service files for both scripts:

   ```bash
   # Daily ticket seeding service
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

5. Create service file for automatic schedule creation:

   ```bash
   sudo nano /etc/systemd/system/auto-schedule-creation.service
   ```

6. Add the following content:

   ```ini
   [Unit]
   Description=Automatic Schedule Creation
   After=network.target

   [Service]
   Type=oneshot
   User=your-username
   WorkingDirectory=/path/to/your/project
   ExecStart=/usr/bin/npm run db:schedules:auto
   Environment=NODE_ENV=production
   ```

7. Create a timer file:

   ```bash
   sudo nano /etc/systemd/system/auto-schedule-creation.timer
   ```

8. Add the following content:

   ```ini
   [Unit]
   Description=Run automatic schedule creation
   Requires=auto-schedule-creation.service

   [Timer]
   OnCalendar=daily
   Persistent=true

   [Install]
   WantedBy=timers.target
   ```

9. Enable and start both timers:
   ```bash
   sudo systemctl enable daily-ticket-seed.timer
   sudo systemctl start daily-ticket-seed.timer
   sudo systemctl enable auto-schedule-creation.timer
   sudo systemctl start auto-schedule-creation.timer
   ```

### Option 3: Using PM2 (Cross-platform)

1. Install PM2 globally if not already installed:

   ```bash
   npm install -g pm2
   ```

2. Create a PM2 configuration file `ecosystem.cron-jobs.config.js`:

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
       {
         name: "auto-schedule-creation",
         script: "npm",
         args: "run db:schedules:auto",
         cwd: "/path/to/your/project",
         cron_restart: "0 3 * * *", // Run daily at 3:00 AM
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
   pm2 start ecosystem.cron-jobs.config.js
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
