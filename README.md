# Pokemon API Service

A custom Pokemon API service that mimics the official Pokemon API, designed for test automation demonstrations.

## Architecture

This service is designed to be deployed on **Mikr.us VPS** and serves as a custom Pokemon API that:
- Stores Pokemon data locally (JSON files + images)
- Provides the same endpoints as the official Pokemon API
- Serves Pokemon images statically
- Includes data scraping capabilities

## Features

- 🎯 **Pokemon API Endpoints**: `/api/v2/pokemon`, `/api/v2/type`, `/api/v2/pokemon-species`, etc.
- 🖼️ **Static Image Serving**: Pokemon sprites and artwork
- 📊 **Data Management**: Scrape and store Pokemon data locally
- 🔄 **Hot Reload**: Reload data without restarting the service
- 📈 **Statistics**: Service stats and health checks

## Setup

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
   # Development
   npm run dev
   
   # Production
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

## Deployment to Mikr.us

1. **Upload files** to your Mikr.us VPS
2. **Install Node.js** and npm
3. **Install dependencies**: `npm install`
4. **Build the project**: `npm run build`
5. **Scrape data**: `npm run scrape:pokemon`
6. **Start the service**: `npm start`

## Environment Variables

- `PORT` - Server port (default: 3001)
- `HOST` - Server host (default: 0.0.0.0)
- `POKEMON_LIMIT` - Number of Pokemon to scrape (default: 151)
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)

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
