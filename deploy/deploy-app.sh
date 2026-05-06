#!/bin/bash
# ============================================
# Lakhlifi Gym v9.0 — App Deployment
# Run as ubuntu user from /opt/lakhlifi-gym
# ============================================
set -euo pipefail

APP_DIR="/opt/lakhlifi-gym"
cd "$APP_DIR"

echo "🚀 Deploying Lakhlifi Gym v9.0..."

# Install server dependencies
echo "📦 Installing server dependencies..."
cd "$APP_DIR/server"
npm install --production

# Install client dependencies and build
echo "📦 Building frontend..."
cd "$APP_DIR/client"
npm install
npm run build

# Run database migrations
echo "🗄️ Running migrations..."
cd "$APP_DIR/server"
node src/db/migrate.js

# Setup Nginx
echo "🌐 Configuring Nginx..."
sudo cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/lakhlifi-gym
sudo ln -sf /etc/nginx/sites-available/lakhlifi-gym /etc/nginx/sites-enabled/lakhlifi-gym
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Start with PM2
echo "⚡ Starting application with PM2..."
cd "$APP_DIR/server"
pm2 delete lakhlifi-gym 2>/dev/null || true
pm2 start server.js --name lakhlifi-gym --env production
pm2 save

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅ Deployment complete!                  ║"
echo "║  🌐 App is live on port 80               ║"
echo "╚══════════════════════════════════════════╝"
