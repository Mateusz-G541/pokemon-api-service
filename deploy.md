# Deployment Guide for Mikr.us

## Recommended: Docker Hub + Docker Compose (Production)

This project is deployed from a Docker image published by GitHub Actions to Docker Hub. The VPS only needs Docker + Compose to pull and run the image.

### Prerequisites
- Docker and Docker Compose (v2 plugin or legacy) installed on your VPS
- `.env.production` file on the VPS with production values

Example `.env.production`:
```env
PORT=3001
HOST=0.0.0.0
POKEMON_LIMIT=151
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
```

### Files used on VPS
- `docker-compose.prod.yml` (uses image: `mateuszg541/pokemon-api-service:latest` and maps host 20275 -> container 3001)
- `deploy.sh` helper script (pull + up + health check)

### One-time setup on VPS
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin || true
mkdir -p /opt/pokemon-api-service
cd /opt/pokemon-api-service
git clone https://github.com/Mateusz-G541/pokemon-api-service.git .
cp .env.example .env.production && nano .env.production  # update values
chmod +x deploy.sh
```

### Deploy/Update on VPS
```bash
cd /opt/pokemon-api-service
./deploy.sh deploy
```

This will:
- Detect compose command (v2/v1)
- Pull latest image from Docker Hub
- Start/update the container in background
- Wait until health endpoint is OK

### Verify
```bash
curl -f http://localhost:20275/health
curl -f http://srvXX.mikr.us:20275/health   # replace with your server
docker ps
docker logs --tail 100 pokemon-api
```

### CI/CD (GitHub Actions)
- Workflow: `.github/workflows/docker-build-push.yml`
- On push to `main/master`: builds multi-arch image and pushes to Docker Hub as `latest` (and extra tags)
- VPS only needs `./deploy.sh deploy` to pick up the new image

---

## Prerequisites
- Mikr.us VPS account and server access
- Node.js 18+ installed on your VPS
- SSH access to your server

## Step 1: Prepare Files for Upload

### Files to upload to Mikr.us:
```
pokemon-api-service/
├── package.json
├── tsconfig.json
├── .env (create from .env.example)
├── src/
├── scripts/
├── data/ (with scraped Pokemon data)
└── images/ (with Pokemon images)
```

## Step 2: Connect to Your Mikr.us VPS

```bash
ssh username@your-mikrus-server.mikr.us
```

## Step 3: Install Node.js (if not installed)

```bash
# Update system
sudo apt update

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

## Step 4: Upload Your Project

### Option A: Using SCP
```bash
# From your local machine
scp -r pokemon-api-service/ username@your-server.mikr.us:~/
```

### Option B: Using Git (recommended)
```bash
# On your VPS
git clone your-repo-url
cd pokemon-api-service
```

### Option C: Manual Upload
Use FileZilla or similar FTP client to upload the files.

## Step 5: Setup on VPS

```bash
# Navigate to project directory
cd ~/pokemon-api-service

# Install dependencies
npm install

# Create environment file
cp .env.example .env
nano .env  # Edit with your settings

# Build the project
npm run build

# Test the service
npm start
```

## Step 6: Configure Environment Variables

Edit `.env` file:
```bash
PORT=3001
HOST=0.0.0.0
POKEMON_LIMIT=151
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://pokedex-87cl.vercel.app
```

## Legacy: Setup Process Manager (PM2)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start your service with PM2
pm2 start dist/index.js --name "pokemon-api"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown
```

## Optional: Configure Nginx (Reverse Proxy + HTTPS)

```bash
# Install Nginx
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/pokemon-api
```

Add this configuration (proxy to the Docker-exposed port 20275):
```nginx
server {
    listen 80;
    server_name your-domain.mikr.us;

    location / {
        proxy_pass http://localhost:20275;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/pokemon-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Test Your Deployment

```bash
# If running via Docker/Compose (recommended)
curl http://localhost:20275/health

# Test externally
curl http://your-domain.mikr.us/health
curl http://your-domain.mikr.us/api/v2/pokemon/1
```

## Step 10: Monitor and Maintain

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs pokemon-api

# Restart service
pm2 restart pokemon-api

# Monitor resources
pm2 monit
```

## Troubleshooting

### Common Issues:

1. **Port not accessible**: Check Mikr.us firewall settings
2. **Permission denied**: Use `sudo` for system operations
3. **Out of memory**: Consider reducing POKEMON_LIMIT in .env
4. **Images not loading**: Check file permissions and paths

### Useful Commands:
```bash
# Check if service is running
netstat -tlnp | grep :3001

# Check disk space
df -h

# Check memory usage
free -h

# View system logs
sudo journalctl -u nginx
```

## Security Notes

- Change default ports if needed
- Use environment variables for sensitive data
- Keep your system updated: `sudo apt update && sudo apt upgrade`
- Consider setting up SSL with Let's Encrypt for HTTPS

## Next Steps

After deployment, update your Vercel environment variables:
- `CUSTOM_POKEMON_API_URL=https://your-domain.mikr.us/api/v2`
