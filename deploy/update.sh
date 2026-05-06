#!/bin/bash
# ============================================
# Lakhlifi Gym — Quick Update Script
# ============================================
set -e

cd ~/lakhlifi_gym

echo "📥 Pulling latest code from GitHub..."
git pull origin main

echo "⚙️ Updating Backend..."
cd server
npm install
# Restart or start the PM2 process
pm2 restart gym-api || pm2 start server.js --name "gym-api"

echo "🎨 Updating Frontend..."
cd ../client
npm install
npm run build

echo "✅ UPDATE COMPLETE! Visit http://84.8.220.57"
