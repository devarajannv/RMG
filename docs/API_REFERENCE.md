# RMGaaS API Reference

> Base URL: `http://localhost:4000/api/v1`

## Authentication

All endpoints (except login) require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@newvision.in",
  "password": "Password123!@#"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "admin@newvision.in",
    "firstName": "Admin",
    "lastName": "User",
    "tenantId": "uuid"
  },
  "tokens": {
    "accessToken": "jwt_token",
    "expiresIn": 900
  }
}
```

### Refresh Token

```http
POST /auth/refresh
```

### Get Current User

```http
GET /auth/me
```

### Logout

```http
POST /auth/logout
```

---

## Resources

### List Resources

```http
GET /resources?page=1&limit=20&status=ACTIVE&practiceId=uuid
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| status | string | ACTIVE, INACTIVE, ONLEAVE, TERMINATED |
| practiceId | uuid | Filter by practice |
| locationId | uuid | Filter by location |
| band | string | Filter by band |
| search | string | Search by name/email |

**Response:**
```json
{
  "data": [{
    "id": "uuid",
    "employeeId": "NV001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@company.com",
    "designation": "Software Engineer",
    "band": "L3",
    "status": "ACTIVE",
    "practice": { "id": "uuid", "name": "Technology" },
    "location": { "id": "uuid", "name": "Bangalore" },
    "skills": [{ "skill": { "name": "Java" }, "proficiency": "EXPERT" }]
  }],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Get Resource

```http
GET /resources/:id
```

### Create Resource

```http
POST /resources
Content-Type: application/json

{
  "employeeId": "NV100",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@company.com",
  "designation": "Senior Developer",
  "band": "L4",
  "practiceId": "uuid",
  "locationId": "uuid",
  "status": "ACTIVE",
  "employmentType": "FTE",
  "joinDate": "2024-01-15",
  "capacity": 100
}
```

### Update Resource

```http
PATCH /resources/:id
Content-Type: application/json

{
  "designation": "Lead Developer",
  "band": "L5"
}
```

### Delete Resource

```http
DELETE /resources/:id
```

---

## Projects

### List Projects

```http
GET /projects?status=ACTIVE&clientId=uuid
```

### Create Project

```http
POST /projects
Content-Type: application/json

{
  "code": "PROJ-001",
  "name": "Customer Portal",
  "clientId": "uuid",
  "type": "BILLABLE",
  "status": "ACTIVE",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "budgetHours": 2000,
  "description": "Customer portal development"
}
```

---

## Allocations

### List Allocations

```http
GET /allocations?resourceId=uuid&projectId=uuid&status=ACTIVE
```

### Create Allocation

```http
POST /allocations
Content-Type: application/json

{
  "resourceId": "uuid",
  "projectId": "uuid",
  "role": "Developer",
  "percentage": 100,
  "startDate": "2024-01-01",
  "endDate": "2024-06-30",
  "status": "ACTIVE",
  "isBillable": true
}
```

### Update Allocation

```http
PATCH /allocations/:id
Content-Type: application/json

{
  "percentage": 50,
  "endDate": "2024-03-31"
}
```

---

## Timesheets

### Get Weekly Timesheet

```http
GET /timesheets/weekly?resourceId=uuid&weekStart=2024-12-09
```

**Response:**
```json
{
  "data": {
    "resourceId": "uuid",
    "resourceName": "John Doe",
    "weekStart": "2024-12-09",
    "weekEnd": "2024-12-15",
    "period": {
      "id": "uuid",
      "status": "DRAFT"
    },
    "entries": [{
      "date": "2024-12-09",
      "allocations": [{
        "allocationId": "uuid",
        "projectCode": "PROJ-001",
        "projectName": "Customer Portal",
        "hours": 8
      }]
    }],
    "totals": {
      "daily": [8, 8, 8, 8, 8, 0, 0],
      "weekly": 40
    }
  }
}
```

### Save Timesheet Entries

```http
POST /timesheets/save
Content-Type: application/json

{
  "resourceId": "uuid",
  "weekStart": "2024-12-09",
  "entries": [{
    "allocationId": "uuid",
    "date": "2024-12-09",
    "hours": 8
  }]
}
```

### Submit Timesheet

```http
POST /timesheets/submit/:periodId
```

### Approve Timesheet

```http
POST /timesheets/approve/:periodId
Content-Type: application/json

{
  "comments": "Approved"
}
```

---

## Bench Management

### Get Bench Summary

```http
GET /bench/summary
```

**Response:**
```json
{
  "data": {
    "totalOnBench": 15,
    "totalBenchCost": 2250000,
    "avgBenchDays": 45,
    "criticalCount": 3,
    "byPractice": [{
      "practice": "Technology",
      "count": 8,
      "cost": 1200000
    }],
    "byBand": [{
      "band": "L3",
      "count": 5,
      "cost": 500000
    }]
  }
}
```

### Get Bench Resources

```http
GET /bench/resources?practice=Technology&minDays=30
```

### Get Upcoming Rolloffs

```http
GET /bench/rolloffs?days=30
```

### Get Bench Alerts

```http
GET /bench/alerts
```

### Quick Allocate

```http
POST /bench/quick-allocate
Content-Type: application/json

{
  "resourceId": "uuid",
  "projectId": "uuid",
  "percentage": 100,
  "startDate": "2024-12-16",
  "endDate": "2024-03-31",
  "role": "Developer"
}
```

---

## Intelligence Layer

### Smart Resource Matching

```http
POST /intelligence/match
Content-Type: application/json

