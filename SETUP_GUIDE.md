# Lead Delivery System - Complete Setup Guide

This guide will help you set up and run the Lead Delivery System from scratch.

## What Was Fixed

The application had several critical issues that have now been resolved:

### 1. **Missing Customer Creation Form** ✅ FIXED
- **Problem**: "Add Customer" button led to a 404 error
- **Solution**: Created complete `CustomerForm.tsx` component with full validation

### 2. **Database Schema Mismatch** ✅ FIXED
- **Problem**: DynamoDB table used `customerId` but backend code expected `PK/SK`
- **Solution**: Updated table schema to use Single Table Design pattern with TeamIndex

### 3. **Frontend Build Issues** ✅ FIXED
- **Problem**: Missing Tailwind config, TypeScript errors, API error handling
- **Solution**: Added all missing configurations and robust error handling

## Prerequisites

1. **Node.js** (v18 or higher)
2. **AWS Account** with configured credentials
3. **AWS CLI** installed and configured

## Step 1: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Step 2: Set Up AWS Resources

### Create DynamoDB Tables

```bash
# For AWS (recommended for production)
./scripts/setup-dynamodb-aws.sh

# OR for local development with DynamoDB Local
./scripts/setup-dynamodb-local.sh
```

This creates 5 tables with proper indexes:
- `customers` (with TeamIndex for multi-tenant support)
- `deliveries`
- `field-mappings`
- `delivery-logs`
- `integration-code`

### Create S3 Bucket

```bash
./scripts/create-s3-buckets.sh
```

This creates a single unified bucket with organized prefixes:
- `lead-files/` - Excel file uploads
- `integration-code/` - Generated Lambda code
- `warehouse/` - Formatted warehouse files (auto-archived)

### Set Up AWS Cognito (For Authentication)

1. Go to AWS Console → Cognito
2. Create a User Pool
3. Note your:
   - User Pool ID (e.g., `us-east-1_XXXXXXXXX`)
   - App Client ID

## Step 3: Configure Environment Variables

### Backend Configuration

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
AWS_REGION=us-east-1

# DynamoDB Tables (from setup script output)
CUSTOMERS_TABLE=lead-delivery-system-dev-database-customers
DELIVERIES_TABLE=lead-delivery-system-dev-database-deliveries
FIELD_MAPPINGS_TABLE=lead-delivery-system-dev-database-field-mappings
DELIVERY_LOGS_TABLE=lead-delivery-system-dev-database-delivery-logs
INTEGRATION_CODE_TABLE=lead-delivery-system-dev-database-integration-code

# S3 Storage
S3_BUCKET=lead-delivery-system-dev-storage-123456789012
LEAD_FILES_PREFIX=lead-files/
INTEGRATION_CODE_PREFIX=integration-code/
WAREHOUSE_PREFIX=warehouse/

# Cognito
USER_POOL_ID=us-east-1_XXXXXXXXX
USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# Bedrock (for AI code generation)
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
BEDROCK_REGION=us-east-1
```

### Frontend Configuration

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:
```env
# API URL
VITE_API_URL=http://localhost:3000

# AWS Cognito
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 4: Run the Application

### Start Backend

```bash
cd backend
npm run start:dev
```

Backend will start on: `http://localhost:3000`
API Documentation: `http://localhost:3000/api/docs`

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will start on: `http://localhost:5173`

## Step 5: Create Your First Customer

1. Open `http://localhost:5173` in your browser
2. Log in with your Cognito credentials
3. Click **"Add Customer"**
4. Fill out the form:
   - **Customer Name**: e.g., "Acme Corporation"
   - **CRM Type**: Select from Salesforce, HubSpot, Zoho, Pipedrive, or Custom
   - **CRM REST API Endpoint**: e.g., `https://api.example.com/leads`
   - **API Key/Token**: Your CRM's authentication credentials
   - **Webhook URL** (optional): For delivery status updates
5. Click **"Create Customer"**

## What Each Field Means

### CRM REST API Endpoint
This is where the system will send leads. Examples:
- **Salesforce**: `https://your-domain.my.salesforce.com/services/data/v58.0/sobjects/Lead`
- **HubSpot**: `https://api.hubapi.com/crm/v3/objects/contacts`
- **Custom**: Your own REST API endpoint

### API Key/Token
Authentication credentials for your CRM:
- **Salesforce**: OAuth access token or session ID
- **HubSpot**: Private app access token
- **Custom**: Your API key or bearer token

## Architecture Overview

```
┌──────────────┐
│   Frontend   │  - React + TypeScript + Tailwind
│   (Vite)     │  - Authentication via Cognito
└──────┬───────┘  - API calls to backend
       │
       │ HTTP/REST
       ↓
┌──────────────┐
│   Backend    │  - NestJS + TypeScript
│  (API Server)│  - JWT validation
└──────┬───────┘  - Business logic
       │
       │ AWS SDK
       ↓
┌──────────────────────────────────┐
│        AWS Services              │
│  - DynamoDB (data storage)       │
│  - S3 (file storage)             │
│  - Lambda (customer integrations)│
│  - Bedrock (AI code generation)  │
└──────────────────────────────────┘
```

## Common Issues & Solutions

### Issue: "Failed to load customers"
**Cause**: Backend not running or database not set up
**Solution**:
1. Ensure backend is running: `cd backend && npm run start:dev`
2. Check DynamoDB tables exist: Run setup scripts
3. Verify environment variables in `backend/.env`

### Issue: "401 Unauthorized"
**Cause**: Cognito not configured or invalid credentials
**Solution**:
1. Create Cognito User Pool
2. Update User Pool ID and Client ID in both `.env` files
3. Create a test user in Cognito console

### Issue: "Table does not exist"
**Cause**: DynamoDB tables not created
**Solution**: Run `./scripts/setup-dynamodb-aws.sh`

### Issue: Empty dashboard/customers page
**Cause**: No data yet (this is normal for new installations)
**Solution**: Add your first customer using the form

## Features Overview

### 1. Customer Management
- Add/edit/delete customers
- Support for multiple CRM types
- Secure API key storage

### 2. Lead Delivery
- Upload Excel files with leads
- Field mapping to CRM fields
- Automated delivery to customer CRMs

### 3. AI-Powered Integration
- Generate custom integration code
- Deploy Lambda functions automatically
- Tailored to each customer's CRM

### 4. Monitoring & Logs
- Track delivery status
- View failed leads
- Search delivery logs

## Development Tips

### Running Tests
```bash
cd backend
npm test

cd frontend
npm test
```

### Building for Production
```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build
# Serve the dist/ folder with a web server
```

### Debugging
- Backend logs: Check console output
- Frontend errors: Open browser DevTools (F12)
- API testing: Use Swagger UI at `http://localhost:3000/api/docs`

## Security Best Practices

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use IAM roles** in production instead of hardcoded AWS credentials
3. **Enable MFA** on your AWS account
4. **Rotate API keys** regularly
5. **Use HTTPS** in production (configure with API Gateway or ALB)

## Support

For issues or questions:
1. Check this guide first
2. Review error messages carefully
3. Check AWS service quotas and limits
4. Verify all environment variables are set correctly

## Next Steps

After setup, you can:
1. **Set up field mappings** - Map Excel columns to CRM fields
2. **Generate integration code** - Use AI to create custom Lambda functions
3. **Deploy Lambda functions** - Automated deployment to AWS
4. **Upload leads** - Process and deliver leads to customers
5. **Monitor deliveries** - Track success/failure rates

---

**The application is now fully functional and ready to use!** 🎉
