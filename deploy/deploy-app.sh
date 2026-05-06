#!/bin/bash
# ============================================
# tamesna Gym v9.0 — App Deployment
# Run as ubuntu user from /opt/tamesna-gym
# ============================================
set -euo pipefail

APP_DIR="/opt/tamesna-gym"
cd "$APP_DIR"

echo "🚀 Deploying tamesna Gym v9.0..."

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
sudo cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/tamesna-gym
sudo ln -sf /etc/nginx/sites-available/tamesna-gym /etc/nginx/sites-enabled/tamesna-gym
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Start with PM2
echo "⚡ Starting application with PM2..."
cd "$APP_DIR/server"
pm2 delete tamesna-gym 2>/dev/null || true
pm2 start server.js --name tamesna-gym --env production
pm2 save

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅ Deployment complete!                  ║"
echo "║  🌐 App is live on port 80               ║"
echo "╚══════════════════════════════════════════╝"
