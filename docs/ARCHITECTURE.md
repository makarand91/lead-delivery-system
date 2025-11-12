# System Architecture

## Overview

The Lead Delivery System is a serverless, event-driven application built on AWS that enables automated lead delivery to customer CRM systems with AI-generated integration code.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │Dashboard │  │Customers │  │Deliveries│  │  Logs    │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└───────┼─────────────┼─────────────┼──────────────┼──────────────┘
        │             │             │              │
        └─────────────┴─────────────┴──────────────┘
                            │
                            ▼
        ┌────────────────────────────────────────┐
        │         API Gateway (REST)             │
        │        Cognito Authorizer              │
        └──────────────────┬─────────────────────┘
                           │
                           ▼
        ┌────────────────────────────────────────┐
        │       NestJS Backend (Lambda)          │
        │  ┌──────────┐  ┌──────────┐           │
        │  │Customers │  │Deliveries│           │
        │  │ Service  │  │ Service  │           │
        │  └────┬─────┘  └────┬─────┘           │
        │       │             │                  │
        │  ┌────┴─────────────┴─────┐           │
        │  │  AI Generator Service   │           │
        │  │  (AWS Bedrock)          │           │
        │  └────┬────────────────────┘           │
        │       │                                 │
        │  ┌────┴─────────────────────┐          │
        │  │ Lambda Deployer Service  │          │
        │  └──────────────────────────┘          │
        └──────────────────┬─────────────────────┘
                           │
        ┌──────────────────┴─────────────────────┐
        │                                        │
        ▼                                        ▼
┌───────────────────┐                   ┌───────────────────┐
│   DynamoDB        │                   │   S3 Buckets      │
│                   │                   │                   │
│ • Customers       │                   │ • Lead Files      │
│ • Deliveries      │                   │ • Integration     │
│ • Field Mappings  │                   │   Code            │
│ • Delivery Logs   │                   └───────────────────┘
│ • Integration     │
│   Code History    │
└───────────────────┘
        │
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│              EventBridge (Scheduled Rules)                   │
│                  Triggers: Hourly/Daily                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │   Batch Processor Lambda             │
        │                                      │
        │   1. Query PENDING deliveries        │
        │   2. Parse Excel from S3             │
        │   3. Get customer Lambda ARN         │
        │   4. Get field mappings              │
        │   5. Invoke customer Lambda          │
        │   6. Save logs to DynamoDB + ES      │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │  Customer Lambda (Per Customer)      │
        │                                      │
        │  • AI-Generated Code                 │
        │  • Apply field mappings              │
        │  • Transform data                    │
        │  • Push to Customer CRM              │
        │  • Return success/failure per lead   │
        └──────────────────┬───────────────────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │  Customer CRM    │
                 │                  │
                 │  • Salesforce    │
                 │  • HubSpot       │
                 │  • Pipedrive     │
                 │  • Custom APIs   │
                 └──────────────────┘

        ┌──────────────────────────────────────┐
        │     ElasticSearch Domain             │
        │  • Log indexing                      │
        │  • Search and analytics              │
        │  • Kibana dashboards                 │
        └──────────────────────────────────────┘
