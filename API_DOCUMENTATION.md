# GPCL Finance Service - API Documentation

**Version:** 1.0  
**Last Updated:** September 3, 2026  
**Base URL:** `http://localhost:3006/api/v1`  
**Authentication:** JWT Bearer Token

---

## Table of Contents

1. [Authentication](#authentication)
2. [Response Format](#response-format)
3. [Clients API](#clients-api)
4. [Invoices API](#invoices-api)
5. [Payments API](#payments-api)
6. [Journals API](#journals-api)
7. [Reports API](#reports-api)
8. [Analytics API](#analytics-api)
9. [Audit API](#audit-api)
10. [Error Handling](#error-handling)

---

## Authentication

All API endpoints require a valid JWT token in the `Authorization` header.

```
Authorization: Bearer <jwt_token>
```

**Required Permissions:**
- Different endpoints require different permissions (see endpoint details)
- Permissions are checked at the application level
- Returns `403 Forbidden` if user lacks required permission

---

## Response Format

All API responses follow this format:

**Success Response:**
```json
{
  "status": "SUCCESS",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "status": "ERROR",
  "message": "Human-readable error description",
  "errors": { ... } // Optional validation errors
}
```

**HTTP Status Codes:**
- `200 OK` - Successful GET/PATCH request
- `201 Created` - Successful POST request (resource created)
- `400 Bad Request` - Invalid input, validation error
- `401 Unauthorized` - Missing/invalid authentication token
- `403 Forbidden` - User lacks required permission
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Clients API

### List Clients

```
GET /clients
```

**Permission Required:** `finance.clients.view`

**Query Parameters:**
- `skip` (optional): Number of records to skip (default: 0)
- `take` (optional): Number of records to return (default: 20)

**Response:**
```json
{
  "status": "SUCCESS",
  "clients": [
    {
      "Id": 1,
      "Name": "Acme Corporation",
      "Email": "contact@acme.com",
      "Phone": "+233 XX XXX XXXX",
      "CreditLimit": 100000.00,
      "CreatedAt": "2026-09-03T10:00:00Z"
    }
  ],
  "count": 1,
  "total": 50
}
```

---

### Get Single Client

```
GET /clients/{clientId}
```

**Permission Required:** `finance.clients.view`

**Path Parameters:**
- `clientId` (required): Client ID

**Response:**
```json
{
  "status": "SUCCESS",
  "client": {
    "Id": 1,
    "Name": "Acme Corporation",
    "Email": "contact@acme.com",
    "Phone": "+233 XX XXX XXXX",
    "CreditLimit": 100000.00,
    "CreatedAt": "2026-09-03T10:00:00Z"
  }
}
```

**Errors:**
- `400 Bad Request` - Invalid client ID
- `404 Not Found` - Client does not exist

---

### Create Client

```
POST /clients
```

**Permission Required:** `finance.clients.create`

**Request Body:**
```json
{
  "name": "New Client Inc",
  "email": "contact@newclient.com",
  "phone": "+233 XX XXX XXXX",
  "creditLimit": 75000.00
}
```

**Validation:**
- `name` (required): String, 2-255 characters, must be unique (case-insensitive)
- `email` (optional): Valid email format
- `phone` (optional): Phone number string
- `creditLimit` (optional): Positive decimal number

**Response:**
```json
{
  "status": "SUCCESS",
  "clientId": 5,
  "message": "Client created successfully"
}
```

**Errors:**
- `400 Bad Request` - Validation error or duplicate name

---

### Update Client

```
PATCH /clients/{clientId}
```

**Permission Required:** `finance.clients.update`

**Path Parameters:**
- `clientId` (required): Client ID

**Request Body:**
```json
{
  "name": "Updated Client Name",
  "email": "newemail@client.com",
  "phone": "+233 XX XXX XXXX",
  "creditLimit": 150000.00
}
```

**Note:** Only provide fields you want to update

**Response:**
```json
{
  "status": "SUCCESS",
  "message": "Client updated successfully"
}
```

**Errors:**
- `400 Bad Request` - Invalid input or duplicate name
- `404 Not Found` - Client does not exist

---

### Delete Client

```
DELETE /clients/{clientId}
```

**Permission Required:** `finance.clients.delete`

**Path Parameters:**
- `clientId` (required): Client ID

**Response:**
```json
{
  "status": "SUCCESS",
  "message": "Client deleted successfully"
}
```

**Note:** Soft delete - sets client as inactive but retains data

---

## Invoices API

### List Invoices

```
GET /invoices/query
```

**Permission Required:** `finance.invoices.view`

**Query Parameters:**
- `status` (optional): Invoice status (UNPAID, PARTIAL, PAID, VOID)
- `clientId` (optional): Filter by client ID
- `invoiceId` (optional): Filter by invoice ID
- `skip` (optional): Number of records to skip (default: 0)
- `take` (optional): Number of records to return (default: 20)

**Response:**
```json
{
  "status": "SUCCESS",
  "invoices": [
    {
      "Id": 1,
      "InvoiceNumber": "INV-001",
      "ClientName": "Acme Corporation",
      "InvoiceDate": "2026-09-01T00:00:00Z",
      "DueDate": "2026-09-30T00:00:00Z",
      "SubTotal": 1000.00,
      "VatAmount": 150.00,
      "TotalAmount": 1150.00,
      "BalanceDue": 1150.00,
      "Status": "UNPAID"
    }
  ],
  "count": 20,
  "total": 45
}
```

---

### Get Invoice Details

```
GET /invoices/{invoiceId}/details
```

**Permission Required:** `finance.invoices.view`

**Path Parameters:**
- `invoiceId` (required): Invoice ID

**Response:**
```json
{
  "status": "SUCCESS",
  "invoice": {
    "Id": 1,
    "InvoiceNumber": "INV-001",
    "ClientId": 1,
    "ClientName": "Acme Corporation",
    "InvoiceDate": "2026-09-01T00:00:00Z",
    "DueDate": "2026-09-30T00:00:00Z",
    "SubTotal": 1000.00,
    "VatAmount": 150.00,
    "NhisAmount": 25.00,
    "GetfundAmount": 25.00,
    "TotalAmount": 1175.00,
    "BalanceDue": 675.00,
    "Status": "PARTIAL"
  },
  "payments": [
    {
      "Id": 1,
      "Amount": 500.00,
      "PaymentDate": "2026-09-15T00:00:00Z",
      "PaymentMethod": "BANK_TRANSFER"
    }
  ],
  "creditNotes": [
    {
      "Id": 1,
      "Amount": 0.00,
      "CreditNoteDate": "2026-09-20T00:00:00Z"
    }
  ]
}
```

---

## Payments API

### List Payments

```
GET /payments/query
```

**Permission Required:** `finance.payments.view`

**Query Parameters:**
- `clientId` (optional): Filter by client ID
- `invoiceId` (optional): Filter by invoice ID
- `paymentMethod` (optional): Payment method (CASH, BANK_TRANSFER, CHEQUE, MOBILE_MONEY)
- `skip` (optional): Number of records to skip (default: 0)
- `take` (optional): Number of records to return (default: 20)

**Response:**
```json
{
  "status": "SUCCESS",
  "payments": [
    {
      "Id": 1,
      "InvoiceNumber": "INV-001",
      "Amount": 500.00,
      "PaymentDate": "2026-09-15T00:00:00Z",
      "PaymentMethod": "BANK_TRANSFER",
      "ReferenceNumber": "TXN-2026-001"
    }
  ],
  "count": 20,
  "total": 150
}
```

---

## Journals API

### Query Journal Entries

```
GET /journals/events/query
```

**Permission Required:** `accounting.journal.view`

**Query Parameters:**
- `accountCode` (optional): Filter by account code
- `sourceModule` (optional): Source module (INVOICE, PAYMENT, CREDIT_NOTE, etc.)
- `entryNumber` (optional): Filter by journal entry number
- `skip` (optional): Number of records to skip (default: 0)
- `take` (optional): Number of records to return (default: 20)

**Response:**
```json
{
  "status": "SUCCESS",
  "entries": [
    {
      "EntryNumber": 1001,
      "PostedDate": "2026-09-01T10:00:00Z",
      "AccountCode": "1100",
      "Debit": 1150.00,
      "Credit": 0.00,
      "Description": "Invoice INV-001",
      "SourceModule": "INVOICE"
    }
  ],
  "count": 20,
  "total": 500
}
```

---

## Reports API

### Trial Balance Report

```
GET /reports/trial-balance
```

**Permission Required:** `accounting.view`

**Query Parameters:**
- `fiscalYear` (optional): Fiscal year to report (default: current year)
- `periodNumber` (optional): Period number to report (1-12)

**Response:**
```json
{
  "status": "SUCCESS",
  "report": {
    "reportDate": "2026-09-03",
    "fiscalYear": 2026,
    "periodNumber": 9,
    "accounts": [
      {
        "accountCode": "1100",
        "accountName": "Cash",
        "accountType": "ASSET",
        "debit": 50000.00,
        "credit": 0.00,
        "balance": 50000.00
      }
    ],
    "summary": {
      "totalDebit": 150000.00,
      "totalCredit": 150000.00,
      "isBalanced": true
    }
  }
}
```

---

### Export Trial Balance (PDF/Excel/CSV)

```
GET /exports/trial-balance
```

**Permission Required:** `accounting.view`

**Query Parameters:**
- `format` (required): Export format (pdf, xlsx, csv)
- `fiscalYear` (optional): Fiscal year (default: current year)
- `periodNumber` (optional): Period number (1-12)

**Response:**
- PDF: Binary PDF document
- Excel: Binary XLSX workbook
- CSV: Plain text CSV file

**Headers:**
```
Content-Type: application/pdf | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | text/csv
Content-Disposition: attachment; filename="trial-balance.pdf"
```

---

## Analytics API

### Budget Tracking

#### List Budgets

```
GET /analytics/budgets
```

**Permission Required:** `accounting.budget.view`

**Query Parameters:**
- `fiscalYear` (optional): Fiscal year (default: current year)
- `limit` (optional): Number of budgets to return (default: 50, max: 100)

**Response:**
```json
{
  "status": "SUCCESS",
  "budgets": [
    {
      "Id": 1,
      "BudgetName": "Q3 2026 Operating Budget",
      "Period": "QUARTERLY",
      "FiscalYear": 2026,
      "Status": "DRAFT",
      "CreatedAt": "2026-09-03T10:00:00Z"
    }
  ],
  "count": 5,
  "fiscalYear": 2026
}
```

---

#### Create Budget

```
POST /analytics/budgets
```

**Permission Required:** `accounting.budget.create`

**Request Body:**
```json
{
  "budgetName": "Q4 2026 Budget",
  "description": "Quarterly operating budget",
  "period": "QUARTERLY",
  "fiscalYear": 2026,
  "startPeriod": 10,
  "lineItems": [
    {
      "accountCode": "5000",
      "budgetAmount": 50000.00,
      "notes": "Salaries"
    },
    {
      "accountCode": "5100",
      "budgetAmount": 15000.00,
      "notes": "Office supplies"
    }
  ]
}
```

**Validation:**
- `budgetName` (required): String, 2-100 characters
- `period` (required): MONTHLY, QUARTERLY, or ANNUAL
- `fiscalYear` (required): Integer, 2020-2099
- `lineItems` (required): Array with at least 1 item
- Each item must have valid `accountCode` and positive `budgetAmount`

**Response:**
```json
{
  "status": "SUCCESS",
  "budgetId": 1,
  "budgetName": "Q4 2026 Budget",
  "message": "Budget created successfully"
}
```

---

#### Get Budget Variance

```
GET /analytics/budgets/{budgetId}/variance
```

**Permission Required:** `accounting.budget.view`

**Path Parameters:**
- `budgetId` (required): Budget ID

**Response:**
```json
{
  "status": "SUCCESS",
  "budget": {
    "id": 1,
    "name": "Q4 2026 Budget",
    "period": "QUARTERLY",
    "fiscalYear": 2026,
    "status": "DRAFT"
  },
  "summary": {
    "totalBudget": 65000.00,
    "totalActual": 48500.00,
    "totalVariance": 16500.00,
    "favorableCount": 2,
    "unfavorableCount": 0,
    "onTrackCount": 0
  },
  "variance": [
    {
      "accountCode": "5000",
      "accountName": "Salaries Expense",
      "budgeted": 50000.00,
      "actual": 48000.00,
      "variance": 2000.00,
      "variancePercent": 4.00,
      "status": "ON_TRACK"
    }
  ]
}
```

**Variance Status:**
- `FAVORABLE`: Actual < Budgeted (spending under budget)
- `UNFAVORABLE`: Actual > Budgeted (overspending)
- `ON_TRACK`: Within acceptable variance threshold

---

### Financial Ratios Report

```
GET /analytics/financial-ratios
```

**Permission Required:** `accounting.view`

**Response:**
```json
{
  "status": "SUCCESS",
  "report": {
    "reportDate": "2026-09-03",
    "liquidity": {
      "currentRatio": 2.15,
      "quickRatio": 1.92,
      "workingCapital": 85000.00
    },
    "profitability": {
      "netProfitMargin": 12.50,
      "returnOnAssets": 8.33,
      "returnOnEquity": 18.75
    },
    "efficiency": {
      "assetTurnover": 1.67,
      "receivablesTurnover": 12.45,
      "daysSalesOutstanding": 29.30
    },
    "summary": {
      "healthScore": 92,
      "status": "EXCELLENT",
      "concerns": []
    }
  }
}
```

**Ratio Interpretation:**

**Liquidity Ratios:**
- Current Ratio > 1.5: Good short-term liquidity
- Quick Ratio > 0.5: Can meet obligations without inventory
- Working Capital > 0: Positive cash position

**Profitability Ratios:**
- Net Margin > 10%: Strong profitability
- ROA > 8%: Efficient asset utilization
- ROE > 15%: Good return to shareholders

**Efficiency Ratios:**
- Asset Turnover > 1: Good asset productivity
- DSO < 45 days: Good collection performance
- DSO > 90 days: Collection issues

**Health Score:**
- 80+: EXCELLENT - Strong financial position
- 60-79: GOOD - Healthy operations
- 40-59: FAIR - Some concerns, needs monitoring
- <40: POOR - Significant financial issues

---

## Audit API

### Query Audit Logs

```
GET /audit/logs
```

**Permission Required:** `accounting.audit.view`

**Query Parameters:**
- `entityType` (optional): Type of entity (INVOICE, PAYMENT, CLIENT, etc.)
- `entityId` (optional): Entity ID
- `userId` (optional): User ID who made changes
- `action` (optional): Action type (CREATE, UPDATE, DELETE, POST, VOID, CLOSE)
- `startDate` (optional): Start date (ISO 8601)
- `endDate` (optional): End date (ISO 8601)
- `skip` (optional): Number of records to skip (default: 0)
- `take` (optional): Number of records to return (default: 50)

**Response:**
```json
{
  "status": "SUCCESS",
  "logs": [
    {
      "Id": 1,
      "EntityType": "INVOICE",
      "EntityId": 1,
      "Action": "CREATE",
      "UserId": 1,
      "UserName": "John Doe",
      "OldValues": null,
      "NewValues": {
        "InvoiceNumber": "INV-001",
        "ClientId": 1,
        "TotalAmount": 1150.00
      },
      "CreatedAt": "2026-09-03T10:00:00Z"
    }
  ],
  "count": 20,
  "total": 156
}
```

**Errors:**
- `400 Bad Request` - Must provide at least one query parameter

---

## Error Handling

All errors follow a consistent format:

**Validation Error:**
```json
{
  "status": "ERROR",
  "message": "Invalid request parameters",
  "errors": {
    "budgetName": ["String must contain at least 2 character(s)"],
    "fiscalYear": ["Number must be greater than or equal to 2020"]
  }
}
```

**Authorization Error:**
```json
{
  "status": "ERROR",
  "message": "Unauthorized - Missing or invalid token"
}
```

**Permission Error:**
```json
{
  "status": "ERROR",
  "message": "Forbidden - User does not have permission to access this resource"
}
```

**Not Found Error:**
```json
{
  "status": "ERROR",
  "message": "Budget not found"
}
```

**Server Error:**
```json
{
  "status": "ERROR",
  "message": "Internal server error"
}
```

---

## Common Headers

### Request Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json (for POST/PATCH requests)
```

### Response Headers
```
Content-Type: application/json (or appropriate format)
X-Total-Count: <total_number_of_records> (for list endpoints)
```

---

## Rate Limiting

Currently no rate limiting is enforced. This may be added in future versions.

---

## Pagination

List endpoints support pagination via query parameters:
- `skip`: Number of records to skip (offset)
- `take`: Number of records to return (limit)

Example:
```
GET /clients?skip=20&take=50
```

Returns records 21-70 (50 records total).

---

## Date Format

All dates are in ISO 8601 format with timezone:
```
2026-09-03T10:00:00Z
```

---

## Support

For questions or issues with the API, contact the development team.

**Version History:**
- v1.0 (2026-09-03): Initial API release with Budget Tracking and Financial Ratios features
