# Pokemon API Service

A custom Pokemon API service that mimics the official Pokemon API, designed for test automation demonstrations and CI/CD integration.

## 🚀 Quick Start

### Docker (Recommended)
```bash
# Pull and run the latest image
docker pull quavaghar2/pokemon-api-service:latest
docker run -d -p 20275:20275 --name pokemon-api quavaghar2/pokemon-api-service:latest

# Check health
curl http://localhost:20275/health
```

### Local Development
```bash
npm install
npm run scrape:pokemon  # Initial data setup
npm run dev
```

## 🏗️ Architecture

This service can be deployed in multiple environments:
- **🐳 Docker Container** (Production-ready with health checks)
- **☁️ Mikr.us VPS** (Custom hosting)
- **🔧 Local Development** (Hot reload)
- **🤖 CI/CD Service Container** (GitHub Actions integration)

### Core Features:
- 📊 **Pokemon Data**: 151 Generation 1 Pokemon with complete data
- 🖼️ **Static Assets**: Pokemon sprites and artwork
- 🔄 **Data Scraping**: Automated data collection from official API
- 🏥 **Health Checks**: Robust monitoring and status endpoints
- 🧪 **Test Integration**: Vitest test suite with professional practices

## Features

- 🎯 **Pokemon API Endpoints**: `/api/v2/pokemon`, `/api/v2/type`, `/api/v2/pokemon-species`, etc.
- 🖼️ **Static Image Serving**: Pokemon sprites and artwork
- 📊 **Data Management**: Scrape and store Pokemon data locally
- 🔄 **Hot Reload**: Reload data without restarting the service
- 📈 **Statistics**: Service stats and health checks

## 🐳 Docker Deployment

### Production Deployment
```bash
# Pull the latest image from DockerHub
docker pull quavaghar2/pokemon-api-service:latest

# Run with proper port mapping
docker run -d \
  --name pokemon-api-service \
  -p 20275:20275 \
  -e NODE_ENV=production \
  quavaghar2/pokemon-api-service:latest

# Verify deployment
curl http://localhost:20275/health
```

### Health Check Configuration
The Docker image includes robust health checks:
- **Grace Period**: 5 minutes for data loading
- **Check Interval**: Every 30 seconds
- **Timeout**: 10 seconds per check
- **Retries**: 10 attempts before marking unhealthy
- **Total Startup Time**: Up to 10 minutes

### CI/CD Integration
This service is designed for GitHub Actions service containers:

```yaml
services:
  pokemon-api-service:
    image: quavaghar2/pokemon-api-service:latest
    ports:
      - 20275:20275
    options: >-
      --health-cmd "curl -f http://localhost:20275/health || exit 1"
      --health-interval 30s
      --health-timeout 10s
      --health-retries 10
      --health-start-period 300s
```

## 🔧 Local Development Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Scrape Pokemon Data**:
   ```bash
   npm run scrape:pokemon
   ```

4. **Start the Service**:
   ```bash
   # Development (with hot reload)
   npm run dev
   
   # Production build
   npm run build
   npm start
   ```

## API Endpoints

### Pokemon
- `GET /api/v2/pokemon` - List all Pokemon (paginated)
- `GET /api/v2/pokemon/:id` - Get Pokemon by ID or name
- `GET /api/v2/pokemon-species/:id` - Get Pokemon species data
- `GET /api/v2/search/pokemon?q=pikachu` - Search Pokemon by name

### Types
- `GET /api/v2/type` - List all types
- `GET /api/v2/type/:id` - Get type by ID or name

### Evolution
- `GET /api/v2/evolution-chain/:id` - Get evolution chain by ID

### Utility
- `GET /health` - Health check
- `GET /api/v2/stats` - Service statistics
- `POST /api/v2/reload` - Reload data from files

### Images
- `GET /images/pokemon/sprites/:id.png` - Pokemon sprites
- `GET /images/pokemon/artwork/:id-artwork.png` - Pokemon artwork

