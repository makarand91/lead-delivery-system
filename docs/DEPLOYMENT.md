# Deployment Guide

This guide will walk you through deploying the Lead Delivery System to AWS.

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Node.js 20+** installed
4. **AWS CDK** installed globally: `npm install -g aws-cdk`
5. **Existing VPC** and **ECS Fargate Cluster** (as specified in requirements)

## Step 1: Clone and Install Dependencies

```bash
git clone <repository-url>
cd lead-delivery-system
npm run install:all
```

## Step 2: Configure Environment Variables

### Infrastructure Configuration

1. Copy the example environment file:
```bash
cd infrastructure
cp .env.example .env
```

2. Edit `.env` with your AWS details:
```bash
# AWS Configuration
AWS_ACCOUNT_ID=123456789012
AWS_REGION=us-east-1

# Existing Infrastructure
EXISTING_VPC_ID=vpc-xxxxxxxxxxxxx
EXISTING_FARGATE_CLUSTER_NAME=my-fargate-cluster

# Application Configuration
APP_NAME=lead-delivery-system
ENVIRONMENT=dev

# Cognito Configuration (Existing User Pool)
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx  # Optional

# OpenSearch Configuration (Existing with Basic Auth)
OPENSEARCH_ENDPOINT=https://search-xxx.us-east-1.es.amazonaws.com
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=YourSecurePassword123!
```

### Backend Configuration

1. Copy backend environment file:
```bash
cd ../backend
cp .env.example .env
```

2. The backend `.env` will be auto-populated after infrastructure deployment.

### Frontend Configuration

```bash
cd ../frontend
cp .env.example .env
```

Frontend configuration will be updated after infrastructure deployment.

## Step 3: Bootstrap CDK (First Time Only)

```bash
cd infrastructure
cdk bootstrap aws://<AWS_ACCOUNT_ID>/<AWS_REGION>
```

## Step 4: Deploy Infrastructure

Deploy all infrastructure stacks:

```bash
cd infrastructure
npm run cdk:deploy
```

This will create:
- DynamoDB tables (Customers, Deliveries, Mappings, Logs, Integration Code)
- S3 buckets (Lead files, Integration code, Warehouse files)
- Cognito configuration (using existing User Pool)
- Lambda functions (API, Batch Processor)
- API Gateway
- OpenSearch configuration (using existing cluster with basic auth)
- Secrets Manager secret for OpenSearch credentials
- EventBridge rules

**Note:** Save the CloudFormation outputs - you'll need them for configuration.

## Step 5: Configure Backend

After infrastructure deployment, update `backend/.env` with the outputs:

```bash
AWS_REGION=us-east-1

# DynamoDB Tables (from CloudFormation outputs)
CUSTOMERS_TABLE=lead-delivery-system-dev-database-customers
DELIVERIES_TABLE=lead-delivery-system-dev-database-deliveries
FIELD_MAPPINGS_TABLE=lead-delivery-system-dev-database-field-mappings
DELIVERY_LOGS_TABLE=lead-delivery-system-dev-database-delivery-logs
INTEGRATION_CODE_TABLE=lead-delivery-system-dev-database-integration-code

# S3 Buckets
LEAD_FILES_BUCKET=lead-delivery-system-dev-storage-lead-files-123456789012
INTEGRATION_CODE_BUCKET=lead-delivery-system-dev-storage-integration-code-123456789012
WAREHOUSE_FILES_BUCKET=lead-delivery-system-dev-storage-warehouse-files-123456789012

# Cognito
USER_POOL_ID=us-east-1_XXXXXXXXX
USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# OpenSearch (with basic authentication)
OPENSEARCH_ENDPOINT=https://search-xxx.us-east-1.es.amazonaws.com
# Credentials will be stored in Secrets Manager automatically by CDK
# For local development, you can use environment variables:
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=YourSecurePassword123!
OPENSEARCH_SECRET_ARN=arn:aws:secretsmanager:us-east-1:123456789012:secret:opensearch-credentials

# Lambda
CUSTOMER_LAMBDA_ROLE_ARN=arn:aws:iam::123456789012:role/customer-lambda-role

# Bedrock
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
BEDROCK_REGION=us-east-1
```

## Step 6: Build and Test Backend Locally (Optional)

```bash
cd backend
npm run build
npm run start:dev
```

Test the API at `http://localhost:3000/health`

## Step 7: Configure Frontend

Update `frontend/.env` with infrastructure outputs:

```bash
# API Configuration
VITE_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/v1

# AWS Cognito Configuration
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_IDENTITY_POOL_ID=us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Cognito Domain
VITE_COGNITO_DOMAIN=https://lead-delivery-dev.auth.us-east-1.amazoncognito.com
```

## Step 8: Build and Deploy Frontend

### Option A: Deploy to S3 + CloudFront

```bash
cd frontend
npm run build

# Upload to S3 bucket
aws s3 sync dist/ s3://your-frontend-bucket --delete
```

### Option B: Run Locally for Testing

```bash
cd frontend
npm run dev
```

Access at `http://localhost:3000`

## Step 9: Create Initial User

