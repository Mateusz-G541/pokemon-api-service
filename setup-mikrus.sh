#!/bin/bash

# Pokemon API Service - Mikr.us Setup Script
# Run this script on your Mikr.us VPS after uploading the files

echo "🚀 Setting up Pokemon API Service on Mikr.us..."

# Update system
echo "📦 Updating system packages..."
sudo apt update

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Install dependencies
echo "📦 Installing project dependencies..."
npm install

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "⚙️ Creating environment file..."
    cp .env.example .env
    echo "📝 Please edit .env file with your configuration:"
    echo "   - Set your domain in ALLOWED_ORIGINS"
    echo "   - Adjust PORT if needed (default: 3001)"
fi

# Build the project
echo "🔨 Building the project..."
npm run build

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2 process manager..."
    sudo npm install -g pm2
fi

# Check if data exists, if not run scraper
if [ ! -f "data/pokemon.json" ]; then
    echo "📊 No Pokemon data found. Running scraper..."
    echo "⚠️  This will take a few minutes..."
    npm run scrape:pokemon
else
    echo "✅ Pokemon data already exists"
fi

# Start the service with PM2
echo "🚀 Starting Pokemon API service..."
pm2 delete pokemon-api 2>/dev/null || true  # Delete if exists
pm2 start dist/index.js --name "pokemon-api"

# Save PM2 configuration
pm2 save

# Setup PM2 startup
echo "⚙️ Setting up PM2 to start on boot..."
pm2 startup

echo ""
echo "🎉 Setup completed!"
echo ""
echo "📊 Service Status:"
pm2 status

echo ""
echo "🔗 Test your API:"
echo "   Health check: curl http://localhost:3001/health"
echo "   Get Pikachu:  curl http://localhost:3001/api/v2/pokemon/25"
echo ""
echo "📝 Next steps:"
echo "   1. Test the API endpoints"
echo "   2. Configure Nginx (optional, see deploy.md)"
echo "   3. Update your Vercel app's CUSTOM_POKEMON_API_URL"
echo ""
echo "📋 Useful commands:"
echo "   pm2 status          - Check service status"
echo "   pm2 logs pokemon-api - View logs"
echo "   pm2 restart pokemon-api - Restart service"
echo "   pm2 monit           - Monitor resources"
