# Local Development Guide

This guide will help you set up and run the Lead Delivery System locally for development.

## Prerequisites

1. **Node.js 20+** (Currently using v22.21.1)
2. **npm 10+** (Currently using v10.9.4)
3. **AWS Account** with the following services:
   - DynamoDB
   - S3
   - Cognito
   - Bedrock (with Claude 3.5 Sonnet access)
   - Lambda
   - OpenSearch (optional)
4. **AWS CLI** installed and configured
5. **Git**

## Quick Start

### Step 1: Install Dependencies

From the project root:

```bash
npm install
```

This will install dependencies for all workspaces (infrastructure, backend, frontend, lambdas).

### Step 2: Configure AWS Credentials

The backend needs AWS credentials to access AWS services. Configure them using one of these methods:

#### Option A: AWS CLI (Recommended)

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (e.g., us-east-1)
# Enter your default output format (json)
```

#### Option B: Environment Variables

```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

#### Option C: AWS Credentials File

Create `~/.aws/credentials`:
```ini
[default]
aws_access_key_id = your_access_key
aws_secret_access_key = your_secret_key
```

Create `~/.aws/config`:
```ini
[default]
region = us-east-1
```

### Step 3: Deploy Infrastructure (First Time Only)

You need to deploy the infrastructure to create AWS resources:

```bash
cd infrastructure

# Copy and configure environment
cp .env.example .env
# Edit .env with your AWS account details

# Bootstrap CDK (first time only)
npm run cdk:bootstrap

# Deploy infrastructure
npm run cdk:deploy
```

This creates:
- DynamoDB tables
- S3 buckets
- Cognito configuration
- Lambda functions
- API Gateway
- OpenSearch configuration
- Secrets Manager secrets

**Save the CloudFormation outputs** - you'll need them for the backend configuration.

### Step 4: Configure Backend Environment

Update `backend/.env` with the outputs from CDK deployment:

```bash
# AWS Configuration
AWS_REGION=us-east-1

# DynamoDB Tables (from CDK outputs)
CUSTOMERS_TABLE=lead-delivery-system-dev-database-customers
DELIVERIES_TABLE=lead-delivery-system-dev-database-deliveries
FIELD_MAPPINGS_TABLE=lead-delivery-system-dev-database-field-mappings
DELIVERY_LOGS_TABLE=lead-delivery-system-dev-database-delivery-logs
INTEGRATION_CODE_TABLE=lead-delivery-system-dev-database-integration-code

# S3 Buckets (from CDK outputs)
LEAD_FILES_BUCKET=lead-delivery-system-dev-storage-lead-files-123456789012
INTEGRATION_CODE_BUCKET=lead-delivery-system-dev-storage-integration-code-123456789012
WAREHOUSE_FILES_BUCKET=lead-delivery-system-dev-storage-warehouse-files-123456789012

# Cognito (your existing User Pool)
USER_POOL_ID=us-east-1_XXXXXXXXX
USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# OpenSearch (from CDK outputs)
OPENSEARCH_ENDPOINT=https://search-xxx.us-east-1.es.amazonaws.com
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=YourSecurePassword123!
# This will be set by CDK
OPENSEARCH_SECRET_ARN=arn:aws:secretsmanager:us-east-1:123456789012:secret:opensearch-credentials

# Lambda (from CDK outputs)
CUSTOMER_LAMBDA_ROLE_ARN=arn:aws:iam::123456789012:role/customer-lambda-role

# Bedrock
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
BEDROCK_REGION=us-east-1

# Local Development
NODE_ENV=development
PORT=3000
```

### Step 5: Enable AWS Bedrock Access

1. Go to AWS Console > Bedrock
2. Navigate to "Model access"
3. Enable **Claude 3.5 Sonnet**
4. Wait for approval (usually instant)

### Step 6: Start Backend Development Server

```bash
cd backend
npm run start:dev
```

The backend will start on `http://localhost:3000`

### Step 7: Test the Backend

```bash
# Health check
curl http://localhost:3000/health

# Should return: {"status":"ok","timestamp":"..."}
```

### Step 8: Start Frontend (Optional)

In a new terminal:

```bash
cd frontend

# Copy environment
cp .env.example .env
# Edit .env with backend URL

# Install dependencies (if not done)
npm install

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

## Development Without Full AWS Setup

If you want to develop without deploying all AWS infrastructure:

### Option 1: DynamoDB Local

```bash
# Download DynamoDB Local
wget https://d1ni2b6xgvw0s0.cloudfront.net/v2.x/dynamodb_local_latest.tar.gz
tar -xvzf dynamodb_local_latest.tar.gz
cd dynamodb_local_latest

# Start DynamoDB Local
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb

# Update backend/.env
AWS_DYNAMODB_ENDPOINT=http://localhost:8000
```

Create local tables:
```bash
aws dynamodb create-table \
  --table-name lead-delivery-system-dev-database-customers \
  --attribute-definitions AttributeName=customerId,AttributeType=S \
  --key-schema AttributeName=customerId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000
```

### Option 2: LocalStack

```bash
# Install LocalStack
pip install localstack

# Start LocalStack with required services
localstack start -d

# Update backend/.env to use LocalStack endpoints
AWS_ENDPOINT=http://localhost:4566
```

### Option 3: Mock Services

For pure frontend development, you can mock the backend API responses.

## Common Development Tasks

### Build Backend

```bash
cd backend
npm run build
```

### Run Tests

```bash
cd backend
npm run test

