#!/usr/bin/env bash

# Delete DynamoDB tables script
# This will delete all tables so they can be recreated with the correct schema

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
TABLE_PREFIX="${TABLE_PREFIX:-lead-delivery-system-dev-database}"

# Function to delete a table
delete_table() {
    local table_name=$1

    printf "${YELLOW}Checking if table ${table_name} exists...${NC}\n"

    if aws dynamodb describe-table \
        --table-name "${table_name}" \
        --region "${AWS_REGION}" \
        --endpoint-url "${DYNAMODB_ENDPOINT}" \
        2>/dev/null; then

        printf "${RED}Deleting table: ${table_name}${NC}\n"
        aws dynamodb delete-table \
            --table-name "${table_name}" \
            --region "${AWS_REGION}" \
            --endpoint-url "${DYNAMODB_ENDPOINT}"

        printf "${GREEN}Table ${table_name} deleted successfully${NC}\n"
    else
        printf "${YELLOW}Table ${table_name} does not exist, skipping${NC}\n"
    fi
}

# Determine if using local or AWS DynamoDB
if [ -n "${USE_LOCAL_DYNAMODB}" ] || [ "${DYNAMODB_ENDPOINT}" = "http://localhost:8000" ]; then
    printf "${YELLOW}Using LOCAL DynamoDB at ${DYNAMODB_ENDPOINT}${NC}\n"
    DYNAMODB_ENDPOINT="http://localhost:8000"
else
    printf "${YELLOW}Using AWS DynamoDB in region ${AWS_REGION}${NC}\n"
    DYNAMODB_ENDPOINT=""
fi

printf "${RED}WARNING: This will DELETE all DynamoDB tables!${NC}\n"
printf "${YELLOW}Table prefix: ${TABLE_PREFIX}${NC}\n"
printf "\nTables that will be deleted:\n"
printf "  - ${TABLE_PREFIX}-customers\n"
printf "  - ${TABLE_PREFIX}-deliveries\n"
printf "  - ${TABLE_PREFIX}-field-mappings\n"
printf "  - ${TABLE_PREFIX}-delivery-logs\n"
printf "  - ${TABLE_PREFIX}-integration-code\n"
printf "\n"

read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    printf "${YELLOW}Deletion cancelled${NC}\n"
    exit 0
fi

printf "\n${RED}Deleting tables...${NC}\n\n"

# Delete all tables
delete_table "${TABLE_PREFIX}-customers"
delete_table "${TABLE_PREFIX}-deliveries"
delete_table "${TABLE_PREFIX}-field-mappings"
delete_table "${TABLE_PREFIX}-delivery-logs"
delete_table "${TABLE_PREFIX}-integration-code"

printf "\n${GREEN}All tables deleted successfully!${NC}\n"
printf "${YELLOW}Now run the setup script to recreate tables with correct schema:${NC}\n"
printf "  For AWS: ./scripts/setup-dynamodb-aws.sh\n"
printf "  For Local: ./scripts/setup-dynamodb-local.sh\n"
