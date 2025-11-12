# API Documentation

Base URL: `https://your-api-id.execute-api.us-east-1.amazonaws.com/v1`

All endpoints require authentication via AWS Cognito JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Health Check

### GET /health
Check API health status (no auth required)

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "service": "lead-delivery-system"
}
```

## Customers

### GET /customers
Get all customers for the authenticated user's team

**Response:**
```json
[
  {
    "customerId": "uuid",
    "name": "Acme Corp",
    "crmType": "Salesforce",
    "crmEndpoint": "https://acme.my.salesforce.com",
    "lambdaArn": "arn:aws:lambda:...",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
]
```

### GET /customers/:id
Get specific customer by ID

### POST /customers
Create a new customer

**Request Body:**
```json
{
  "name": "Acme Corp",
  "crmType": "Salesforce",
  "crmEndpoint": "https://acme.my.salesforce.com",
  "credentials": {
    "apiKey": "...",
    "apiSecret": "..."
  },
  "customContext": {
    "headers": {
      "X-Custom-Header": "value"
    }
  }
}
```

### PUT /customers/:id
Update customer

### DELETE /customers/:id
Delete customer

## AI Generator

### POST /ai-generator/integration-code
Generate CRM integration code using AI

**Request Body:**
```json
{
  "crmType": "Salesforce",
  "crmEndpoint": "https://acme.my.salesforce.com",
  "authMethod": "Bearer Token",
  "customRequirements": "Also validate email addresses"
}
```

**Response:**
```json
{
  "code": "// Generated Lambda function code..."
}
```

### POST /ai-generator/transformation-function
Generate custom transformation function

**Request Body:**
```json
{
  "description": "Convert phone number from (XXX) XXX-XXXX to +1XXXXXXXXXX"
}
```

## Lambda Deployer

### POST /lambda-deployer/deploy
Deploy customer Lambda function

**Request Body:**
```json
{
  "customerId": "uuid",
  "code": "// Lambda function code...",
  "functionName": "customer-integration-acme" // optional
}
```

**Response:**
```json
{
  "lambdaArn": "arn:aws:lambda:us-east-1:123456789012:function:...",
  "functionName": "customer-integration-acme",
  "message": "Lambda function deployed successfully"
}
```

## Deliveries

### GET /deliveries
Get deliveries (with optional filters)

**Query Parameters:**
- `customerId`: Filter by customer
- `status`: Filter by status (PENDING, PROCESSING, COMPLETED, FAILED)

### GET /deliveries/:id
Get specific delivery

### POST /deliveries
Create a new delivery

**Request Body:**
```json
{
  "customerId": "uuid",
  "s3FileKey": "customers/uuid/leads/file.xlsx",
  "mappingId": "uuid", // optional
  "scheduledAt": "2025-01-15T14:00:00.000Z" // optional, defaults to now
}
```

### POST /deliveries/upload-url
Get pre-signed URL for file upload

**Request Body:**
```json
{
  "filename": "leads.xlsx",
  "customerId": "uuid"
}
```

**Response:**
```json
{
  "uploadUrl": "https://s3.amazonaws.com/...",
  "s3Key": "customers/uuid/leads/1234567890-leads.xlsx"
}
```

## Mappings

### GET /mappings?customerId=uuid
Get all field mappings for a customer

### GET /mappings/:mappingId?customerId=uuid
Get specific mapping

### POST /mappings
Create field mapping

**Request Body:**
```json
{
  "customerId": "uuid",
  "name": "Default Mapping",
  "isDefault": true,
  "fieldMappings": [
    {
      "sourceField": "First Name",
      "targetField": "firstName",
      "transformation": "trim"
    },
    {
      "sourceField": "Phone",
      "targetField": "phone",
      "transformation": "formatPhoneE164",
      "transformationParams": {
        "countryCode": "1"
      }
    }
  ]
}
```

### PUT /mappings/:mappingId?customerId=uuid
Update mapping

### DELETE /mappings/:mappingId?customerId=uuid
Delete mapping

## Transformations

### GET /transformations
Get all built-in transformation functions

**Response:**
```json
{
  "transformations": [
    {
      "name": "formatDate",
      "description": "Format date to ISO 8601 (YYYY-MM-DD)",
      "category": "date"
    },
    {
      "name": "formatPhoneUS",
      "description": "Format phone number to US format (XXX) XXX-XXXX",
      "category": "phone"
    }
  ]
}
```

### POST /transformations/apply
Test transformation on a value

**Request Body:**
```json
{
  "transformationName": "formatPhoneUS",
  "value": "1234567890"
}
```

**Response:**
```json
{
  "original": "1234567890",
  "transformed": "(123) 456-7890"
}
```

### POST /transformations/validate
Validate custom transformation code

**Request Body:**
```json
{
  "code": "return value.toUpperCase();"
}
```

**Response:**
```json
{
  "valid": true
}
```

## Logs

### GET /logs/delivery/:deliveryId
Get all logs for a delivery

### GET /logs/delivery/:deliveryId/failed
Get only failed leads for a delivery

### GET /logs/search?q=error
Search logs using ElasticSearch

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

**Status Codes:**
- `400` Bad Request
- `401` Unauthorized
- `403` Forbidden
- `404` Not Found
- `500` Internal Server Error
