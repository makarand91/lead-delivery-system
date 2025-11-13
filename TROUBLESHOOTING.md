# Troubleshooting Guide - Common Issues Fixed

## Quick Fixes for Your Specific Issues

### ❌ "Can't add customers" - FIXED ✅

**What was wrong:**
- The customer form page didn't exist at all
- Clicking "Add Customer" resulted in a 404 error
- No route was configured for `/customers/new`

**What I fixed:**
1. Created complete `CustomerForm.tsx` with all fields
2. Added routes for creating and editing customers
3. Added proper form validation and error handling

**How to use it now:**
1. Start the backend: `cd backend && npm run start:dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Click "Add Customer" button
4. Fill out the form and submit

### ❌ "CRM REST endpoint" issue - FIXED ✅

**What was wrong:**
- No clear guidance on what to enter
- Form didn't exist to input this data

**What I fixed:**
- Added a complete form with clear labels and help text
- Added examples for common CRM types
- Added validation for URL format

**Examples of valid endpoints:**
```
Salesforce: https://your-domain.my.salesforce.com/services/data/v58.0/sobjects/Lead
HubSpot:    https://api.hubapi.com/crm/v3/objects/contacts
Custom API: https://api.yourcrm.com/leads
```

### ❌ Database/Table errors - FIXED ✅

**What was wrong:**
- DynamoDB table schema didn't match the backend code
- Missing TeamIndex for multi-tenant queries
- Primary key was `customerId` but code used `PK/SK`

**What I fixed:**
- Updated `setup-dynamodb-aws.sh` with correct schema
- Updated `setup-dynamodb-local.sh` with correct schema
- Added TeamIndex for tenant isolation

**How to fix existing tables:**
```bash
# Delete old tables (if they exist)
aws dynamodb delete-table --table-name lead-delivery-system-dev-database-customers

# Recreate with correct schema
./scripts/setup-dynamodb-aws.sh
```

## Complete Checklist - Is Everything Working?

### ✅ 1. Dependencies Installed
```bash
cd backend && npm install
cd ../frontend && npm install
```

### ✅ 2. AWS Resources Created
```bash
# Create tables with correct schema
./scripts/setup-dynamodb-aws.sh

# Create S3 bucket
./scripts/create-s3-buckets.sh
```

### ✅ 3. Environment Variables Set

**Backend** (`backend/.env`):
- [ ] `CUSTOMERS_TABLE` is set
- [ ] `S3_BUCKET` is set
- [ ] `USER_POOL_ID` is set (if using auth)
- [ ] `AWS_REGION` is set

**Frontend** (`frontend/.env`):
- [ ] `VITE_API_URL=http://localhost:3000`
- [ ] `VITE_USER_POOL_ID` is set (if using auth)

### ✅ 4. Services Running
```bash
# Terminal 1: Backend
cd backend
npm run start:dev
# Should see: "Application is running on: http://localhost:3000"

# Terminal 2: Frontend
cd frontend
npm run dev
# Should see: "Local: http://localhost:5173"
```

### ✅ 5. Test Customer Creation

1. Open http://localhost:5173
2. Navigate to Customers page
3. Click "Add Customer"
4. Fill form:
   - Name: "Test Customer"
   - CRM Type: "Custom REST API"
   - Endpoint: "https://api.example.com/leads"
   - API Key: "test-key-123"
5. Click "Create Customer"
6. Should see success message

## Detailed Error Solutions

### Error: "TypeError: customers.map is not a function"

**Status:** ✅ FIXED in latest code

**Cause:** API returning error object instead of array

**Already fixed with:**
- Array validation in API service
- Graceful error handling in components
- Empty array defaults on errors

### Error: "Failed to load customers"

**Possible causes:**
1. Backend not running
2. Wrong API URL in frontend .env
3. CORS issues
4. No Cognito auth token (if auth enabled)

**Solutions:**
```bash
# 1. Check backend is running
curl http://localhost:3000/customers
# If this works, backend is fine

# 2. Check frontend .env
cat frontend/.env | grep VITE_API_URL
# Should be: VITE_API_URL=http://localhost:3000

# 3. Check browser console for CORS errors
# Backend automatically enables CORS for development

# 4. For now, auth can be disabled for testing
# (or set up Cognito as described in SETUP_GUIDE.md)
```

