#!/usr/bin/env bash

# Create S3 Buckets for Local Development
# This script creates all required S3 buckets in your AWS account

set -e

# Configuration
REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "123456789012")
BUCKET_PREFIX=${BUCKET_PREFIX:-lead-delivery-system-dev-storage}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

printf "${GREEN}========================================${NC}\n"
printf "${GREEN}S3 Buckets Setup${NC}\n"
printf "${GREEN}========================================${NC}\n"
printf "\n"
printf "Region: ${YELLOW}${REGION}${NC}\n"
printf "Account ID: ${YELLOW}${AWS_ACCOUNT_ID}${NC}\n"
printf "Bucket Prefix: ${YELLOW}${BUCKET_PREFIX}${NC}\n"
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

# Function to create bucket
create_bucket() {
    local bucket_name=$1
    local description=$2

    printf "${YELLOW}Creating bucket: ${bucket_name}${NC}\n"
    printf "  Purpose: ${description}\n"

    # Create bucket
    if [ "${REGION}" = "us-east-1" ]; then
        aws s3api create-bucket \
            --bucket ${bucket_name} \
            --region ${REGION} \
            2>/dev/null || printf "${RED}  Bucket already exists${NC}\n"
    else
        aws s3api create-bucket \
            --bucket ${bucket_name} \
            --region ${REGION} \
            --create-bucket-configuration LocationConstraint=${REGION} \
            2>/dev/null || printf "${RED}  Bucket already exists${NC}\n"
    fi

    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket ${bucket_name} \
        --versioning-configuration Status=Enabled \
        --region ${REGION}

    # Block public access
    aws s3api put-public-access-block \
        --bucket ${bucket_name} \
        --public-access-block-configuration \
            "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
        --region ${REGION}

    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket ${bucket_name} \
        --server-side-encryption-configuration \
            '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' \
        --region ${REGION}

    printf "${GREEN}✓ Bucket ${bucket_name} configured${NC}\n"
    printf "\n"
}

# 1. Lead Files Bucket
printf "${GREEN}1. Creating Lead Files Bucket${NC}\n"
create_bucket \
    "${BUCKET_PREFIX}-lead-files-${AWS_ACCOUNT_ID}" \
    "Stores uploaded Excel files with leads"

# 2. Integration Code Bucket
printf "${GREEN}2. Creating Integration Code Bucket${NC}\n"
create_bucket \
    "${BUCKET_PREFIX}-integration-code-${AWS_ACCOUNT_ID}" \
    "Stores AI-generated integration code"

# 3. Warehouse Files Bucket
printf "${GREEN}3. Creating Warehouse Files Bucket${NC}\n"
WAREHOUSE_BUCKET="${BUCKET_PREFIX}-warehouse-files-${AWS_ACCOUNT_ID}"
create_bucket \
    "${WAREHOUSE_BUCKET}" \
    "Stores formatted files for data warehouse"

# Add lifecycle policy to warehouse bucket
printf "${YELLOW}Adding lifecycle policy to warehouse bucket...${NC}\n"
cat > /tmp/warehouse-lifecycle.json <<EOF
{
  "Rules": [
    {
      "Id": "TransitionToIA",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket ${WAREHOUSE_BUCKET} \
    --lifecycle-configuration file:///tmp/warehouse-lifecycle.json \
    --region ${REGION}

printf "${GREEN}✓ Lifecycle policy applied${NC}\n"
printf "\n"

printf "\n"
printf "${GREEN}========================================${NC}\n"
printf "${GREEN}All Buckets Created Successfully!${NC}\n"
printf "${GREEN}========================================${NC}\n"
printf "\n"

# List all buckets
printf "${YELLOW}Listing all buckets:${NC}\n"
aws s3 ls | grep "${BUCKET_PREFIX}"

printf "\n"
printf "${GREEN}Setup complete!${NC}\n"
printf "\n"
printf "Update your ${YELLOW}backend/.env${NC} file with:\n"
printf "  LEAD_FILES_BUCKET=${BUCKET_PREFIX}-lead-files-${AWS_ACCOUNT_ID}\n"
printf "  INTEGRATION_CODE_BUCKET=${BUCKET_PREFIX}-integration-code-${AWS_ACCOUNT_ID}\n"
printf "  WAREHOUSE_FILES_BUCKET=${BUCKET_PREFIX}-warehouse-files-${AWS_ACCOUNT_ID}\n"
printf "\n"
printf "${YELLOW}Bucket Features:${NC}\n"
printf "  ✓ Versioning enabled\n"
printf "  ✓ Public access blocked\n"
printf "  ✓ Encryption enabled (AES256)\n"
printf "  ✓ Warehouse: Lifecycle transitions (IA @ 30d, Glacier @ 90d)\n"
printf "\n"