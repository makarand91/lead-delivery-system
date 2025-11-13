#!/usr/bin/env bash

# Complete Local Development Setup Script
# This script sets up everything needed to run the app locally

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

printf "${BLUE}========================================${NC}\n"
printf "${BLUE}Lead Delivery System - Local Setup${NC}\n"
printf "${BLUE}========================================${NC}\n"
printf "\n"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
USE_DYNAMODB_LOCAL=${USE_DYNAMODB_LOCAL:-false}
USE_AWS=${USE_AWS:-true}

printf "${YELLOW}Setup Configuration:${NC}\n"
printf "  Project Root: ${PROJECT_ROOT}\n"
printf "  Use DynamoDB Local: ${USE_DYNAMODB_LOCAL}\n"
printf "  Use AWS: ${USE_AWS}\n"
printf "\n"

# Step 1: Check Prerequisites
printf "${GREEN}Step 1: Checking Prerequisites${NC}\n"
printf "\n"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    printf "${GREEN}✓ Node.js: ${NODE_VERSION}${NC}\n"
else
    printf "${RED}✗ Node.js not found${NC}\n"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    printf "${GREEN}✓ npm: ${NPM_VERSION}${NC}\n"
else
    printf "${RED}✗ npm not found${NC}\n"
    exit 1
fi

# Check AWS CLI (if using AWS)
if [ "$USE_AWS" = true ]; then
    if command -v aws &> /dev/null; then
        AWS_VERSION=$(aws --version 2>&1 | cut -d' ' -f1)
        printf "${GREEN}✓ AWS CLI: ${AWS_VERSION}${NC}\n"

        # Check AWS credentials
        if aws sts get-caller-identity &> /dev/null; then
            AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
            printf "${GREEN}✓ AWS Credentials: Account ${AWS_ACCOUNT}${NC}\n"
        else
            printf "${RED}✗ AWS credentials not configured${NC}\n"
            printf "${YELLOW}  Run: aws configure${NC}\n"
            exit 1
        fi
    else
        printf "${RED}✗ AWS CLI not found${NC}\n"
        printf "${YELLOW}  Install: https://aws.amazon.com/cli/${NC}\n"
        exit 1
    fi
fi

printf "\n"

# Step 2: Install Dependencies
printf "${GREEN}Step 2: Installing Dependencies${NC}\n"
printf "\n"

cd "$PROJECT_ROOT"

if [ ! -d "backend/node_modules" ]; then
    printf "${YELLOW}Installing backend dependencies...${NC}\n"
    cd backend && npm install && cd ..
    printf "${GREEN}✓ Backend dependencies installed${NC}\n"
else
    printf "${GREEN}✓ Backend dependencies already installed${NC}\n"
fi

if [ ! -d "frontend/node_modules" ]; then
    printf "${YELLOW}Installing frontend dependencies...${NC}\n"
    cd frontend && npm install && cd ..
    printf "${GREEN}✓ Frontend dependencies installed${NC}\n"
else
    printf "${GREEN}✓ Frontend dependencies already installed${NC}\n"
fi

printf "\n"

# Step 3: Setup Environment Files
printf "${GREEN}Step 3: Setting up Environment Files${NC}\n"
printf "\n"

# Backend .env
if [ ! -f "backend/.env" ]; then
    printf "${YELLOW}Creating backend/.env...${NC}\n"
    cp backend/.env.example backend/.env
    printf "${GREEN}✓ backend/.env created${NC}\n"
else
    printf "${GREEN}✓ backend/.env exists${NC}\n"
fi

# Frontend .env
if [ ! -f "frontend/.env" ]; then
    if [ -f "frontend/.env.example" ]; then
        printf "${YELLOW}Creating frontend/.env...${NC}\n"
        cp frontend/.env.example frontend/.env
        printf "${GREEN}✓ frontend/.env created${NC}\n"
    fi
else
    printf "${GREEN}✓ frontend/.env exists${NC}\n"
fi

printf "\n"

# Step 4: Setup DynamoDB
printf "${GREEN}Step 4: Setting up DynamoDB${NC}\n"
printf "\n"

if [ "$USE_DYNAMODB_LOCAL" = true ]; then
    printf "${YELLOW}Using DynamoDB Local${NC}\n"
    printf "${YELLOW}Make sure DynamoDB Local is running on http://localhost:8000${NC}\n"
    printf "\n"
    read -p "Press Enter to create tables in DynamoDB Local, or Ctrl+C to cancel..."
    bash "$SCRIPT_DIR/setup-dynamodb-local.sh"
elif [ "$USE_AWS" = true ]; then
    printf "${YELLOW}Creating DynamoDB tables in AWS${NC}\n"
    printf "${YELLOW}This will create tables in your AWS account${NC}\n"
    printf "\n"
    read -p "Press Enter to continue, or Ctrl+C to cancel..."
    bash "$SCRIPT_DIR/setup-dynamodb-aws.sh"
else
    printf "${YELLOW}Skipping DynamoDB setup${NC}\n"
fi

printf "\n"

# Step 5: Setup S3 Buckets
if [ "$USE_AWS" = true ]; then
    printf "${GREEN}Step 5: Setting up S3 Buckets${NC}\n"
    printf "\n"
    printf "${YELLOW}Creating S3 buckets in AWS${NC}\n"
    read -p "Press Enter to continue, or Ctrl+C to skip..."
    bash "$SCRIPT_DIR/create-s3-buckets.sh"
    printf "\n"
fi

# Step 6: Build Backend
printf "${GREEN}Step 6: Building Backend${NC}\n"
printf "\n"

cd "$PROJECT_ROOT/backend"
printf "${YELLOW}Building backend...${NC}\n"
npm run build

if [ $? -eq 0 ]; then
    printf "${GREEN}✓ Backend build successful${NC}\n"
else
    printf "${RED}✗ Backend build failed${NC}\n"
    exit 1
fi

printf "\n"

# Step 7: Summary
printf "${BLUE}========================================${NC}\n"
printf "${BLUE}Setup Complete!${NC}\n"
printf "${BLUE}========================================${NC}\n"
printf "\n"
printf "${GREEN}Next Steps:${NC}\n"
printf "\n"
printf "1. ${YELLOW}Update configuration${NC}\n"
printf "   Edit ${BLUE}backend/.env${NC} with your actual AWS resource names\n"
printf "\n"
printf "2. ${YELLOW}Start the backend${NC}\n"
printf "   cd backend\n"
printf "   npm run start:dev\n"
printf "\n"
printf "3. ${YELLOW}Start the frontend${NC} (in another terminal)\n"
printf "   cd frontend\n"
printf "   npm run dev\n"
printf "\n"
printf "4. ${YELLOW}Access the application${NC}\n"
printf "   Backend:  http://localhost:3000\n"
printf "   Frontend: http://localhost:5173\n"
printf "   API Docs: http://localhost:3000/api\n"
printf "\n"
printf "${GREEN}For more details, see:${NC} docs/LOCAL_DEVELOPMENT.md\n"
printf "\n"
