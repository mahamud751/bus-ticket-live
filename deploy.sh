#!/bin/bash

# 🚀 Bus Ticket App Deployment Script
# Run this script on your VPS to deploy updates

set -e

echo "🚀 Starting deployment of Bus Ticket App..."

# Configuration
APP_DIR="/var/www/bus-ticket"
BACKUP_DIR="/var/backups/bus-ticket"
LOG_FILE="/var/log/deployment.log"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to create backup
create_backup() {
    log "📦 Creating backup..."
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    cp -r "$APP_DIR" "$BACKUP_DIR/$BACKUP_NAME"
    log "✅ Backup created: $BACKUP_DIR/$BACKUP_NAME"
}

# Function to rollback
rollback() {
    log "🔄 Rolling back to previous version..."
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -n1)
    if [ -n "$LATEST_BACKUP" ]; then
        rm -rf "$APP_DIR"
        cp -r "$BACKUP_DIR/$LATEST_BACKUP" "$APP_DIR"
        chown -R www-data:www-data "$APP_DIR"
        pm2 restart bus-ticket
        log "✅ Rollback completed"
    else
        log "❌ No backup found for rollback"
        exit 1
    fi
}

# Trap to rollback on error
trap 'log "❌ Deployment failed! Rolling back..."; rollback' ERR

# Start deployment
log "🚀 Starting deployment process..."

# Create backup before deployment
create_backup

# Navigate to app directory
cd "$APP_DIR"

# Pull latest changes from git
log "📥 Pulling latest changes..."
git fetch origin
git reset --hard origin/main

# Install/update dependencies
log "📦 Installing dependencies..."
npm ci --only=production

# Generate Prisma client
log "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
log "🗄️ Running database migrations..."
npx prisma migrate deploy

# Build the application
log "🔨 Building application..."
npm run build

# Set proper permissions
log "🔐 Setting file permissions..."
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"

# Restart the application
log "🔄 Restarting application..."
pm2 restart bus-ticket

# Wait for app to start
log "⏳ Waiting for application to start..."
sleep 10

# Health check
log "🏥 Performing health check..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    log "✅ Health check passed"
else
    log "❌ Health check failed"
    rollback
    exit 1
fi

# Reload Nginx (in case of config changes)
log "🔄 Reloading Nginx..."
nginx -t && systemctl reload nginx

# Clean up old backups (keep last 5)
log "🧹 Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t | tail -n +6 | xargs -r rm -rf

# Success message
log "🎉 Deployment completed successfully!"
log "🌐 Your animated bus booking website is now live!"

echo ""
echo "✅ Deployment Summary:"
echo "   📁 App Directory: $APP_DIR"
echo "   📦 Backup Created: $BACKUP_DIR/backup-$(date +%Y%m%d-*)"
echo "   📊 PM2 Status: $(pm2 list | grep bus-ticket)"
echo "   🌐 Application URL: http://$(curl -s ifconfig.me)"
echo ""
echo "🔍 Useful commands:"
echo "   pm2 logs bus-ticket    # View application logs"
echo "   pm2 status             # Check PM2 status"
echo "   nginx -t               # Test Nginx configuration"
echo "   systemctl status nginx # Check Nginx status"
echo ""