#!/bin/bash

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

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}DynamoDB Diagnostic Check${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Region: ${YELLOW}${REGION}${NC}"
echo -e "Table Prefix: ${YELLOW}${TABLE_PREFIX}${NC}"
echo ""

# Check AWS credentials
echo -e "${YELLOW}Checking AWS credentials...${NC}"
if aws sts get-caller-identity --region ${REGION} > /dev/null 2>&1; then
    echo -e "${GREEN}✓ AWS credentials valid${NC}"
    aws sts get-caller-identity --region ${REGION} --no-cli-pager
else
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    echo "Please run: aws configure"
    exit 1
fi
echo ""

# List existing tables
echo -e "${YELLOW}Checking existing tables...${NC}"
aws dynamodb list-tables --region ${REGION} --no-cli-pager
echo ""

# Try to create one table with full error output
echo -e "${YELLOW}Attempting to create customers table with full error output...${NC}"
echo ""

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

echo ""
echo -e "${GREEN}Table creation command completed${NC}"