```

## Components

### Frontend (React + Tailwind CSS)

**Technology:** React 18, Vite, Tailwind CSS, AWS Amplify

**Responsibilities:**
- User authentication via Cognito
- Customer onboarding interface
- AI code generation UI
- Delivery creation and management
- Field mapping (drag & drop)
- Transformation configuration
- Delivery logs visualization

**Key Features:**
- Responsive design
- Real-time updates
- File upload (drag & drop)
- Code editor for reviewing AI-generated code

### Backend API (NestJS)

**Technology:** NestJS, Node.js 20, TypeScript

**Modules:**
- **Auth Module:** Cognito JWT verification
- **Customers Module:** CRUD operations for customers
- **Deliveries Module:** Delivery management, file upload pre-signed URLs
- **Mappings Module:** Field mapping configuration
- **AI Generator Module:** AWS Bedrock integration for code generation
- **Lambda Deployer Module:** Automated Lambda deployment
- **Excel Parser Module:** Parse uploaded Excel files
- **Transformations Module:** Built-in transformation functions
- **Logs Module:** Delivery log retrieval and search

**Deployment:** AWS Lambda (via API Gateway)

### Infrastructure (AWS CDK)

**Stacks:**
1. **Database Stack:** DynamoDB tables
2. **Storage Stack:** S3 buckets
3. **Auth Stack:** Cognito User Pool, Identity Pool
4. **Monitoring Stack:** ElasticSearch domain
5. **Lambda Stack:** API Lambda, Batch Processor
6. **API Stack:** API Gateway with Cognito authorizer

### Data Model

#### Customers Table
```
PK: CUSTOMER#{customerId}
SK: METADATA
Attributes:
  - customerId (UUID)
  - name
  - crmType (Salesforce | HubSpot | Pipedrive | Custom)
  - crmEndpoint (URL)
  - lambdaArn (deployed Lambda)
  - credentials (encrypted)
  - customContext (JSON)
  - createdAt, updatedAt

Indexes:
  - TeamIndex: (teamId, createdAt)
```

#### Deliveries Table
```
PK: DELIVERY#{deliveryId}
SK: METADATA
Attributes:
  - deliveryId (UUID)
  - customerId
  - s3FileKey (Excel file location)
  - mappingId (optional)
  - status (PENDING | PROCESSING | COMPLETED | FAILED)
  - totalLeads
  - successCount
  - failedCount
  - scheduledAt
  - processedAt
  - createdAt, createdBy

Indexes:
  - CustomerIndex: (customerId, createdAt)
  - StatusIndex: (status, scheduledAt)
```

#### Field Mappings Table
```
PK: CUSTOMER#{customerId}
SK: MAPPING#{mappingId}
Attributes:
  - mappingId (UUID)
  - name
  - fieldMappings: [
      {
        sourceField: string,
        targetField: string,
        transformation: string,
        transformationParams: any
      }
    ]
  - isDefault (boolean)
  - createdAt, updatedAt
```

#### Delivery Logs Table
```
PK: DELIVERY#{deliveryId}
SK: LEAD#{leadIndex}
Attributes:
  - leadIndex (number)
  - leadData (JSON)
  - status (SUCCESS | FAILED)
  - errorMessage
  - crmId (from CRM)
  - retryCount
  - processedAt
  - ttl (90 days)

Indexes:
  - StatusIndex: (status, processedAt)
```

## Key Workflows

### 1. Customer Onboarding

```
User → Create Customer
  ↓
API → Save to DynamoDB
  ↓
User → Generate Integration Code (AI)
  ↓
API → AWS Bedrock (Claude)
  ↓
API → Return Generated Code
  ↓
User → Review & Deploy
  ↓
API → Create Lambda Function
  ↓
API → Update Customer with Lambda ARN
```

### 2. Delivery Creation

```
User → Upload Excel File
  ↓
API → Generate S3 Pre-signed URL
  ↓
Frontend → Upload to S3
  ↓
User → Configure Field Mappings
  ↓
User → Schedule Delivery
  ↓
API → Create Delivery Record (PENDING)
```

### 3. Batch Processing

```
EventBridge (Scheduled) → Trigger Batch Processor
  ↓
Batch Processor → Query PENDING Deliveries
  ↓
For each Delivery:
  ↓
  1. Get Customer Details (Lambda ARN, Credentials)
  ↓
  2. Parse Excel File from S3
  ↓
  3. Get Field Mappings
  ↓
  4. Invoke Customer Lambda
     Input: {
       leads: [...],
       fieldMappings: {...},
       credentials: {...},
       customContext: {...}
     }
  ↓
  5. Customer Lambda:
     - Apply transformations
     - Push to CRM
     - Return results
  ↓
  6. Save Logs (DynamoDB + ElasticSearch)
  ↓
  7. Update Delivery Status
