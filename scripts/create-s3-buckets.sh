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

# Create single unified bucket
BUCKET_NAME="${BUCKET_PREFIX}-${AWS_ACCOUNT_ID}"
printf "${GREEN}Creating unified storage bucket${NC}\n"
create_bucket \
    "${BUCKET_NAME}" \
    "Unified storage for lead files, integration code, and warehouse data"

# Add lifecycle policy with prefix-based rules
printf "${YELLOW}Configuring lifecycle policies...${NC}\n"
cat > /tmp/bucket-lifecycle.json <<EOF
{
  "Rules": [
    {
      "Id": "WarehouseTransitionToIA",
      "Filter": {
        "Prefix": "warehouse/"
      },
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
    --bucket ${BUCKET_NAME} \
    --lifecycle-configuration file:///tmp/bucket-lifecycle.json \
    --region ${REGION}

printf "${GREEN}✓ Lifecycle policy applied${NC}\n"
printf "\n"

# Configure CORS
printf "${YELLOW}Configuring CORS for frontend uploads...${NC}\n"
cat > /tmp/cors-config.json <<'CORS_EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:5174"
      ],
      "AllowedMethods": [
        "GET",
        "PUT",
        "POST",
        "DELETE",
        "HEAD"
      ],
      "AllowedHeaders": [
        "*"
      ],
      "ExposeHeaders": [
        "ETag",
        "x-amz-server-side-encryption",
        "x-amz-request-id",
        "x-amz-id-2"
      ],
      "MaxAgeSeconds": 3600
    }
  ]
}
CORS_EOF

aws s3api put-bucket-cors \
    --bucket ${BUCKET_NAME} \
    --cors-configuration file:///tmp/cors-config.json \
    --region ${REGION}

rm -f /tmp/cors-config.json

printf "${GREEN}✓ CORS configuration applied${NC}\n"
printf "\n"

# Create folder structure (optional, but helps with organization)
printf "${YELLOW}Creating folder structure...${NC}\n"
for prefix in "lead-files/" "integration-code/" "warehouse/"; do
    aws s3api put-object \
        --bucket ${BUCKET_NAME} \
        --key "${prefix}" \
        --region ${REGION} > /dev/null 2>&1 || true
done
printf "${GREEN}✓ Folder structure created${NC}\n"
printf "\n"

printf "\n"
printf "${GREEN}========================================${NC}\n"
printf "${GREEN}Bucket Created Successfully!${NC}\n"
printf "${GREEN}========================================${NC}\n"
printf "\n"

# List bucket contents
printf "${YELLOW}Verifying bucket:${NC}\n"
aws s3 ls s3://${BUCKET_NAME}/ --region ${REGION}

printf "\n"
printf "${GREEN}Setup complete!${NC}\n"
printf "\n"
printf "Update your ${YELLOW}backend/.env${NC} file with:\n"
printf "\n"
printf "  # Single bucket with prefixes (recommended)\n"
printf "  S3_BUCKET=${BUCKET_NAME}\n"
printf "  LEAD_FILES_PREFIX=lead-files/\n"
printf "  INTEGRATION_CODE_PREFIX=integration-code/\n"
printf "  WAREHOUSE_PREFIX=warehouse/\n"
printf "\n"
printf "  # OR keep separate bucket variables (legacy compatibility)\n"
printf "  LEAD_FILES_BUCKET=${BUCKET_NAME}\n"
printf "  INTEGRATION_CODE_BUCKET=${BUCKET_NAME}\n"
printf "  WAREHOUSE_FILES_BUCKET=${BUCKET_NAME}\n"
printf "\n"
printf "${YELLOW}Bucket Features:${NC}\n"
printf "  ✓ Versioning enabled\n"
printf "  ✓ Public access blocked\n"
printf "  ✓ Encryption enabled (AES256)\n"
printf "  ✓ CORS configured (allows uploads from localhost)\n"
printf "  ✓ Organized with prefixes: lead-files/, integration-code/, warehouse/\n"
printf "  ✓ Warehouse prefix: Lifecycle transitions (IA @ 30d, Glacier @ 90d)\n"
printf "\n"
printf "${YELLOW}Bucket Structure:${NC}\n"
printf "  s3://${BUCKET_NAME}/lead-files/          - Excel files with leads\n"
printf "  s3://${BUCKET_NAME}/integration-code/    - AI-generated code\n"
printf "  s3://${BUCKET_NAME}/warehouse/           - Formatted warehouse files\n"
printf "\n"