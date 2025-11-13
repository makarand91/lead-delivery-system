#!/usr/bin/env bash

# Check which DynamoDB tables exist

REGION=${AWS_REGION:-us-east-1}
TABLE_PREFIX=${TABLE_PREFIX:-lead-delivery-system-dev-database}

printf "Checking DynamoDB tables in region: $REGION\n\n"

check_table() {
    local table_name=$1
    if aws dynamodb describe-table --table-name "${table_name}" --region ${REGION} --no-cli-pager > /dev/null 2>&1; then
        printf "✓ ${table_name} - EXISTS\n"
        return 0
    else
        printf "✗ ${table_name} - MISSING\n"
        return 1
    fi
}

check_table "${TABLE_PREFIX}-customers"
check_table "${TABLE_PREFIX}-deliveries"
check_table "${TABLE_PREFIX}-field-mappings"
check_table "${TABLE_PREFIX}-delivery-logs"
check_table "${TABLE_PREFIX}-integration-code"
