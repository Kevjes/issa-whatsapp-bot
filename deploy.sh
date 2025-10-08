#!/bin/bash

# ISSA Takaful Bot - Deployment Script for CentOS 7 VPS
# This script automates the deployment of the ISSA bot to the VPS

set -e

# Configuration
VPS_HOST="root@194.163.132.186"
VPS_PATH="/var/www/html/issa"
LOCAL_PATH="."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}ISSA Takaful Bot - Deployment${NC}"
echo -e "${GREEN}================================${NC}"

# Step 1: Build locally
echo -e "\n${YELLOW}Step 1: Building application locally...${NC}"
npm run build

# Step 2: Create deployment package
echo -e "\n${YELLOW}Step 2: Creating deployment package...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_DIR="deploy_${TIMESTAMP}"
mkdir -p ${DEPLOY_DIR}

# Copy necessary files
cp -r dist ${DEPLOY_DIR}/
cp package*.json ${DEPLOY_DIR}/
cp Dockerfile ${DEPLOY_DIR}/
cp docker-compose.yml ${DEPLOY_DIR}/
cp .dockerignore ${DEPLOY_DIR}/
cp .env.example ${DEPLOY_DIR}/

# Create archive
tar -czf ${DEPLOY_DIR}.tar.gz ${DEPLOY_DIR}
rm -rf ${DEPLOY_DIR}

echo -e "${GREEN}✓ Deployment package created: ${DEPLOY_DIR}.tar.gz${NC}"

# Step 3: Upload to VPS
echo -e "\n${YELLOW}Step 3: Uploading to VPS...${NC}"
scp ${DEPLOY_DIR}.tar.gz ${VPS_HOST}:${VPS_PATH}/

# Step 4: Deploy on VPS
echo -e "\n${YELLOW}Step 4: Deploying on VPS...${NC}"
ssh ${VPS_HOST} << ENDSSH
set -e

cd ${VPS_PATH}

# Extract new version
echo "Extracting deployment package..."
tar -xzf ${DEPLOY_DIR}.tar.gz

# Backup current version if exists
if [ -d "current" ]; then
    echo "Backing up current version..."
    mv current backup_\$(date +%Y%m%d_%H%M%S)
    # Keep only last 3 backups
    ls -dt backup_* | tail -n +4 | xargs rm -rf
fi

# Move new version to current
mv ${DEPLOY_DIR} current
cd current

# Check if .env exists, if not create from example
if [ ! -f "${VPS_PATH}/.env" ]; then
    echo "Creating .env file from example..."
    echo "⚠️  WARNING: Please configure your .env file with proper credentials!"
    cp .env.example ${VPS_PATH}/.env
fi

# Link .env to current directory
ln -sf ${VPS_PATH}/.env .env

# Create data and logs directories if they don't exist
mkdir -p ${VPS_PATH}/data ${VPS_PATH}/logs

# Link persistent data directories
ln -sf ${VPS_PATH}/data data
ln -sf ${VPS_PATH}/logs logs

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down || true

# Build and start new containers
echo "Building and starting new containers..."
docker-compose up -d --build

# Check container status
echo "Checking container status..."
sleep 5
docker-compose ps

# Show logs
echo "Recent logs:"
docker-compose logs --tail=50

echo "✓ Deployment completed successfully!"
echo "Container is running. Check logs with: docker-compose logs -f"

ENDSSH

# Step 5: Cleanup local files
echo -e "\n${YELLOW}Step 5: Cleaning up...${NC}"
rm ${DEPLOY_DIR}.tar.gz

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}Deployment completed!${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "\nTo view logs: ssh ${VPS_HOST} 'cd ${VPS_PATH}/current && docker-compose logs -f'"
echo -e "To restart: ssh ${VPS_HOST} 'cd ${VPS_PATH}/current && docker-compose restart'"
echo -e "To stop: ssh ${VPS_HOST} 'cd ${VPS_PATH}/current && docker-compose down'"
