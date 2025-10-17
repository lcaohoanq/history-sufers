# 🐳 Docker Deployment Guide

This guide explains how to deploy History Sufers Multiplayer Server using Docker and Docker Compose.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [GitHub Actions CI/CD](#github-actions-cicd)
- [Self-Hosted Deployment](#self-hosted-deployment)
- [Environment Variables](#environment-variables)
- [Monitoring & Maintenance](#monitoring--maintenance)

## Prerequisites

### On Your Development Machine

- Docker (v20.10+)
- Docker Compose (v2.0+)
- Git
- GitHub account (for CI/CD)

### On Your Self-Hosted Server

- Docker (v20.10+)
- Docker Compose (v2.0+) (optional but recommended)
- Linux server (Ubuntu 20.04+ recommended)
- Open ports: 3000 (or your custom port)
- Minimum 512MB RAM, 1 CPU core

## Quick Start

### 1. Local Development with Docker

Build and run locally:

```bash
# Clone the repository
git clone https://github.com/lcaohoanq/historical-run.git
cd historical-run

# Copy environment file
cp .env.example .env

# Edit .env if needed
nano .env

# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Access the game
open http://localhost:3000
```

### 2. Using Pre-Built Image from Docker Hub

```bash
# Pull the latest image
docker pull lcaohoanq/boxy-run:latest

# Run the container
docker run -d \
  --name boxy-run-server \
  --restart unless-stopped \
  -p 3000:3000 \
  -e MAX_PLAYERS=50 \
  -e ENABLE_ROOM_BROWSER=true \
  lcaohoanq/boxy-run:latest

# Check status
docker ps
docker logs boxy-run-server
```

## GitHub Actions CI/CD

### Setup Docker Hub Credentials

1. Go to [Docker Hub](https://hub.docker.com/)
2. Create an account or login
3. Go to **Account Settings → Security → New Access Token**
4. Create a token with Read & Write permissions
5. Go to your GitHub repository → **Settings → Secrets and variables → Actions**
6. Add two secrets:
   - `DOCKER_USERNAME`: Your Docker Hub username
   - `DOCKER_PASSWORD`: Your Docker Hub access token

### Automatic Builds

The workflow (`.github/workflows/docker-build-push.yml`) automatically:

- **On Push to `main`**: Builds and pushes image with `latest` tag
- **On Tag Push** (`v*`): Builds and pushes versioned image + creates GitHub release
- **On Pull Request**: Builds image (doesn't push)

#### Trigger a Build

```bash
# Push to main branch
git add .
git commit -m "Update application"
git push origin main

# Or create a release tag
git tag v1.0.0
git push origin v1.0.0
```

#### View Build Status

- Go to your GitHub repository → **Actions** tab
- Click on the latest workflow run
- View build logs and artifacts

## Self-Hosted Deployment

### Initial Setup

1. **SSH into your server**:

```bash
ssh user@your-server-ip
```

2. **Install Docker** (if not already installed):

```bash
# Update packages
sudo apt-get update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

3. **Clone the repository** (or just copy deployment files):

```bash
# Option A: Clone full repository
git clone https://github.com/lcaohoanq/historical-run.git
cd historical-run

# Option B: Create deployment directory with just docker-compose.yml
mkdir boxy-run && cd boxy-run
wget https://raw.githubusercontent.com/lcaohoanq/historical-run/main/docker-compose.yml
wget https://raw.githubusercontent.com/lcaohoanq/historical-run/main/.env.example
wget https://raw.githubusercontent.com/lcaohoanq/historical-run/main/deploy.sh
chmod +x deploy.sh
```

4. **Configure environment**:

```bash
cp .env.example .env
nano .env
```

Edit these variables:

```env
DOCKER_USERNAME=lcaohoanq
VERSION=latest
PORT=3000
MAX_PLAYERS=50
ENABLE_ROOM_BROWSER=true
```

### Deploy with Script

The `deploy.sh` script automates deployment:

```bash
# Deploy latest version
./deploy.sh

# View logs
./deploy.sh logs

# Check health
./deploy.sh health

# Restart
./deploy.sh restart

# Stop
./deploy.sh stop

# Rollback to previous version
./deploy.sh rollback
```

### Manual Deployment

```bash
# Pull latest image
docker-compose pull

# Stop old containers
docker-compose down

# Start new containers
docker-compose up -d

# View logs
docker-compose logs -f
```

### Update Deployment

```bash
# Pull latest changes
git pull origin main

# Or manually update docker-compose.yml version
nano docker-compose.yml
# Change: image: lcaohoanq/boxy-run:v1.0.0

# Restart with new version
./deploy.sh
```

## Environment Variables

| Variable                | Default      | Description           |
| ----------------------- | ------------ | --------------------- |
| `NODE_ENV`              | `production` | Node environment      |
| `PORT`                  | `3000`       | Server port           |
| `MAX_PLAYERS`           | `50`         | Max players per room  |
| `ENABLE_ROOM_BROWSER`   | `true`       | Enable room browsing  |
| `ROOM_CLEANUP_INTERVAL` | `300000`     | Cleanup interval (ms) |
| `DOCKER_USERNAME`       | `lcaohoanq`  | Docker Hub username   |
| `VERSION`               | `latest`     | Image version tag     |

### Setting in Docker Compose

Edit `docker-compose.yml`:

```yaml
environment:
  - MAX_PLAYERS=100
  - PORT=8080
```

### Setting in Docker Run

```bash
docker run -e MAX_PLAYERS=100 -e PORT=8080 lcaohoanq/boxy-run:latest
```

## Monitoring & Maintenance

### View Logs

```bash
# Real-time logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service logs
docker logs boxy-run-server
```

### Check Container Status

```bash
# List running containers
docker ps

# Container stats (CPU, Memory)
docker stats boxy-run-server

# Container health
docker inspect boxy-run-server | grep Health -A 10
```

### Health Check Endpoint

```bash
# Check application health
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "ok",
#   "uptime": 12345,
#   "timestamp": "2025-10-17T...",
#   "rooms": 3,
#   "activePlayers": 15,
#   "maxPlayersPerRoom": 50
# }
```

### Backup & Restore

```bash
# Export container
docker export boxy-run-server > boxy-run-backup.tar

# Save image
docker save lcaohoanq/boxy-run:latest > boxy-run-image.tar

# Load image on another server
docker load < boxy-run-image.tar
```

### Clean Up

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove all unused resources
docker system prune -a --volumes
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs boxy-run-server

# Check if port is in use
sudo lsof -i :3000

# Restart container
docker restart boxy-run-server
```

### High Memory Usage

```bash
# Check container stats
docker stats boxy-run-server

# Adjust memory limits in docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 1G
```

### Network Issues

```bash
# Check container network
docker network inspect boxy-run-network

# Restart networking
docker-compose down
docker-compose up -d
```

### Cannot Access from External

```bash
# Check firewall
sudo ufw status
sudo ufw allow 3000/tcp

# Check if container is listening
docker exec boxy-run-server netstat -tlnp
```

## Advanced Configuration

### NGINX Reverse Proxy

```nginx
server {
    listen 80;
    server_name boxy-run.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### SSL with Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d boxy-run.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Multi-Instance Deployment

```yaml
# docker-compose.yml
version: "3.8"
services:
  boxy-run-1:
    image: lcaohoanq/boxy-run:latest
    ports:
      - "3001:3000"

  boxy-run-2:
    image: lcaohoanq/boxy-run:latest
    ports:
      - "3002:3000"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    # Configure load balancing
```

## Support

- **Issues**: [GitHub Issues](https://github.com/lcaohoanq/historical-run/issues)
- **Discussions**: [GitHub Discussions](https://github.com/lcaohoanq/historical-run/discussions)
- **Docker Hub**: [lcaohoanq/boxy-run](https://hub.docker.com/r/lcaohoanq/boxy-run)

## License

MIT License - see [LICENSE](LICENSE) file for details.
