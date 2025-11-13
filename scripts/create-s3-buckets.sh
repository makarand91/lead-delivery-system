#!/bin/bash

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

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}S3 Buckets Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Region: ${YELLOW}${REGION}${NC}"
echo -e "Account ID: ${YELLOW}${AWS_ACCOUNT_ID}${NC}"
echo -e "Bucket Prefix: ${YELLOW}${BUCKET_PREFIX}${NC}"
echo ""

# Check AWS credentials
echo -e "${YELLOW}Checking AWS credentials...${NC}"
aws sts get-caller-identity --region ${REGION} > /dev/null 2>&1 || {
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    echo "Please run: aws configure"
    exit 1
}
echo -e "${GREEN}✓ AWS credentials valid${NC}"
echo ""

# Function to create bucket
create_bucket() {
    local bucket_name=$1
    local description=$2

    echo -e "${YELLOW}Creating bucket: ${bucket_name}${NC}"
    echo -e "  Purpose: ${description}"

    # Create bucket
    if [ "${REGION}" = "us-east-1" ]; then
        aws s3api create-bucket \
            --bucket ${bucket_name} \
            --region ${REGION} \
            2>/dev/null || echo -e "${RED}  Bucket already exists${NC}"
    else
        aws s3api create-bucket \
            --bucket ${bucket_name} \
            --region ${REGION} \
            --create-bucket-configuration LocationConstraint=${REGION} \
            2>/dev/null || echo -e "${RED}  Bucket already exists${NC}"
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

    echo -e "${GREEN}✓ Bucket ${bucket_name} configured${NC}"
    echo ""
}

# 1. Lead Files Bucket
echo -e "${GREEN}1. Creating Lead Files Bucket${NC}"
create_bucket \
    "${BUCKET_PREFIX}-lead-files-${AWS_ACCOUNT_ID}" \
    "Stores uploaded Excel files with leads"

# 2. Integration Code Bucket
echo -e "${GREEN}2. Creating Integration Code Bucket${NC}"
create_bucket \
    "${BUCKET_PREFIX}-integration-code-${AWS_ACCOUNT_ID}" \
    "Stores AI-generated integration code"

# 3. Warehouse Files Bucket
echo -e "${GREEN}3. Creating Warehouse Files Bucket${NC}"
WAREHOUSE_BUCKET="${BUCKET_PREFIX}-warehouse-files-${AWS_ACCOUNT_ID}"
create_bucket \
    "${WAREHOUSE_BUCKET}" \
    "Stores formatted files for data warehouse"

# Add lifecycle policy to warehouse bucket
echo -e "${YELLOW}Adding lifecycle policy to warehouse bucket...${NC}"
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

echo -e "${GREEN}✓ Lifecycle policy applied${NC}"
echo ""

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All Buckets Created Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# List all buckets
echo -e "${YELLOW}Listing all buckets:${NC}"
aws s3 ls | grep "${BUCKET_PREFIX}"

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo -e "Update your ${YELLOW}backend/.env${NC} file with:"
echo -e "  LEAD_FILES_BUCKET=${BUCKET_PREFIX}-lead-files-${AWS_ACCOUNT_ID}"
echo -e "  INTEGRATION_CODE_BUCKET=${BUCKET_PREFIX}-integration-code-${AWS_ACCOUNT_ID}"
echo -e "  WAREHOUSE_FILES_BUCKET=${BUCKET_PREFIX}-warehouse-files-${AWS_ACCOUNT_ID}"
echo ""
echo -e "${YELLOW}Bucket Features:${NC}"
echo -e "  ✓ Versioning enabled"
echo -e "  ✓ Public access blocked"
echo -e "  ✓ Encryption enabled (AES256)"
echo -e "  ✓ Warehouse: Lifecycle transitions (IA @ 30d, Glacier @ 90d)"
echo ""