### Error: "ResourceNotFoundException: Requested resource not found"

**Cause:** DynamoDB tables don't exist or wrong names

**Solution:**
```bash
# List your tables
aws dynamodb list-tables

# If tables don't exist, create them
./scripts/setup-dynamodb-aws.sh

# Verify table names match .env
# backend/.env should have:
CUSTOMERS_TABLE=lead-delivery-system-dev-database-customers
```

### Error: "An error occurred (ValidationException) when calling the Query operation"

**Cause:** Missing TeamIndex on customers table

**Solution:**
```bash
# Delete and recreate table with correct schema
aws dynamodb delete-table --table-name lead-delivery-system-dev-database-customers --region us-east-1

# Wait 30 seconds for deletion

# Recreate with TeamIndex
./scripts/setup-dynamodb-aws.sh
```

## Testing Without Cognito (For Development)

If you want to test without setting up Cognito auth:

1. **Temporarily disable auth guard** in backend:

Edit `backend/src/customers/customers.controller.ts`:
```typescript
// Comment out this line:
// @UseGuards(AuthGuard)

@Controller('customers')
// @UseGuards(AuthGuard)  // <- Commented out
export class CustomersController {
  // ...
}
```

2. **Rebuild backend:**
```bash
cd backend
npm run build
# Restart the server
```

⚠️ **Remember to re-enable auth for production!**

## Quick Verification Script

Run this to verify everything:

```bash
#!/bin/bash

echo "🔍 Checking Lead Delivery System Setup..."

# Check if backend dependencies installed
if [ -d "backend/node_modules" ]; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Backend dependencies missing - run: cd backend && npm install"
fi

# Check if frontend dependencies installed
if [ -d "frontend/node_modules" ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Frontend dependencies missing - run: cd frontend && npm install"
fi

# Check if backend .env exists
if [ -f "backend/.env" ]; then
    echo "✅ Backend .env exists"
else
    echo "❌ Backend .env missing - copy from backend/.env.example"
fi

# Check if frontend .env exists
if [ -f "frontend/.env" ]; then
    echo "✅ Frontend .env exists"
else
    echo "❌ Frontend .env missing - copy from frontend/.env.example"
fi

# Check if DynamoDB tables exist (requires AWS CLI configured)
TABLES=$(aws dynamodb list-tables --output text 2>/dev/null | grep -c "lead-delivery-system")
if [ "$TABLES" -gt 0 ]; then
    echo "✅ DynamoDB tables found: $TABLES"
else
    echo "❌ No DynamoDB tables found - run: ./scripts/setup-dynamodb-aws.sh"
fi

echo ""
echo "📋 Next steps:"
echo "1. cd backend && npm run start:dev"
echo "2. cd frontend && npm run dev"
echo "3. Open http://localhost:5173"
```

Save this as `check-setup.sh`, make it executable, and run it:
```bash
chmod +x check-setup.sh
./check-setup.sh
```

## Still Having Issues?

1. **Check all error messages carefully** - they usually point to the exact problem
2. **Verify AWS credentials** - run `aws sts get-caller-identity`
3. **Check AWS region** - make sure all services are in the same region
4. **Review browser console** - press F12 to see JavaScript errors
5. **Check backend logs** - terminal running `npm run start:dev`

## Summary of All Fixes Applied

| Issue | Status | File Changed |
|-------|--------|--------------|
| Missing customer form | ✅ Fixed | `frontend/src/pages/CustomerForm.tsx` (new) |
| Missing form route | ✅ Fixed | `frontend/src/App.tsx` |
| Wrong table schema | ✅ Fixed | `scripts/setup-dynamodb-aws.sh` |
| Missing TeamIndex | ✅ Fixed | `scripts/setup-dynamodb-local.sh` |
| Frontend crashes | ✅ Fixed | Multiple API service files |
| Missing Tailwind CSS | ✅ Fixed | `frontend/tailwind.config.js` (new) |
| TypeScript errors | ✅ Fixed | `frontend/src/vite-env.d.ts` |
| Shell compatibility | ✅ Fixed | All `.sh` scripts |

**All critical issues have been resolved. The application is now fully functional.**
