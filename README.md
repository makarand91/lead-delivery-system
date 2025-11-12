# Lead Delivery System

A scalable lead delivery system that allows onboarding customers with their own CRM systems, creating deliveries with Excel lead files, and pushing leads to customer CRMs with AI-generated integration code.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React + Tailwind)                                     │
│  - Customer Onboarding                                          │
│  - Delivery Management                                          │
│  - Field Mapping UI (Drag & Drop)                              │
│  - AI Code Generator                                            │
│  - Delivery Logs Dashboard                                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Backend API (NestJS + Node.js)                                 │
│  - REST API                                                     │
│  - Cognito Authentication                                       │
│  - Excel File Processing                                        │
│  - AWS Bedrock Integration (AI Code Generation)                │
│  - Lambda Deployment Automation                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  AWS Infrastructure                                              │
│  - DynamoDB: Customers, Deliveries, Mappings, Logs             │
│  - S3: Excel files, Generated code                             │
│  - Lambda: API, Batch Processor, Customer Integrations         │
│  - EventBridge: Batch scheduling                               │
│  - ElasticSearch: Log search & analytics                       │
│  - Cognito: SSO Authentication                                 │
│  - API Gateway: REST endpoints                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### 1. Customer Onboarding
- Register customer CRM details
- Configure API endpoints and authentication
- Generate integration code using AI (AWS Bedrock)
- Deploy customer-specific Lambda functions
- Store encrypted tokens and credentials

### 2. Delivery Management
- Create deliveries for customers
- Upload Excel files with leads (100-200 leads per file)
- Map source fields to CRM fields via drag & drop
- Apply transformation functions (date formatting, phone formatting, custom JS)
- Schedule batch processing (hourly, daily)

### 3. Field Mapping & Transformations
- Drag-and-drop field mapping UI
- Built-in transformations:
  - Date formatting
  - String concatenation/splitting
  - Phone number formatting
  - Custom JavaScript functions
- Preview transformations before delivery

### 4. Batch Processing
- EventBridge-triggered batch processor
- Invokes customer-specific Lambda functions
- Passes leads, mappings, and credentials securely
- Handles retries with manual intervention

### 5. Delivery Logs
- Track delivery status per lead
- ElasticSearch integration for log search
- Failed delivery alerts
- Retry mechanism for failed leads

### 6. Team Management
- Single team organization
- Team members share access to customers and deliveries
- Cognito-based authentication with SSO

## Project Structure

```
lead-delivery-system/
├── infrastructure/          # CDK infrastructure code
│   ├── bin/
│   ├── lib/
│   │   ├── api-stack.ts
│   │   ├── database-stack.ts
│   │   ├── storage-stack.ts
│   │   ├── auth-stack.ts
│   │   ├── lambda-stack.ts
│   │   └── monitoring-stack.ts
│   └── cdk.json
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── auth/           # Cognito authentication
│   │   ├── customers/      # Customer management
│   │   ├── deliveries/     # Delivery management
│   │   ├── mappings/       # Field mappings
│   │   ├── ai-generator/   # Bedrock code generation
│   │   ├── lambda-deployer/# Lambda deployment
│   │   ├── excel-parser/   # Excel file processing
│   │   └── logs/           # Delivery logs
│   └── package.json
├── frontend/                # React + Tailwind
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── services/
│   └── package.json
├── lambdas/                 # Lambda functions
│   ├── batch-processor/    # Scheduled batch processor
│   └── customer-template/  # Template for customer Lambdas
└── docs/                    # Documentation
    ├── ARCHITECTURE.md
    ├── API.md
    └── DEPLOYMENT.md
```

## Tech Stack

### Frontend
- **React 18** - UI framework
- **Tailwind CSS** - Styling
- **React DnD** - Drag and drop
- **AWS Amplify** - Cognito integration
- **Axios** - HTTP client

### Backend
- **Node.js 20** - Runtime
- **NestJS** - Framework
- **TypeScript** - Language
- **AWS SDK v3** - AWS services
- **xlsx** - Excel parsing

### Infrastructure
- **AWS CDK** - Infrastructure as code
- **DynamoDB** - NoSQL database
- **S3** - Object storage
- **Lambda** - Serverless compute
- **API Gateway** - REST API
- **Cognito** - Authentication
- **EventBridge** - Scheduling
- **ElasticSearch** - Log search
- **Bedrock** - AI code generation

## Database Schema

### DynamoDB Tables

#### 1. Customers
```
PK: CUSTOMER#{customerId}
SK: METADATA
Attributes:
- customerId
- name
- crmType (Salesforce, HubSpot, Custom)
- crmEndpoint
- lambdaArn (deployed Lambda ARN)
- credentials (encrypted)
- customContext (headers, etc)
- createdAt
- updatedAt
```

#### 2. Deliveries
```
PK: DELIVERY#{deliveryId}
SK: METADATA
Attributes:
- deliveryId
- customerId
- s3FileKey
- status (PENDING, PROCESSING, COMPLETED, FAILED)
- totalLeads
- successCount
- failedCount
- scheduledAt
- processedAt
- createdAt
```

#### 3. FieldMappings
```
PK: CUSTOMER#{customerId}
SK: MAPPING#{mappingId}
Attributes:
- mappingId
- name
- sourceFields []
- targetFields []
- transformations []
- isDefault
```

#### 4. DeliveryLogs
```
PK: DELIVERY#{deliveryId}
SK: LEAD#{leadIndex}
Attributes:
- leadData
- status (SUCCESS, FAILED)
- errorMessage
- retryCount
- processedAt
```

## Getting Started

### Prerequisites
- Node.js 20+
- AWS CLI configured
- AWS CDK installed
- Existing VPC and Fargate cluster

### Installation

1. **Clone repository**
```bash
git clone <repo-url>
cd lead-delivery-system
```

2. **Install dependencies**
```bash
# Infrastructure
cd infrastructure
npm install

# Backend
cd ../backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Configure environment**
```bash
# infrastructure/.env
EXISTING_VPC_ID=vpc-xxxxx
EXISTING_FARGATE_CLUSTER=cluster-name
AWS_REGION=us-east-1

# backend/.env
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
```

4. **Deploy infrastructure**
```bash
cd infrastructure
npm run cdk:deploy
```

5. **Deploy backend**
```bash
cd ../backend
npm run build
npm run deploy
```

6. **Run frontend locally**
```bash
cd ../frontend
npm run dev
```

## Usage

### 1. Onboard Customer
1. Navigate to "Customers" page
2. Click "Add Customer"
3. Fill in CRM details (name, type, endpoint, auth)
4. Click "Generate Integration Code" (AI-powered)
5. Review and deploy Lambda function

### 2. Create Delivery
1. Navigate to "Deliveries" page
2. Select customer
3. Upload Excel file with leads
4. Map fields using drag & drop
5. Apply transformations if needed
6. Schedule batch time
7. Submit delivery

### 3. Monitor Deliveries
1. Navigate to "Delivery Logs"
2. View real-time status
3. Search logs using ElasticSearch
4. Retry failed leads manually

## API Endpoints

See [API Documentation](docs/API.md) for detailed API reference.

## Deployment

See [Deployment Guide](docs/DEPLOYMENT.md) for production deployment instructions.

## Security

- Cognito SSO authentication
- Encrypted credentials in DynamoDB
- IAM roles with least privilege
- API Gateway authorization
- VPC isolation for sensitive operations

## License

MIT