Since self-sign-up is disabled, create your first admin user:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username admin \
  --user-attributes Name=email,Value=admin@example.com \
  --temporary-password TempPassword123! \
  --message-action SUPPRESS

# Add to Admins group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username admin \
  --group-name Admins
```

## Step 10: Configure Bedrock Access

Enable AWS Bedrock access for your account:

1. Go to AWS Bedrock console
2. Navigate to "Model access"
3. Enable access to **Claude 3.5 Sonnet**
4. Wait for approval (usually instant)

## Step 11: Verify Deployment

### Check Infrastructure

```bash
# Check DynamoDB tables
aws dynamodb list-tables

# Check S3 buckets
aws s3 ls

# Check Lambda functions
aws lambda list-functions

# Check API Gateway
aws apigateway get-rest-apis
```

### Test API Health

```bash
curl https://your-api-id.execute-api.us-east-1.amazonaws.com/v1/health
```

### Test Frontend Login

1. Navigate to your frontend URL
2. Login with the created admin user
3. Change temporary password
4. Verify dashboard loads

## Step 12: Configure Batch Processing Schedule

The batch processor runs on a schedule (default: hourly). To modify:

1. Edit `infrastructure/.env`:
```bash
BATCH_SCHEDULE=cron(0 * * * ? *)  # Every hour
```

2. Redeploy infrastructure:
```bash
cd infrastructure
npm run cdk:deploy
```

## Monitoring and Logs

### CloudWatch Logs

View logs for:
- API Lambda: `/aws/lambda/lead-delivery-system-dev-lambda-api`
- Batch Processor: `/aws/lambda/lead-delivery-system-dev-lambda-batch-processor`
- Customer Lambdas: `/aws/lambda/customer-integration-{customerId}`

### DynamoDB Tables

Monitor table metrics in CloudWatch:
- Read/Write capacity
- Throttled requests
- Table size

### OpenSearch

Access OpenSearch Dashboards for log visualization:
```
https://search-xxx.us-east-1.es.amazonaws.com/_dashboards
```

Login with your OpenSearch credentials (stored in Secrets Manager).

## Troubleshooting

### Issue: CDK Deploy Fails

**Solution:**
- Verify AWS credentials: `aws sts get-caller-identity`
- Check VPC ID exists: `aws ec2 describe-vpcs --vpc-ids vpc-xxxxx`
- Ensure IAM permissions for CDK

### Issue: Cognito Login Fails

**Solution:**
- Verify User Pool ID and Client ID in frontend `.env`
- Check CORS configuration in API Gateway
- Verify user exists: `aws cognito-idp list-users --user-pool-id xxx`

### Issue: Bedrock Code Generation Fails

**Solution:**
- Verify Bedrock model access is enabled
- Check IAM permissions for Bedrock
- Verify model ID is correct

### Issue: Batch Processor Not Running

**Solution:**
- Check EventBridge rule status
- Verify Lambda has correct environment variables
- Check CloudWatch Logs for errors

### Issue: Customer Lambda Deployment Fails

**Solution:**
- Verify IAM role exists: `CUSTOMER_LAMBDA_ROLE_ARN`
- Check Lambda permissions
- Verify generated code is valid JavaScript

## Updating the Application

### Update Infrastructure

```bash
cd infrastructure
npm run cdk:diff  # Preview changes
npm run cdk:deploy
```

### Update Backend

Since backend runs on Lambda, redeploy infrastructure after code changes:
```bash
cd backend
npm run build
cd ../infrastructure
npm run cdk:deploy
```

### Update Frontend

```bash
cd frontend
npm run build
aws s3 sync dist/ s3://your-frontend-bucket --delete
# Invalidate CloudFront cache if using CloudFront
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
```

## Clean Up

To remove all resources:

```bash
cd infrastructure
npm run cdk:destroy
```

**Warning:** This will delete all data including DynamoDB tables and S3 buckets (if not retained).

## Cost Estimation

Approximate monthly costs (us-east-1):

- **DynamoDB (Pay per request):** $1-10 depending on usage
- **S3:** $0.023/GB + requests
- **Lambda:** First 1M requests free, then $0.20/1M
- **API Gateway:** $3.50/million requests
- **Cognito:** First 50,000 MAU free
- **OpenSearch:** Using existing cluster (costs depend on your setup)
- **Secrets Manager:** $0.40/secret/month
- **Bedrock:** ~$3-15/1M tokens (Claude 3.5 Sonnet)

**Total estimated cost:** $50-100/month for moderate usage

## Security Best Practices

1. **Enable MFA** for Cognito users
2. **Restrict API Gateway** to specific IP ranges if needed
3. **Use Secrets Manager** for sensitive credentials (not environment variables)
4. **Enable CloudTrail** for audit logging
5. **Regular security updates** for dependencies
6. **VPC isolation** for sensitive operations
7. **Encrypt data at rest** (enabled by default)

## Support

For issues or questions:
- Check CloudWatch Logs
- Review DynamoDB tables for data consistency
- Verify environment variables are correct
- Check IAM permissions

## Next Steps

1. Create your first customer
2. Generate integration code using AI
3. Deploy customer Lambda
4. Upload a test Excel file
5. Create a delivery
6. Monitor batch processing logs
