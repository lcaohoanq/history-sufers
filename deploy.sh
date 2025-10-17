#!/bin/bash

# History Sufers - Deployment Script for Self-Hosted Server
# This script pulls the latest Docker image and restarts the container

set -e

# Configuration
DOCKER_USERNAME="${DOCKER_USERNAME:-lcaohoanq}"
IMAGE_NAME="${IMAGE_NAME:-boxy-run}"
VERSION="${VERSION:-latest}"
CONTAINER_NAME="${CONTAINER_NAME:-boxy-run-server}"
PORT="${PORT:-3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  History Sufers - Deployment Script${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Warning: Docker Compose is not installed. Using docker commands instead.${NC}"
    USE_COMPOSE=false
else
    USE_COMPOSE=true
fi

# Function to deploy using Docker Compose
deploy_with_compose() {
    echo -e "${GREEN}Deploying with Docker Compose...${NC}"
    
    # Pull latest image
    echo -e "${YELLOW}Pulling latest Docker image...${NC}"
    docker-compose pull
    
    # Stop and remove old containers
    echo -e "${YELLOW}Stopping existing containers...${NC}"
    docker-compose down
    
    # Start new containers
    echo -e "${YELLOW}Starting new containers...${NC}"
    docker-compose up -d
    
    # Show logs
    echo -e "${GREEN}Deployment complete! Showing logs...${NC}"
    docker-compose logs -f --tail=50
}

# Function to deploy using Docker commands
deploy_with_docker() {
    echo -e "${GREEN}Deploying with Docker commands...${NC}"
    
    FULL_IMAGE="${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}"
    
    # Pull latest image
    echo -e "${YELLOW}Pulling latest Docker image: ${FULL_IMAGE}${NC}"
    docker pull "${FULL_IMAGE}"
    
    # Stop and remove old container if exists
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo -e "${YELLOW}Stopping and removing existing container...${NC}"
        docker stop "${CONTAINER_NAME}" || true
        docker rm "${CONTAINER_NAME}" || true
    fi
    
    # Run new container
    echo -e "${YELLOW}Starting new container...${NC}"
    docker run -d \
        --name "${CONTAINER_NAME}" \
        --restart unless-stopped \
        -p "${PORT}:3000" \
        -e NODE_ENV=production \
        -e MAX_PLAYERS=50 \
        -e ENABLE_ROOM_BROWSER=true \
        "${FULL_IMAGE}"
    
    # Wait for container to be healthy
    echo -e "${YELLOW}Waiting for container to be healthy...${NC}"
    sleep 5
    
    # Show container status
    docker ps -f name="${CONTAINER_NAME}"
    
    # Show logs
    echo -e "${GREEN}Deployment complete! Showing logs...${NC}"
    docker logs -f --tail=50 "${CONTAINER_NAME}"
}

# Function to rollback to previous version
rollback() {
    echo -e "${YELLOW}Rolling back to previous version...${NC}"
    
    if [ "$USE_COMPOSE" = true ]; then
        docker-compose down
        VERSION=previous docker-compose up -d
    else
        docker stop "${CONTAINER_NAME}" || true
        docker rm "${CONTAINER_NAME}" || true
        docker run -d \
            --name "${CONTAINER_NAME}" \
            --restart unless-stopped \
            -p "${PORT}:3000" \
            -e NODE_ENV=production \
            "${DOCKER_USERNAME}/${IMAGE_NAME}:previous"
    fi
    
    echo -e "${GREEN}Rollback complete!${NC}"
}

# Function to check health
check_health() {
    echo -e "${YELLOW}Checking application health...${NC}"
    
    max_retries=10
    retry=0
    
    while [ $retry -lt $max_retries ]; do
        if curl -f http://localhost:${PORT}/health &> /dev/null; then
            echo -e "${GREEN}✓ Application is healthy!${NC}"
            return 0
        fi
        
        retry=$((retry + 1))
        echo -e "${YELLOW}Health check attempt $retry/$max_retries...${NC}"
        sleep 3
    done
    
    echo -e "${RED}✗ Health check failed after $max_retries attempts${NC}"
    return 1
}

# Main deployment
main() {
    # Parse arguments
    case "$1" in
        rollback)
            rollback
            ;;
        health)
            check_health
            ;;
        logs)
            if [ "$USE_COMPOSE" = true ]; then
                docker-compose logs -f
            else
                docker logs -f "${CONTAINER_NAME}"
            fi
            ;;
        stop)
            if [ "$USE_COMPOSE" = true ]; then
                docker-compose down
            else
                docker stop "${CONTAINER_NAME}"
            fi
            echo -e "${GREEN}Stopped!${NC}"
            ;;
        restart)
            if [ "$USE_COMPOSE" = true ]; then
                docker-compose restart
            else
                docker restart "${CONTAINER_NAME}"
            fi
            echo -e "${GREEN}Restarted!${NC}"
            ;;
        *)
            # Default: Deploy
            if [ "$USE_COMPOSE" = true ]; then
                deploy_with_compose
            else
                deploy_with_docker
            fi
            
            # Check health after deployment
            sleep 5
            if check_health; then
                echo -e "${GREEN}======================================${NC}"
                echo -e "${GREEN}  Deployment Successful!${NC}"
                echo -e "${GREEN}  Access: http://localhost:${PORT}${NC}"
                echo -e "${GREEN}======================================${NC}"
            else
                echo -e "${RED}Deployment failed health check. Rolling back...${NC}"
                rollback
                exit 1
            fi
            ;;
    esac
}

# Run main function
main "$@"
