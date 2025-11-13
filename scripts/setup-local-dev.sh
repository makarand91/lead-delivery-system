#!/bin/bash

# Complete Local Development Setup Script
# This script sets up everything needed to run the app locally

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Lead Delivery System - Local Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
USE_DYNAMODB_LOCAL=${USE_DYNAMODB_LOCAL:-false}
USE_AWS=${USE_AWS:-true}

echo -e "${YELLOW}Setup Configuration:${NC}"
echo -e "  Project Root: ${PROJECT_ROOT}"
echo -e "  Use DynamoDB Local: ${USE_DYNAMODB_LOCAL}"
echo -e "  Use AWS: ${USE_AWS}"
echo ""

# Step 1: Check Prerequisites
echo -e "${GREEN}Step 1: Checking Prerequisites${NC}"
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js: ${NODE_VERSION}${NC}"
else
    echo -e "${RED}✗ Node.js not found${NC}"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm: ${NPM_VERSION}${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi

# Check AWS CLI (if using AWS)
if [ "$USE_AWS" = true ]; then
    if command -v aws &> /dev/null; then
        AWS_VERSION=$(aws --version 2>&1 | cut -d' ' -f1)
        echo -e "${GREEN}✓ AWS CLI: ${AWS_VERSION}${NC}"

        # Check AWS credentials
        if aws sts get-caller-identity &> /dev/null; then
            AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
            echo -e "${GREEN}✓ AWS Credentials: Account ${AWS_ACCOUNT}${NC}"
        else
            echo -e "${RED}✗ AWS credentials not configured${NC}"
            echo -e "${YELLOW}  Run: aws configure${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ AWS CLI not found${NC}"
        echo -e "${YELLOW}  Install: https://aws.amazon.com/cli/${NC}"
        exit 1
    fi
fi

echo ""

# Step 2: Install Dependencies
echo -e "${GREEN}Step 2: Installing Dependencies${NC}"
echo ""

cd "$PROJECT_ROOT"

if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Backend dependencies already installed${NC}"
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
fi

echo ""

# Step 3: Setup Environment Files
echo -e "${GREEN}Step 3: Setting up Environment Files${NC}"
echo ""

# Backend .env
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}Creating backend/.env...${NC}"
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✓ backend/.env created${NC}"
else
    echo -e "${GREEN}✓ backend/.env exists${NC}"
fi

# Frontend .env
if [ ! -f "frontend/.env" ]; then
    if [ -f "frontend/.env.example" ]; then
        echo -e "${YELLOW}Creating frontend/.env...${NC}"
        cp frontend/.env.example frontend/.env
        echo -e "${GREEN}✓ frontend/.env created${NC}"
    fi
else
    echo -e "${GREEN}✓ frontend/.env exists${NC}"
fi

echo ""

# Step 4: Setup DynamoDB
echo -e "${GREEN}Step 4: Setting up DynamoDB${NC}"
echo ""

if [ "$USE_DYNAMODB_LOCAL" = true ]; then
    echo -e "${YELLOW}Using DynamoDB Local${NC}"
    echo -e "${YELLOW}Make sure DynamoDB Local is running on http://localhost:8000${NC}"
    echo ""
    read -p "Press Enter to create tables in DynamoDB Local, or Ctrl+C to cancel..."
    bash "$SCRIPT_DIR/setup-dynamodb-local.sh"
elif [ "$USE_AWS" = true ]; then
    echo -e "${YELLOW}Creating DynamoDB tables in AWS${NC}"
    echo -e "${YELLOW}This will create tables in your AWS account${NC}"
    echo ""
    read -p "Press Enter to continue, or Ctrl+C to cancel..."
    bash "$SCRIPT_DIR/setup-dynamodb-aws.sh"
else
    echo -e "${YELLOW}Skipping DynamoDB setup${NC}"
fi

echo ""

# Step 5: Setup S3 Buckets
if [ "$USE_AWS" = true ]; then
    echo -e "${GREEN}Step 5: Setting up S3 Buckets${NC}"
    echo ""
    echo -e "${YELLOW}Creating S3 buckets in AWS${NC}"
    read -p "Press Enter to continue, or Ctrl+C to skip..."
    bash "$SCRIPT_DIR/create-s3-buckets.sh"
    echo ""
fi

# Step 6: Build Backend
echo -e "${GREEN}Step 6: Building Backend${NC}"
echo ""

cd "$PROJECT_ROOT/backend"
echo -e "${YELLOW}Building backend...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend build successful${NC}"
else
    echo -e "${RED}✗ Backend build failed${NC}"
    exit 1
fi

echo ""

# Step 7: Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo -e "1. ${YELLOW}Update configuration${NC}"
echo -e "   Edit ${BLUE}backend/.env${NC} with your actual AWS resource names"
echo ""
echo -e "2. ${YELLOW}Start the backend${NC}"
echo -e "   cd backend"
echo -e "   npm run start:dev"
echo ""
echo -e "3. ${YELLOW}Start the frontend${NC} (in another terminal)"
echo -e "   cd frontend"
echo -e "   npm run dev"
echo ""
echo -e "4. ${YELLOW}Access the application${NC}"
echo -e "   Backend:  http://localhost:3000"
echo -e "   Frontend: http://localhost:5173"
echo -e "   API Docs: http://localhost:3000/api"
echo ""
echo -e "${GREEN}For more details, see:${NC} docs/LOCAL_DEVELOPMENT.md"
echo ""
