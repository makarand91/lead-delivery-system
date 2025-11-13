# Setup Scripts

These scripts help you set up the Lead Delivery System for local development.

## Available Scripts

### 1. `setup-local-dev.sh` - Complete Local Setup

**Recommended:** Run this script for complete local setup.

```bash
cd scripts
./setup-local-dev.sh
```

This script will:
- Check prerequisites (Node.js, npm, AWS CLI)
- Install all dependencies
- Create environment files
- Set up DynamoDB tables (AWS or Local)
- Create S3 buckets (AWS)
- Build the backend

**Environment Variables:**
```bash
# Use DynamoDB Local instead of AWS
USE_DYNAMODB_LOCAL=true ./setup-local-dev.sh

# Skip AWS setup (DynamoDB Local only)
USE_AWS=false ./setup-local-dev.sh
```

### 2. `setup-dynamodb-local.sh` - DynamoDB Local Tables

Creates DynamoDB tables in DynamoDB Local (localhost:8000).

**Prerequisites:**
- DynamoDB Local running on http://localhost:8000

```bash
# Start DynamoDB Local first
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb

# Then run script
./setup-dynamodb-local.sh
```

**Environment Variables:**
```bash
# Custom endpoint
DYNAMODB_ENDPOINT=http://localhost:9000 ./setup-dynamodb-local.sh

# Custom region
AWS_REGION=us-west-2 ./setup-dynamodb-local.sh

# Custom table prefix
TABLE_PREFIX=my-app-dev ./setup-dynamodb-local.sh
```

### 3. `setup-dynamodb-aws.sh` - DynamoDB AWS Tables

Creates DynamoDB tables in your AWS account.

**Prerequisites:**
- AWS CLI installed and configured
- Valid AWS credentials

```bash
./setup-dynamodb-aws.sh
```

**Environment Variables:**
```bash
# Specific region
AWS_REGION=us-west-2 ./setup-dynamodb-aws.sh

# Custom table prefix
TABLE_PREFIX=prod-database ./setup-dynamodb-aws.sh
```

**Tables Created:**
- `{prefix}-customers`
- `{prefix}-deliveries`
- `{prefix}-field-mappings`
- `{prefix}-delivery-logs`
- `{prefix}-integration-code`

All tables use PAY_PER_REQUEST billing mode.

### 4. `create-s3-buckets.sh` - S3 Buckets

Creates S3 buckets in your AWS account.

**Prerequisites:**
- AWS CLI installed and configured
- Valid AWS credentials

```bash
./create-s3-buckets.sh
```

**Environment Variables:**
```bash
# Specific region
AWS_REGION=us-west-2 ./create-s3-buckets.sh

# Custom bucket prefix
BUCKET_PREFIX=my-app-storage ./create-s3-buckets.sh
```

**Buckets Created:**
- `{prefix}-lead-files-{account-id}` - Excel file uploads
- `{prefix}-integration-code-{account-id}` - Generated integration code
- `{prefix}-warehouse-files-{account-id}` - Formatted files for warehouse

**Features:**
- Versioning enabled
- Public access blocked
- AES256 encryption
- Lifecycle policy on warehouse bucket (IA @ 30d, Glacier @ 90d)

## Quick Start Examples

### Option 1: Full AWS Setup

```bash
# 1. Configure AWS credentials
aws configure

# 2. Run complete setup
./setup-local-dev.sh

# 3. Update backend/.env with actual resource names

# 4. Start backend
cd ../backend
npm run start:dev
```

### Option 2: DynamoDB Local + AWS S3

```bash
# 1. Start DynamoDB Local
docker run -p 8000:8000 amazon/dynamodb-local

# 2. Run setup with DynamoDB Local
USE_DYNAMODB_LOCAL=true ./setup-local-dev.sh

# 3. Start backend
cd ../backend
npm run start:dev
```

### Option 3: Manual Setup

