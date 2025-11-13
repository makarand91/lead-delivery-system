#!/usr/bin/env bash

# Diagnostic script to reveal actual DynamoDB table creation errors
# This script shows real error messages instead of suppressing them

set -e

# Configuration
REGION=${AWS_REGION:-us-east-1}
TABLE_PREFIX=${TABLE_PREFIX:-lead-delivery-system-dev-database}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

printf "${GREEN}========================================${NC}\n"
printf "${GREEN}DynamoDB Diagnostic Check${NC}\n"
printf "${GREEN}========================================${NC}\n"
printf "\n"
printf "Region: ${YELLOW}${REGION}${NC}\n"
printf "Table Prefix: ${YELLOW}${TABLE_PREFIX}${NC}\n"
printf "\n"

# Check AWS credentials
printf "${YELLOW}Checking AWS credentials...${NC}\n"
if aws sts get-caller-identity --region ${REGION} > /dev/null 2>&1; then
    printf "${GREEN}✓ AWS credentials valid${NC}\n"
    aws sts get-caller-identity --region ${REGION} --no-cli-pager
else
    printf "${RED}Error: AWS credentials not configured${NC}\n"
    printf "Please run: aws configure\n"
    exit 1
fi
printf "\n"

# List existing tables
printf "${YELLOW}Checking existing tables...${NC}\n"
aws dynamodb list-tables --region ${REGION} --no-cli-pager
printf "\n"

# Try to create one table with full error output
printf "${YELLOW}Attempting to create customers table with full error output...${NC}\n"
printf "\n"

aws dynamodb create-table \
    --table-name "${TABLE_PREFIX}-customers" \
    --attribute-definitions \
        AttributeName=customerId,AttributeType=S \
        AttributeName=createdAt,AttributeType=S \
    --key-schema \
        AttributeName=customerId,KeyType=HASH \
    --global-secondary-indexes \
        "[{\"IndexName\":\"createdAt-index\",\"KeySchema\":[{\"AttributeName\":\"customerId\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"createdAt\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
    --billing-mode PAY_PER_REQUEST \
    --region ${REGION} \
    --no-cli-pager

printf "\n"
printf "${GREEN}Table creation command completed${NC}\n"