{
  "requiredSkills": ["uuid1", "uuid2"],
  "preferredSkills": ["uuid3"],
  "minProficiency": "INTERMEDIATE",
  "startDate": "2024-01-01",
  "allocationPercentage": 100,
  "practiceId": "uuid",
  "limit": 10
}
```

**Response:**
```json
{
  "data": [{
    "resourceId": "uuid",
    "resourceName": "John Doe",
    "overallScore": 85,
    "skillScore": 90,
    "availabilityScore": 80,
    "matchedSkills": ["Java", "AWS"],
    "missingSkills": ["Python"],
    "currentUtilization": 50,
    "availableCapacity": 50,
    "recommendation": "Excellent match"
  }],
  "meta": {
    "totalMatches": 10
  }
}
```

### Skill Gap Analysis

```http
GET /intelligence/skill-gap/:projectId
```

### Utilization Insights

```http
GET /intelligence/utilization-insights
```

**Response:**
```json
{
  "data": {
    "currentUtilization": 72,
    "targetUtilization": 85,
    "variance": -13,
    "benchCount": 15,
    "benchCost": 2250000,
    "recommendations": [{
      "type": "warning",
      "priority": "high",
      "message": "15 resources on bench",
      "impact": "Monthly bench cost: ₹22.5L"
    }],
    "practiceBreakdown": [{
      "practiceName": "Technology",
      "utilization": 78,
      "target": 85,
      "status": "below"
    }]
  }
}
```

### Skill Inventory

```http
GET /intelligence/skill-inventory
```

---

## Analytics

### Executive Dashboard

```http
GET /analytics/executive
```

**Response:**
```json
{
  "data": {
    "summary": {
      "totalResources": 500,
      "activeResources": 480,
      "utilizationRate": 78,
      "benchCount": 45,
      "benchCostMonthly": 6750000,
      "activeProjects": 35,
      "activeClients": 12
    },
    "trends": {
      "utilizationTrend": [
        { "month": "Jul", "rate": 75 },
        { "month": "Aug", "rate": 78 }
      ],
      "benchTrend": [
        { "month": "Jul", "count": 50, "cost": 7500000 }
      ]
    },
    "highlights": [{
      "type": "warning",
      "title": "Utilization Below Target",
      "value": "78%",
      "change": "-7%"
    }]
  }
}
```

### Practice Dashboard

```http
GET /analytics/practice
```

### Financial Dashboard

```http
GET /analytics/financial
```

### Project Health

```http
GET /analytics/projects
```

---

## Export

### Export Resources

```http
GET /export/resources?format=csv
```

**Query Parameters:**
| Param | Type | Default | Options |
|-------|------|---------|---------|
| format | string | csv | csv, json |

**CSV Response Headers:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="resources_2024-12-16.csv"
X-Record-Count: 100
```

### Available Exports

| Endpoint | Description |
|----------|-------------|
| `/export/resources` | All resources with skills |
| `/export/projects` | All projects with teams |
| `/export/allocations` | All allocations |
| `/export/bench-report` | Bench resources & costs |
| `/export/utilization-report` | Utilization by resource |
| `/export/clients` | All clients |
| `/export/skills-inventory` | Skills with resource counts |

---

## Import

### Import Resources

```http
POST /import/resources
Content-Type: application/json

{
  "data": "employeeId,firstName,lastName,email\nNV100,Jane,Smith,jane@co.com",
  "updateExisting": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRows": 10,
    "importedRows": 8,
    "skippedRows": 2,
    "errors": [{
      "row": 5,
      "field": "email",
      "message": "Email already exists"
    }]
  }
}
```

### Validate Import

```http
POST /import/validate
Content-Type: application/json

{
  "type": "resources",
  "data": "employeeId,firstName,lastName,email\nNV100,Jane,Smith,jane@co.com"
}
```

### Get Template

```http
GET /import/template/resources
```

---

## Webhooks

### List Webhooks

```http
GET /webhooks
```

### Create Webhook

```http
POST /webhooks
Content-Type: application/json

{
  "name": "Slack Notifications",
  "url": "https://hooks.slack.com/services/xxx",
  "events": ["resource.created", "allocation.created"],
  "secret": "optional_secret_for_signing"
}
```

### Available Events

```http
GET /webhooks/events
```

**Events:**
- `resource.created`, `resource.updated`, `resource.deleted`
- `allocation.created`, `allocation.updated`, `allocation.deleted`
- `project.created`, `project.updated`, `project.completed`
- `bench.resource_added`, `bench.resource_removed`
- `timesheet.submitted`, `timesheet.approved`, `timesheet.rejected`
- `contract.expiring`

### Webhook Payload

```json
{
  "event": "resource.created",
  "timestamp": "2024-12-16T10:00:00.000Z",
  "tenantId": "uuid",
  "data": {
    "resourceId": "uuid",
    "employeeId": "NV100",
    "name": "Jane Smith"
  }
}
```

### Test Webhook

```http
POST /webhooks/:id/test
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid input data |
| CONFLICT | 409 | Duplicate entry |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

- **Window**: 1 minute
- **Max Requests**: 100 per window
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

---

## Pagination

All list endpoints support pagination:

```http
GET /resources?page=2&limit=50
```

**Response includes:**
```json
{
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 500,
    "totalPages": 10
  }
}
```