## ☁️ Deployment to Mikr.us VPS

### Traditional VPS Deployment
```bash
# 1. Upload files to your Mikr.us VPS
scp -r . user@srv36.mikr.us:/path/to/pokemon-api-service

# 2. SSH into VPS and setup
ssh user@srv36.mikr.us
cd /path/to/pokemon-api-service

# 3. Install dependencies and build
npm install
npm run build
npm run scrape:pokemon

# 4. Start with PM2 (recommended)
npm install -g pm2
pm2 start npm --name "pokemon-api" -- start
pm2 save
pm2 startup
```

## 🧪 Testing

### Run Test Suite
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Categories
- **Unit Tests**: Core business logic and data processing
- **Integration Tests**: API endpoints and data flow
- **Service Tests**: Pokemon data service functionality
- **Error Handling**: Validation and edge cases

## 🌍 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `20275` | Server port (Docker optimized) |
| `HOST` | `0.0.0.0` | Server host (container-friendly) |
| `NODE_ENV` | `development` | Environment mode |
| `POKEMON_LIMIT` | `151` | Number of Pokemon to scrape (Gen 1) |
| `ALLOWED_ORIGINS` | `*` | CORS allowed origins (comma-separated) |

### Production Environment
```bash
# Docker environment variables
docker run -d \
  -e NODE_ENV=production \
  -e PORT=20275 \
  -e ALLOWED_ORIGINS="https://pokedex-87cl.vercel.app" \
  -p 20275:20275 \
  quavaghar2/pokemon-api-service:latest
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Health Check Failures
```bash
# Check if service is running
curl http://localhost:20275/health

# Expected response:
# {"status":"ok","service":"Pokemon API Service","timestamp":"..."}
```

**Solution**: Health checks require 4-5 minutes for data loading. Ensure:
- Container has sufficient memory (>512MB)
- Health check timeout is set to 300s+ start period
- All data files are present in `/app/data/`

#### 2. Port Binding Issues
```bash
# Check if port is in use
netstat -tulpn | grep 20275

# Kill existing process
pkill -f "node.*pokemon"
```

#### 3. Missing Data Files
```bash
# Verify data files exist
ls -la data/
# Should contain: pokemon.json, species.json, evolution-chains.json, types.json, suggestions.json

# Re-scrape if missing
npm run scrape:pokemon
```

#### 4. Docker Build Issues
```bash
# Check Docker logs
docker logs pokemon-api-service

# Common issues:
# - Missing devDependencies during build
# - Incorrect file permissions
# - Network connectivity for npm install
```

### Performance Optimization

#### Memory Usage
- **Minimum**: 256MB RAM
- **Recommended**: 512MB RAM
- **Optimal**: 1GB RAM (for faster startup)

#### Startup Time
- **Local Development**: ~30 seconds
- **Docker Container**: ~4-5 minutes (data loading)
- **CI/CD Environment**: ~3-4 minutes

### Monitoring

```bash
# Check service status
curl http://localhost:20275/api/v2/stats

# Monitor Docker container
docker stats pokemon-api-service

# View logs
docker logs -f pokemon-api-service
```

## Data Structure

```
data/
├── pokemon.json          # Pokemon data
├── species.json          # Species data
├── types.json            # Type data
└── evolution-chains.json # Evolution chains

images/
├── pokemon/
│   ├── sprites/          # Pokemon sprites
│   └── artwork/          # Pokemon artwork
└── types/                # Type icons
```

## Usage with Frontend

Your Vercel-hosted frontend should call this API instead of the official Pokemon API:

```javascript
// Instead of: https://pokeapi.co/api/v2/pokemon/pikachu
// Use: https://your-mikrus-domain.com/api/v2/pokemon/pikachu
```

Set the `CUSTOM_POKEMON_API_URL` environment variable in your Vercel deployment to point to your Mikr.us service.
