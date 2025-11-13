#!/bin/bash

# Setup DynamoDB Tables for Local Development
# This script creates all required DynamoDB tables locally

set -e

# Configuration
REGION=${AWS_REGION:-us-east-1}
ENDPOINT=${DYNAMODB_ENDPOINT:-http://localhost:8000}
TABLE_PREFIX=${TABLE_PREFIX:-lead-delivery-system-dev-database}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}DynamoDB Local Table Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Region: ${YELLOW}${REGION}${NC}"
echo -e "Endpoint: ${YELLOW}${ENDPOINT}${NC}"
echo -e "Table Prefix: ${YELLOW}${TABLE_PREFIX}${NC}"
echo ""

# Function to create table
create_table() {
    local table_name=$1
    local key_schema=$2
    local attribute_definitions=$3
    local gsi=$4

    echo -e "${YELLOW}Creating table: ${table_name}${NC}"

    local output
    local exit_code

    if [ -z "$gsi" ]; then
        output=$(aws dynamodb create-table \
            --table-name "${table_name}" \
            --attribute-definitions ${attribute_definitions} \
            --key-schema ${key_schema} \
            --billing-mode PAY_PER_REQUEST \
            --region ${REGION} \
            --endpoint-url ${ENDPOINT} \
            --no-cli-pager 2>&1)
        exit_code=$?
    else
        output=$(aws dynamodb create-table \
            --table-name "${table_name}" \
            --attribute-definitions ${attribute_definitions} \
            --key-schema ${key_schema} \
            --global-secondary-indexes ${gsi} \
            --billing-mode PAY_PER_REQUEST \
            --region ${REGION} \
            --endpoint-url ${ENDPOINT} \
            --no-cli-pager 2>&1)
        exit_code=$?
    fi

    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Table ${table_name} created successfully${NC}"
    else
        if echo "$output" | grep -q "ResourceInUseException"; then
            echo -e "${YELLOW}⚠ Table ${table_name} already exists${NC}"
        else
            echo -e "${RED}✗ Failed to create table ${table_name}${NC}"
            echo -e "${RED}Error: ${output}${NC}"
            return 1
        fi
    fi
    echo ""
}

# 1. Customers Table
echo -e "${GREEN}1. Creating Customers Table${NC}"
create_table \
    "${TABLE_PREFIX}-customers" \
    "AttributeName=customerId,KeyType=HASH" \
    "AttributeName=customerId,AttributeType=S AttributeName=createdAt,AttributeType=S" \
    '[{"IndexName":"createdAt-index","KeySchema":[{"AttributeName":"customerId","KeyType":"HASH"},{"AttributeName":"createdAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]'

# 2. Deliveries Table
echo -e "${GREEN}2. Creating Deliveries Table${NC}"
create_table \
    "${TABLE_PREFIX}-deliveries" \
    "AttributeName=deliveryId,KeyType=HASH" \
    "AttributeName=deliveryId,AttributeType=S AttributeName=customerId,AttributeType=S AttributeName=status,AttributeType=S AttributeName=createdAt,AttributeType=S" \
    '[{"IndexName":"customerId-index","KeySchema":[{"AttributeName":"customerId","KeyType":"HASH"},{"AttributeName":"createdAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}},{"IndexName":"status-index","KeySchema":[{"AttributeName":"status","KeyType":"HASH"},{"AttributeName":"createdAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]'

# 3. Field Mappings Table
echo -e "${GREEN}3. Creating Field Mappings Table${NC}"
create_table \
    "${TABLE_PREFIX}-field-mappings" \
    "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
    "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S AttributeName=customerId,AttributeType=S" \
    '[{"IndexName":"customerId-index","KeySchema":[{"AttributeName":"customerId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}]'

# 4. Delivery Logs Table
echo -e "${GREEN}4. Creating Delivery Logs Table${NC}"
create_table \
    "${TABLE_PREFIX}-delivery-logs" \
    "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
    "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S AttributeName=deliveryId,AttributeType=S AttributeName=status,AttributeType=S" \
    '[{"IndexName":"deliveryId-index","KeySchema":[{"AttributeName":"deliveryId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}},{"IndexName":"status-index","KeySchema":[{"AttributeName":"status","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}]'

# 5. Integration Code Table
echo -e "${GREEN}5. Creating Integration Code Table${NC}"
create_table \
    "${TABLE_PREFIX}-integration-code" \
    "AttributeName=customerId,KeyType=HASH" \
    "AttributeName=customerId,AttributeType=S AttributeName=createdAt,AttributeType=S" \
    '[{"IndexName":"createdAt-index","KeySchema":[{"AttributeName":"customerId","KeyType":"HASH"},{"AttributeName":"createdAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]'

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All Tables Created Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# List all tables
echo -e "${YELLOW}Listing all tables:${NC}"
aws dynamodb list-tables \
    --region ${REGION} \
    --endpoint-url ${ENDPOINT} \
    --no-cli-pager

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo -e "Update your ${YELLOW}backend/.env${NC} file with:"
echo -e "  CUSTOMERS_TABLE=${TABLE_PREFIX}-customers"
echo -e "  DELIVERIES_TABLE=${TABLE_PREFIX}-deliveries"
echo -e "  FIELD_MAPPINGS_TABLE=${TABLE_PREFIX}-field-mappings"
echo -e "  DELIVERY_LOGS_TABLE=${TABLE_PREFIX}-delivery-logs"
echo -e "  INTEGRATION_CODE_TABLE=${TABLE_PREFIX}-integration-code"
echo ""