```

### 4. AI Code Generation

```
User → Provide CRM Details
  ↓
API → Build Prompt with Context
  ↓
Bedrock (Claude 3.5 Sonnet) → Generate Lambda Code
  ↓
API → Extract Code from Response
  ↓
API → Return to User
  ↓
User → Review & Deploy
  ↓
API → Package Code (with dependencies)
  ↓
Lambda → CreateFunction or UpdateFunctionCode
  ↓
API → Return Lambda ARN
  ↓
API → Update Customer Record
```

## Security Architecture

### Authentication & Authorization

- **Cognito User Pool:** User authentication
- **JWT Tokens:** API authentication
- **Cognito Groups:** Role-based access (Admins, Members)
- **API Gateway Authorizer:** Token verification

### Data Security

- **Encryption at Rest:**
  - DynamoDB: AWS-managed encryption
  - S3: Server-side encryption (SSE-S3)
  - ElasticSearch: Encryption enabled

- **Encryption in Transit:**
  - HTTPS only (enforced via S3 bucket policies)
  - TLS 1.2+ for all connections

- **Secrets Management:**
  - Customer credentials stored encrypted in DynamoDB
  - IAM roles for Lambda permissions (no hardcoded credentials)

### Network Security

- **VPC Integration:** (Optional) Lambda functions can run in VPC
- **Security Groups:** ElasticSearch access restricted
- **API Gateway:** Throttling and rate limiting enabled

## Scalability

### Horizontal Scaling

- **Lambda:** Auto-scales to concurrent requests
- **DynamoDB:** On-demand pricing, auto-scales
- **S3:** Unlimited storage
- **API Gateway:** Scales automatically

### Performance Optimizations

- **DynamoDB GSIs:** Fast queries by customer, status, team
- **S3 Pre-signed URLs:** Direct file uploads (bypass API)
- **Lambda Concurrency:** Configurable per function
- **ElasticSearch:** Indexed logs for fast search

### Batch Processing

- **Concurrent Deliveries:** Configurable (default: 10)
- **Per-customer Lambda:** Isolated execution
- **Retry Logic:** Exponential backoff (3 attempts)

## Monitoring & Observability

### CloudWatch

- **Lambda Metrics:** Invocations, errors, duration
- **API Gateway Metrics:** Requests, latency, errors
- **DynamoDB Metrics:** Read/write capacity, throttles
- **Custom Metrics:** Delivery success rates, lead processing times

### Logs

- **Structured Logging:** JSON format
- **Log Retention:** 7 days (configurable)
- **Log Aggregation:** ElasticSearch + Kibana

### Alarms

- **High Error Rate:** Lambda errors > threshold
- **DynamoDB Throttling:** Read/write throttles detected
- **Batch Processor Failures:** EventBridge failures

## Cost Optimization

- **On-Demand Pricing:** DynamoDB and Lambda (pay for usage)
- **S3 Lifecycle Policies:** Delete old files (90 days)
- **DynamoDB TTL:** Auto-delete logs (90 days)
- **Lambda Memory Optimization:** Right-sized memory (1024 MB)
- **API Gateway Caching:** (Optional) Reduce backend calls

## Disaster Recovery

### Backup Strategy

- **DynamoDB:** Point-in-time recovery enabled
- **S3:** Versioning enabled
- **Infrastructure as Code:** CDK for reproducible deployments

### Recovery Time Objective (RTO)

- **Database:** < 1 hour (restore from backup)
- **Infrastructure:** < 30 minutes (redeploy CDK)
- **Application:** < 10 minutes (Lambda auto-deploys)

## Future Enhancements

1. **WebSocket Support:** Real-time delivery status updates
2. **Multi-Region:** Active-active deployment
3. **GraphQL API:** Alternative to REST
4. **Webhooks:** Customer-configurable delivery notifications
5. **Advanced Analytics:** ML-powered insights
6. **Mobile App:** iOS/Android native apps
7. **Scheduled Reports:** Email summaries
8. **Audit Trail:** Complete change history
