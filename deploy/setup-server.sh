#!/bin/bash
# ============================================
# tamesna Gym v9.0 — OCI Server Setup
# Run as: sudo bash setup-server.sh
# ============================================
set -euo pipefail

echo "╔══════════════════════════════════════════╗"
echo "║  🏋️  tamesna Gym — Server Setup         ║"
echo "╚══════════════════════════════════════════╝"

export DEBIAN_FRONTEND=noninteractive

# System Update
echo "📦 Updating system..."
apt-get update -qq && apt-get upgrade -y -qq

# Node.js 20 LTS
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y -qq nodejs

# PostgreSQL 14
echo "📦 Installing PostgreSQL..."
apt-get install -y -qq postgresql postgresql-contrib
systemctl enable postgresql && systemctl start postgresql

# Create DB
echo "🗄️ Setting up database..."
sudo -u postgres psql -c "CREATE USER gymvision_app WITH PASSWORD 'gymvision_secret_2025';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE gymvision OWNER gymvision_app;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gymvision TO gymvision_app;" 2>/dev/null || true

# Redis
echo "📦 Installing Redis..."
apt-get install -y -qq redis-server
systemctl enable redis-server && systemctl start redis-server

# Nginx
echo "📦 Installing Nginx..."
apt-get install -y -qq nginx
systemctl enable nginx

# Certbot
echo "📦 Installing Certbot..."
apt-get install -y -qq certbot python3-certbot-nginx

# Firewall (OCI Ubuntu uses iptables)
echo "🔒 Opening ports 80, 443..."
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT 2>/dev/null || true
netfilter-persistent save 2>/dev/null || true

# PM2
echo "📦 Installing PM2..."
npm install -g pm2

# App directory
mkdir -p /opt/tamesna-gym
chown ubuntu:ubuntu /opt/tamesna-gym

echo "✅ Server setup complete!"
