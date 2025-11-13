#!/usr/bin/env bash

# Setup DynamoDB Tables in AWS Account
# This script creates all required DynamoDB tables in your AWS account

# Note: NOT using set -e so script continues even if one table fails
# set -e

# Configuration
REGION=${AWS_REGION:-us-east-1}
TABLE_PREFIX=${TABLE_PREFIX:-lead-delivery-system-dev-database}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

printf "${GREEN}========================================${NC}\n"
printf "${GREEN}DynamoDB AWS Table Setup${NC}\n"
printf "${GREEN}========================================${NC}\n"
printf "\n"
printf "Region: ${YELLOW}${REGION}${NC}\n"
printf "Table Prefix: ${YELLOW}${TABLE_PREFIX}${NC}\n"
printf "\n"

# Check AWS credentials
printf "${YELLOW}Checking AWS credentials...${NC}\n"
aws sts get-caller-identity --region ${REGION} > /dev/null 2>&1 || {
    printf "${RED}Error: AWS credentials not configured${NC}\n"
    printf "Please run: aws configure\n"
    exit 1
}
printf "${GREEN}✓ AWS credentials valid${NC}\n"
printf "\n"

# Function to create table
create_table() {
    local table_name=$1
    local key_schema=$2
    local attribute_definitions=$3
    local gsi=$4

    printf "${YELLOW}Creating table: ${table_name}${NC}\n"

    local output
    local exit_code

    if [ -z "$gsi" ]; then
        output=$(aws dynamodb create-table \
            --table-name "${table_name}" \
            --attribute-definitions ${attribute_definitions} \
            --key-schema ${key_schema} \
            --billing-mode PAY_PER_REQUEST \
            --region ${REGION} \
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
            --no-cli-pager 2>&1)
        exit_code=$?
    fi

    if [ $exit_code -eq 0 ]; then
        printf "${GREEN}✓ Table ${table_name} created successfully${NC}\n"
    else
        if echo "$output" | grep -q "ResourceInUseException"; then
            printf "${YELLOW}⚠ Table ${table_name} already exists${NC}\n"
        else
            printf "${RED}✗ Failed to create table ${table_name}${NC}\n"
            printf "${RED}Error: ${output}${NC}\n"
            return 1
        fi
    fi
    printf "\n"
}

# 1. Customers Table
printf "${GREEN}1. Creating Customers Table${NC}\n"
create_table \
    "${TABLE_PREFIX}-customers" \
    "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
    "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S AttributeName=teamId,AttributeType=S AttributeName=createdAt,AttributeType=S" \
    '[{"IndexName":"TeamIndex","KeySchema":[{"AttributeName":"teamId","KeyType":"HASH"},{"AttributeName":"createdAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]'

# 2. Deliveries Table
printf "${GREEN}2. Creating Deliveries Table${NC}\n"
create_table \
    "${TABLE_PREFIX}-deliveries" \
    "AttributeName=deliveryId,KeyType=HASH" \
    "AttributeName=deliveryId,AttributeType=S AttributeName=customerId,AttributeType=S AttributeName=status,AttributeType=S AttributeName=createdAt,AttributeType=S" \
    '[{"IndexName":"customerId-index","KeySchema":[{"AttributeName":"customerId","KeyType":"HASH"},{"AttributeName":"createdAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}},{"IndexName":"status-index","KeySchema":[{"AttributeName":"status","KeyType":"HASH"},{"AttributeName":"createdAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]'

# 3. Field Mappings Table
printf "${GREEN}3. Creating Field Mappings Table${NC}\n"
create_table \
    "${TABLE_PREFIX}-field-mappings" \
    "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
    "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S AttributeName=customerId,AttributeType=S" \
    '[{"IndexName":"customerId-index","KeySchema":[{"AttributeName":"customerId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}]'

# 4. Delivery Logs Table
printf "${GREEN}4. Creating Delivery Logs Table${NC}\n"
create_table \
    "${TABLE_PREFIX}-delivery-logs" \
    "AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE" \
    "AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S AttributeName=deliveryId,AttributeType=S AttributeName=status,AttributeType=S" \
    '[{"IndexName":"deliveryId-index","KeySchema":[{"AttributeName":"deliveryId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}},{"IndexName":"status-index","KeySchema":[{"AttributeName":"status","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}]'

# 5. Integration Code Table
printf "${GREEN}5. Creating Integration Code Table${NC}\n"
create_table \
    "${TABLE_PREFIX}-integration-code" \
    "AttributeName=customerId,KeyType=HASH" \
    "AttributeName=customerId,AttributeType=S AttributeName=createdAt,AttributeType=S" \
    '[{"IndexName":"createdAt-index","KeySchema":[{"AttributeName":"customerId","KeyType":"HASH"},{"AttributeName":"createdAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]'

printf "\n"
printf "${GREEN}========================================${NC}\n"
printf "${GREEN}All Tables Created Successfully!${NC}\n"
printf "${GREEN}========================================${NC}\n"
printf "\n"

# Wait for tables to become active
printf "${YELLOW}Waiting for tables to become active...${NC}\n"
for table in "${TABLE_PREFIX}-customers" "${TABLE_PREFIX}-deliveries" "${TABLE_PREFIX}-field-mappings" "${TABLE_PREFIX}-delivery-logs" "${TABLE_PREFIX}-integration-code"; do
    printf "  Waiting for ${table}...\n"
    aws dynamodb wait table-exists --table-name ${table} --region ${REGION}
done
printf "${GREEN}✓ All tables are active${NC}\n"
printf "\n"

# List all tables
printf "${YELLOW}Listing all tables:${NC}\n"
aws dynamodb list-tables --region ${REGION} --no-cli-pager | grep "${TABLE_PREFIX}"

printf "\n"
printf "${GREEN}Setup complete!${NC}\n"
printf "\n"
printf "Update your ${YELLOW}backend/.env${NC} file with:\n"
printf "  CUSTOMERS_TABLE=${TABLE_PREFIX}-customers\n"
printf "  DELIVERIES_TABLE=${TABLE_PREFIX}-deliveries\n"
printf "  FIELD_MAPPINGS_TABLE=${TABLE_PREFIX}-field-mappings\n"
printf "  DELIVERY_LOGS_TABLE=${TABLE_PREFIX}-delivery-logs\n"
printf "  INTEGRATION_CODE_TABLE=${TABLE_PREFIX}-integration-code\n"
printf "\n"
printf "${YELLOW}Note: These tables use PAY_PER_REQUEST billing mode${NC}\n"
printf "\n"