# With coverage
npm run test:cov
```

### Lint Code

```bash
cd backend
npm run lint
```

### Format Code

```bash
cd backend
npm run format
```

### Generate API Documentation

The backend uses Swagger for API documentation. Once running:
- Visit: `http://localhost:3000/api`

### Watch for Changes

The development server (`npm run start:dev`) automatically reloads when you make changes to the code.

## Debugging

### VSCode Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

Then press F5 to start debugging.

### Debug with Chrome DevTools

```bash
cd backend
npm run start:debug
```

Then open Chrome and navigate to `chrome://inspect`

## Troubleshooting

### Issue: "Cannot find module" errors

**Solution:** Reinstall dependencies
```bash
rm -rf node_modules backend/node_modules frontend/node_modules
npm install
```

### Issue: AWS credentials not found

**Solution:** Verify AWS credentials are configured
```bash
aws sts get-caller-identity
```

### Issue: DynamoDB table not found

**Solution:** Deploy infrastructure first
```bash
cd infrastructure
npm run cdk:deploy
```

### Issue: Bedrock access denied

**Solution:**
1. Verify Bedrock model access is enabled in AWS Console
2. Check IAM permissions include Bedrock access
3. Ensure you're using the correct region

### Issue: Cognito authentication fails

**Solution:**
1. Verify USER_POOL_ID and USER_POOL_CLIENT_ID in .env
2. Create test user:
```bash
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username testuser \
  --user-attributes Name=email,Value=test@example.com \
  --temporary-password TestPassword123!
```

### Issue: Port 3000 already in use

**Solution:** Change port in backend/.env
```bash
PORT=3001
```

### Issue: OpenSearch connection fails

**Solution:** OpenSearch is optional for local development. Comment out in .env:
```bash
# OPENSEARCH_ENDPOINT=...
# OPENSEARCH_USERNAME=...
# OPENSEARCH_PASSWORD=...
```

## Environment Variables Reference

### Required for Backend

- `AWS_REGION` - AWS region (e.g., us-east-1)
- `CUSTOMERS_TABLE` - DynamoDB table name
- `DELIVERIES_TABLE` - DynamoDB table name
- `FIELD_MAPPINGS_TABLE` - DynamoDB table name
- `DELIVERY_LOGS_TABLE` - DynamoDB table name
- `INTEGRATION_CODE_TABLE` - DynamoDB table name
- `LEAD_FILES_BUCKET` - S3 bucket name
- `INTEGRATION_CODE_BUCKET` - S3 bucket name
- `WAREHOUSE_FILES_BUCKET` - S3 bucket name
- `USER_POOL_ID` - Cognito User Pool ID
- `USER_POOL_CLIENT_ID` - Cognito User Pool Client ID
- `BEDROCK_MODEL_ID` - Bedrock model ID
- `BEDROCK_REGION` - Bedrock region

### Optional

- `OPENSEARCH_ENDPOINT` - OpenSearch cluster endpoint
- `OPENSEARCH_USERNAME` - OpenSearch username
- `OPENSEARCH_PASSWORD` - OpenSearch password
- `OPENSEARCH_SECRET_ARN` - Secrets Manager ARN
- `NODE_ENV` - Environment (development, production)
- `PORT` - Backend port (default: 3000)
- `AWS_DYNAMODB_ENDPOINT` - For DynamoDB Local
- `AWS_ENDPOINT` - For LocalStack

## Project Structure

```
lead-delivery-system/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── app.module.ts   # Main application module
│   │   ├── customers/      # Customer management
│   │   ├── deliveries/     # Delivery management
│   │   ├── field-mappings/ # Field mapping management
│   │   ├── integration-code/# AI code generation
│   │   ├── logs/           # Delivery logs
│   │   ├── validation/     # Validation rules
│   │   ├── auth/           # Authentication
│   │   └── common/         # Shared services
│   ├── .env                # Environment variables
│   └── package.json
├── frontend/               # React frontend
├── infrastructure/         # AWS CDK infrastructure
├── lambdas/               # Lambda functions
│   └── batch-processor/   # Batch processing lambda
└── docs/                  # Documentation
```

## Next Steps

1. **Create your first customer** via API or frontend
2. **Generate integration code** using AI (Bedrock)
3. **Upload test Excel file** with leads
4. **Create delivery** and test batch processing
5. **Monitor logs** in OpenSearch Dashboards

## Development Tips

1. **Use hot reload**: Changes are automatically detected
2. **Check logs**: Monitor console output for errors
3. **Use Swagger**: API documentation at `/api`
4. **Test thoroughly**: Write tests for new features
5. **Follow conventions**: Use existing code patterns
6. **Document changes**: Update README and docs

## Production Considerations

When moving to production:

1. Use environment-specific .env files
2. Enable CORS restrictions
3. Add rate limiting
4. Enable CloudWatch monitoring
5. Set up proper IAM roles
6. Use Secrets Manager for all credentials
7. Enable VPC isolation
8. Set up CI/CD pipeline

## Support

For issues:
- Check CloudWatch Logs
- Review DynamoDB tables
- Verify AWS credentials
- Check IAM permissions
- Review this documentation

## Resources

- [NestJS Documentation](https://nestjs.com/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
