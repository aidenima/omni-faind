#!/bin/bash

set -e  # Exit on error

echo "🚀 Starting deployment for OmniFAIND..."

# Navigate to project directory
cd /var/www/omnifaind || exit 1

# Use Node.js version (adjust version as needed)
if command -v nvm &> /dev/null; then
    nvm use v20 || nvm use v18 || nvm use node
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npx prisma generate

# Run database migrations (optional - uncomment if needed)
# echo "🔄 Running database migrations..."
# npx prisma migrate deploy

# Build Next.js application
echo "🔨 Building Next.js application..."
npm run build

# Stop existing PM2 process
echo "🛑 Stopping existing PM2 process..."
pm2 delete omnifaind 2>/dev/null || true

# Start application with PM2
echo "▶️  Starting application with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Show PM2 status
echo "📊 PM2 Status:"
pm2 status

echo "✅ Deployment completed successfully!"
echo "📝 Check logs with: pm2 logs omnifaind"

