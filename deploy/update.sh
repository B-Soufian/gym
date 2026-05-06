#!/bin/bash
# ============================================
# tamesna Gym — Quick Update Script
# ============================================
set -e

cd /opt/tamesna-gym

echo "📥 Pulling latest code from GitHub..."
git pull origin main

echo "⚙️ Updating Backend..."
cd server
npm install --production
# Restart or start the PM2 process
pm2 restart tamesna-gym || pm2 start server.js --name "tamesna-gym"

echo "🎨 Updating Frontend..."
cd ../client
npm install
npm run build

echo "✅ UPDATE COMPLETE! Visit http://84.8.219.220"
