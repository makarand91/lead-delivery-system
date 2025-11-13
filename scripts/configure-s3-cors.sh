#!/usr/bin/env bash

# Configure CORS for S3 Bucket
# This allows the frontend to upload files directly to S3

set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
BUCKET_NAME="${1}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ -z "$BUCKET_NAME" ]; then
    printf "${RED}Error: Bucket name is required${NC}\n"
    printf "Usage: $0 <bucket-name>\n"
    printf "Example: $0 lead-delivery-system-dev-storage-123456789012\n"
    exit 1
fi

printf "${GREEN}========================================${NC}\n"
printf "${GREEN}Configuring CORS for S3 Bucket${NC}\n"
printf "${GREEN}========================================${NC}\n"
printf "\n"
printf "Bucket: ${YELLOW}${BUCKET_NAME}${NC}\n"
printf "Region: ${YELLOW}${AWS_REGION}${NC}\n"
printf "\n"

# Create CORS configuration file
printf "${YELLOW}Creating CORS configuration...${NC}\n"

cat > /tmp/cors-config.json << 'EOF'
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
EOF

printf "${GREEN}✓ CORS configuration created${NC}\n"
printf "\n"

# Apply CORS configuration
printf "${YELLOW}Applying CORS configuration to bucket...${NC}\n"

if aws s3api put-bucket-cors \
    --bucket "${BUCKET_NAME}" \
    --cors-configuration file:///tmp/cors-config.json \
    --region "${AWS_REGION}"; then
    printf "${GREEN}✓ CORS configuration applied successfully${NC}\n"
else
    printf "${RED}✗ Failed to apply CORS configuration${NC}\n"
    printf "${YELLOW}Make sure the bucket exists and you have permissions${NC}\n"
    rm -f /tmp/cors-config.json
    exit 1
fi

# Clean up
rm -f /tmp/cors-config.json

printf "\n"
printf "${GREEN}========================================${NC}\n"
printf "${GREEN}CORS Configuration Complete!${NC}\n"
printf "${GREEN}========================================${NC}\n"
printf "\n"
printf "${YELLOW}The bucket now allows uploads from:${NC}\n"
printf "  - http://localhost:3000\n"
printf "  - http://localhost:3001\n"
printf "  - http://localhost:5173 (Vite default)\n"
printf "  - http://localhost:5174\n"
printf "\n"
printf "${YELLOW}If you need to add production URLs later, edit this script${NC}\n"
printf "${YELLOW}and add them to the AllowedOrigins array.${NC}\n"
printf "\n"