```bash
# 1. Create DynamoDB tables only
./setup-dynamodb-aws.sh

# 2. Create S3 buckets only
./create-s3-buckets.sh

# 3. Build backend
cd ../backend
npm run build
```

## DynamoDB Local Setup

### Install DynamoDB Local

**Option A: Download**
```bash
wget https://d1ni2b6xgvw0s0.cloudfront.net/v2.x/dynamodb_local_latest.tar.gz
tar -xvzf dynamodb_local_latest.tar.gz
cd dynamodb_local_latest
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
```

**Option B: Docker**
```bash
docker run -p 8000:8000 amazon/dynamodb-local
```

**Option C: NoSQL Workbench**
Download from: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/workbench.html

### Using DynamoDB Local

Update `backend/.env`:
```bash
# Add this line
AWS_DYNAMODB_ENDPOINT=http://localhost:8000
```

Then run:
```bash
./setup-dynamodb-local.sh
```

## Troubleshooting

### AWS CLI Not Found

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### AWS Credentials Not Configured

```bash
aws configure
# Enter your Access Key ID
# Enter your Secret Access Key
# Enter your region (e.g., us-east-1)
# Enter output format (json)
```

### Table Already Exists

If you need to recreate tables:

**DynamoDB Local:**
```bash
# Delete all tables
aws dynamodb list-tables --endpoint-url http://localhost:8000 \
  | jq -r '.TableNames[]' \
  | xargs -I {} aws dynamodb delete-table --table-name {} --endpoint-url http://localhost:8000

# Recreate
./setup-dynamodb-local.sh
```

**AWS DynamoDB:**
```bash
# Delete specific table
aws dynamodb delete-table --table-name lead-delivery-system-dev-database-customers

# Recreate
./setup-dynamodb-aws.sh
```

### Permission Denied

```bash
chmod +x *.sh
```

### Script Fails Midway

All scripts are idempotent - you can safely re-run them. Resources that already exist will be skipped.

## Environment Variables Reference

### Global

- `AWS_REGION` - AWS region (default: us-east-1)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key

### DynamoDB

- `DYNAMODB_ENDPOINT` - DynamoDB endpoint (default: uses AWS)
- `TABLE_PREFIX` - Table name prefix (default: lead-delivery-system-dev-database)

### S3

- `BUCKET_PREFIX` - Bucket name prefix (default: lead-delivery-system-dev-storage)

### Setup Script

- `USE_DYNAMODB_LOCAL` - Use DynamoDB Local instead of AWS (default: false)
- `USE_AWS` - Create AWS resources (default: true)

## Cost Considerations

### DynamoDB Local
- **FREE** - Runs locally on your machine
- No AWS charges

### AWS DynamoDB (PAY_PER_REQUEST)
- **~$1.25 per million read requests**
- **~$1.25 per million write requests**
- **$0.25 per GB stored per month**
- **First 25 GB storage is free**

### AWS S3
- **$0.023 per GB stored per month** (Standard)
- **$0.005 per 1,000 PUT requests**
- **$0.0004 per 1,000 GET requests**
- **Free tier:** 5 GB storage, 20,000 GET, 2,000 PUT

### Estimated Monthly Cost (Low Usage)
- **DynamoDB:** < $1
- **S3:** < $1
- **Total:** < $5/month for development

## Next Steps

After running the setup scripts:

1. **Update Environment Variables**
   - Edit `backend/.env` with actual resource names
   - Update Cognito User Pool ID
   - Configure Bedrock model ID

2. **Start Development**
   ```bash
   cd backend
   npm run start:dev
   ```

3. **Test the API**
   ```bash
   curl http://localhost:3000/health
   ```

4. **Access API Documentation**
   - Open: http://localhost:3000/api

5. **Start Frontend** (optional)
   ```bash
   cd frontend
   npm run dev
   ```

For more details, see `../docs/LOCAL_DEVELOPMENT.md`
