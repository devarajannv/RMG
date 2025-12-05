# API Contracts & Specifications

> **Version:** 1.0  
> **Last Updated:** 2025-12-06T00:00:00Z  
> **Status:** DRAFT  
> **API Version:** v1

---

## Overview

This document defines all API endpoints, request/response schemas, error codes, and GraphQL schema for RMGaaS. **AI assistants MUST follow these contracts exactly when implementing APIs.**

---

## Table of Contents

1. [API Design Principles](#1-api-design-principles)
2. [Authentication Endpoints](#2-authentication-endpoints)
3. [Resource Endpoints](#3-resource-endpoints)
4. [Project Endpoints](#4-project-endpoints)
5. [Allocation Endpoints](#5-allocation-endpoints)
6. [GraphQL Schema](#6-graphql-schema)
7. [Error Handling](#7-error-handling)
8. [Pagination & Filtering](#8-pagination--filtering)

---

## 1. API Design Principles

### Base URL
```
Production:  https://api.rmgaas.io/v1
Staging:     https://api.staging.rmgaas.io/v1
Development: http://localhost:3001/v1
```

### Headers (Required)
```http
Authorization: Bearer <access_token>
Content-Type: application/json
X-Tenant-ID: <tenant_uuid>  (Optional - derived from token if not provided)
X-Request-ID: <uuid>        (Optional - for tracing)
```

### HTTP Methods
| Method | Use Case |
|--------|----------|
| GET | Retrieve resources (idempotent) |
| POST | Create new resources |
| PUT | Full replacement of resource |
| PATCH | Partial update of resource |
| DELETE | Soft delete resource |

### Response Format
```json
{
  "success": true,
  "data": { },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2025-12-06T10:30:00Z"
  }
}
```

### Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2025-12-06T10:30:00Z"
  }
}
```

---

## 2. Authentication Endpoints

### POST /auth/login

Login with email and password.

**Request:**
```json
{
  "email": "user@company.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@company.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["admin", "resource_manager"]
    },
    "accessToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

**Response (423 Locked):**
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Account locked due to too many failed attempts",
    "details": {
      "lockedUntil": "2025-12-06T11:00:00Z"
    }
  }
}
```

---

### POST /auth/refresh

Refresh access token using refresh token (from httpOnly cookie).

**Request:** (No body - refresh token in cookie)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

---

### POST /auth/logout

Invalidate current session.

**Request:** (No body)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

### GET /auth/me

Get current user profile.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@company.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["admin"],
    "permissions": ["resources:*", "projects:read"],
    "resource": {
      "id": "uuid",
      "employeeId": "EMP001"
    },
    "tenant": {
      "id": "uuid",
      "name": "NewVision",
      "tier": "enterprise"
    },
    "preferences": {
      "theme": "dark",
      "language": "en"
    }
  }
}
```

---

## 3. Resource Endpoints

### GET /resources

List resources with filters and pagination.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | int | Page number (default: 1) |
| limit | int | Items per page (default: 20, max: 100) |
| sort | string | Sort field (default: "firstName") |
| order | string | "asc" or "desc" (default: "asc") |
| search | string | Search in name, email, employeeId |
| status | string | "active", "inactive", "notice" |
| practiceId | uuid | Filter by practice |
| bandId | string | Filter by band (e.g., "B3") |
| onBench | boolean | Filter bench resources |
| skillIds | uuid[] | Filter by skills (comma-separated) |
| availableFrom | date | Available from this date |
| availableTo | date | Available until this date |
| minAvailability | int | Minimum availability % |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "employeeId": "EMP001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@company.com",
      "designation": "Senior Developer",
      "band": "B3",
      "status": "active",
      "practice": {
        "id": "uuid",
        "name": "Microsoft"
      },
      "location": {
        "id": "uuid",
        "name": "Bangalore",
        "code": "BLR"
      },
      "manager": {
        "id": "uuid",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "currentUtilization": 80,
      "benchDays": null,
      "skills": [
        {
          "id": "uuid",
          "name": "React",
          "proficiency": "expert"
        }
      ],
      "activeAllocations": 2,
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-12-01T15:30:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 485,
      "totalPages": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### GET /resources/:id

Get single resource with full details.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employeeId": "EMP001",
    "firstName": "John",
    "lastName": "Doe",
    "preferredName": "Johnny",
    "email": "john.doe@company.com",
    "phone": "+91-9876543210",
    "photoUrl": "https://...",
    
    "employmentType": "fte",
    "band": "B3",
    "designation": "Senior Developer",
    "department": "Engineering",
    "dateOfJoining": "2022-03-15",
    "dateOfExit": null,
    
    "practice": {
      "id": "uuid",
      "name": "Microsoft",
      "code": "MSFT"
    },
    "location": {
      "id": "uuid",
      "name": "Bangalore Office",
      "code": "BLR"
    },
    "manager": {
      "id": "uuid",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@company.com"
    },
    
    "capacity": 100,
    "status": "active",
    "benchSince": null,
    
    "skills": [
      {
        "id": "uuid",
        "name": "React",
        "category": "Frontend",
        "proficiency": "expert",
        "yearsExp": 5.0,
        "certified": true,
        "certExpiry": "2026-06-30"
      },
      {
        "id": "uuid",
        "name": "TypeScript",
        "category": "Languages",
        "proficiency": "advanced",
        "yearsExp": 3.5,
        "certified": false
      }
    ],
    
    "allocations": {
      "active": [
        {
          "id": "uuid",
          "project": {
            "id": "uuid",
            "code": "PROJ-001",
            "name": "Digital Transformation"
          },
          "role": "Tech Lead",
          "percentage": 80,
          "startDate": "2025-01-01",
          "endDate": "2025-06-30",
          "status": "active"
        }
      ],
      "upcoming": [],
      "past": []
    },
    
    "stats": {
      "currentUtilization": 80,
      "avgUtilization90Days": 85,
      "totalProjects": 12,
      "totalAllocations": 24,
      "tenure": {
        "years": 2,
        "months": 9
      }
    },
    
    "tags": ["high-performer", "client-facing"],
    "customFields": {},
    
    "createdAt": "2022-03-15T10:00:00Z",
    "updatedAt": "2025-12-01T15:30:00Z"
  }
}
```

---

### POST /resources

Create a new resource.

**Request:**
```json
{
  "employeeId": "EMP100",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@company.com",
  "phone": "+91-9876543210",
  "employmentType": "fte",
  "band": "B2",
  "designation": "Developer",
  "practiceId": "uuid",
  "locationId": "uuid",
  "managerId": "uuid",
  "dateOfJoining": "2025-12-15",
  "capacity": 100,
  "skills": [
    { "skillId": "uuid", "proficiency": "intermediate", "yearsExp": 2 }
  ],
  "tags": ["new-joiner"]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employeeId": "EMP100",
    // ... full resource object
  }
}
```

**Validation Errors (400):**
| Field | Rule | Error Code |
|-------|------|------------|
| employeeId | Required, unique | DUPLICATE_EMPLOYEE_ID |
| email | Required, valid format, unique | INVALID_EMAIL |
| firstName | Required, 1-100 chars | REQUIRED_FIELD |
| band | Must exist in tenant config | INVALID_BAND |
| dateOfJoining | Cannot be future > 30 days | INVALID_DATE |

---

### PUT /resources/:id

Full update of resource.

**Request:** Same as POST

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    // ... updated resource
  }
}
```

---

### PATCH /resources/:id

Partial update of resource.

**Request:**
```json
{
  "designation": "Senior Developer",
  "band": "B3"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    // ... updated resource
  }
}
```

---

### DELETE /resources/:id

Soft delete a resource.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Resource archived successfully"
  }
}
```

**Error (409 Conflict):**
```json
{
  "success": false,
  "error": {
    "code": "ACTIVE_ALLOCATIONS",
    "message": "Cannot delete resource with active allocations",
    "details": {
      "activeAllocations": 2
    }
  }
}
```

---

### GET /resources/:id/availability

Get resource availability for date range.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | date | Range start (required) |
| endDate | date | Range end (required) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "resourceId": "uuid",
    "capacity": 100,
    "range": {
      "startDate": "2025-01-01",
      "endDate": "2025-03-31"
    },
    "summary": {
      "avgAvailability": 35,
      "daysFullyBooked": 45,
      "daysPartiallyBooked": 30,
      "daysAvailable": 15
    },
    "daily": [
      {
        "date": "2025-01-01",
        "allocated": 80,
        "available": 20,
        "allocations": [
          {
            "projectCode": "PROJ-001",
            "percentage": 80
          }
        ]
      }
      // ... more days
    ],
    "weekly": [
      {
        "weekStart": "2024-12-30",
        "weekEnd": "2025-01-05",
        "avgAllocated": 75,
        "avgAvailable": 25
      }
      // ... more weeks
    ]
  }
}
```

---

## 4. Project Endpoints

### GET /projects

List projects with filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | "pipeline", "active", "on_hold", "completed", "cancelled" |
| type | string | "billable", "internal", "presales", "support" |
| clientId | uuid | Filter by client |
| practiceId | uuid | Filter by practice |
| managerId | uuid | Filter by project manager |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "PROJ-001",
      "name": "Digital Transformation",
      "type": "billable",
      "status": "active",
      "client": {
        "id": "uuid",
        "name": "Acme Corp",
        "code": "ACME"
      },
      "practice": {
        "id": "uuid",
        "name": "Microsoft"
      },
      "manager": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe"
      },
      "startDate": "2025-01-01",
      "endDate": "2025-12-31",
      "healthStatus": "green",
      "stats": {
        "allocatedResources": 8,
        "totalAllocation": 650,
        "budgetUtilization": 45
      },
      "createdAt": "2024-11-01T10:00:00Z"
    }
  ],
  "meta": {
    "pagination": { }
  }
}
```

---

### POST /projects

Create a new project.

**Request:**
```json
{
  "code": "PROJ-002",
  "name": "Cloud Migration",
  "type": "billable",
  "clientId": "uuid",
  "practiceId": "uuid",
  "managerId": "uuid",
  "startDate": "2025-02-01",
  "endDate": "2025-08-31",
  "budgetHours": 5000,
  "billingType": "tm",
  "priority": "high",
  "description": "Migrate legacy systems to Azure"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    // ... full project object
  }
}
```

---

## 5. Allocation Endpoints

### GET /allocations

List allocations with filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| resourceId | uuid | Filter by resource |
| projectId | uuid | Filter by project |
| status | string | "proposed", "confirmed", "active", "completed", "cancelled" |
| startDateFrom | date | Allocation starts after |
| startDateTo | date | Allocation starts before |
| endDateFrom | date | Allocation ends after |
| endDateTo | date | Allocation ends before |
| rollingOff | boolean | Ending within 14 days |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "resource": {
        "id": "uuid",
        "employeeId": "EMP001",
        "firstName": "John",
        "lastName": "Doe",
        "band": "B3"
      },
      "project": {
        "id": "uuid",
        "code": "PROJ-001",
        "name": "Digital Transformation",
        "client": {
          "name": "Acme Corp"
        }
      },
      "role": "Tech Lead",
      "percentage": 80,
      "startDate": "2025-01-01",
      "endDate": "2025-06-30",
      "status": "active",
      "isBillable": true,
      "daysRemaining": 45,
      "createdAt": "2024-12-01T10:00:00Z"
    }
  ]
}
```

---

### POST /allocations

Create new allocation.

**Request:**
```json
{
  "resourceId": "uuid",
  "projectId": "uuid",
  "role": "Developer",
  "percentage": 50,
  "startDate": "2025-02-01",
  "endDate": "2025-05-31",
  "isBillable": true,
  "billRate": 150.00,
  "notes": "Backend development work"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "proposed",
    // ... full allocation
  }
}
```

**Error (409 Conflict):**
```json
{
  "success": false,
  "error": {
    "code": "ALLOCATION_CONFLICT",
    "message": "Resource would be over-allocated",
    "details": {
      "conflicts": [
        {
          "date": "2025-02-15",
          "currentAllocation": 80,
          "requestedAllocation": 50,
          "total": 130,
          "overBy": 30,
          "existingProjects": ["PROJ-001"]
        }
      ],
      "suggestion": "Reduce allocation to 20% or adjust dates"
    }
  }
}
```

---

### PATCH /allocations/:id/confirm

Confirm a proposed allocation.

**Request:**
```json
{
  "notes": "Approved by practice head"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "confirmed",
    "confirmedAt": "2025-12-06T10:30:00Z",
    "approvedBy": {
      "id": "uuid",
      "firstName": "Jane",
      "lastName": "Smith"
    }
  }
}
```

---

### PATCH /allocations/:id/cancel

Cancel an allocation.

**Request:**
```json
{
  "reason": "Project scope reduced"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "cancelled",
    "cancelledAt": "2025-12-06T10:30:00Z",
    "cancelReason": "Project scope reduced"
  }
}
```

---

### POST /allocations/check-conflicts

Check for conflicts without creating allocation.

**Request:**
```json
{
  "resourceId": "uuid",
  "startDate": "2025-02-01",
  "endDate": "2025-05-31",
  "percentage": 50,
  "excludeAllocationId": "uuid"  // Optional - for edit scenarios
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "hasConflicts": false,
    "maxAvailablePercentage": 50,
    "conflicts": []
  }
}
```

---

## 6. GraphQL Schema

### Endpoint
```
POST /graphql
```

### Schema Definition

```graphql
# Scalars
scalar DateTime
scalar Date
scalar UUID

# Enums
enum ResourceStatus {
  ACTIVE
  INACTIVE
  NOTICE
}

enum AllocationStatus {
  PROPOSED
  CONFIRMED
  ACTIVE
  COMPLETED
  CANCELLED
}

enum ProjectStatus {
  PIPELINE
  ACTIVE
  ON_HOLD
  COMPLETED
  CANCELLED
}

enum Proficiency {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  EXPERT
}

# Types
type Resource {
  id: UUID!
  employeeId: String!
  firstName: String!
  lastName: String!
  fullName: String!
  email: String!
  designation: String!
  band: String!
  status: ResourceStatus!
  
  practice: Practice
  location: Location
  manager: Resource
  
  skills: [ResourceSkill!]!
  activeAllocations: [Allocation!]!
  
  currentUtilization: Int!
  benchDays: Int
  
  createdAt: DateTime!
  updatedAt: DateTime!
}

type ResourceSkill {
  skill: Skill!
  proficiency: Proficiency!
  yearsExp: Float
  certified: Boolean!
}

type Skill {
  id: UUID!
  name: String!
  category: SkillCategory
}

type SkillCategory {
  id: UUID!
  name: String!
  color: String
}

type Practice {
  id: UUID!
  name: String!
  code: String!
  head: Resource
  resourceCount: Int!
  avgUtilization: Float!
}

type Location {
  id: UUID!
  name: String!
  code: String!
  timezone: String!
}

type Client {
  id: UUID!
  name: String!
  code: String!
  status: String!
  projects: [Project!]!
}

type Project {
  id: UUID!
  code: String!
  name: String!
  type: String!
  status: ProjectStatus!
  client: Client
  practice: Practice
  manager: Resource
  startDate: Date!
  endDate: Date
  allocations: [Allocation!]!
  
  stats: ProjectStats!
}

type ProjectStats {
  allocatedResources: Int!
  totalAllocationPercentage: Int!
  budgetUtilization: Float
}

type Allocation {
  id: UUID!
  resource: Resource!
  project: Project!
  role: String!
  percentage: Int!
  startDate: Date!
  endDate: Date!
  status: AllocationStatus!
  isBillable: Boolean!
  daysRemaining: Int
}

# Dashboard Types
type DashboardStats {
  totalResources: Int!
  activeResources: Int!
  benchCount: Int!
  benchCost: Float!
  avgUtilization: Float!
  upcomingRolloffs: Int!
}

type UtilizationByPractice {
  practice: Practice!
  resourceCount: Int!
  avgUtilization: Float!
  benchCount: Int!
}

type RolloffItem {
  allocation: Allocation!
  daysUntilRolloff: Int!
}

# Queries
type Query {
  # Resources
  resources(
    filter: ResourceFilter
    pagination: PaginationInput
    sort: SortInput
  ): ResourceConnection!
  
  resource(id: UUID!): Resource
  
  resourceAvailability(
    resourceId: UUID!
    startDate: Date!
    endDate: Date!
  ): AvailabilityData!
  
  # Projects
  projects(
    filter: ProjectFilter
    pagination: PaginationInput
  ): ProjectConnection!
  
  project(id: UUID!): Project
  
  # Allocations
  allocations(
    filter: AllocationFilter
    pagination: PaginationInput
  ): AllocationConnection!
  
  # Dashboard
  dashboardStats(practiceId: UUID): DashboardStats!
  
  utilizationByPractice(
    startDate: Date!
    endDate: Date!
  ): [UtilizationByPractice!]!
  
  upcomingRolloffs(days: Int = 14): [RolloffItem!]!
  
  benchResources(practiceId: UUID): [Resource!]!
  
  # Search
  searchResources(
    query: String!
    skills: [UUID!]
    minAvailability: Int
    startDate: Date
    endDate: Date
  ): [ResourceSearchResult!]!
}

# Input Types
input ResourceFilter {
  status: ResourceStatus
  practiceId: UUID
  locationId: UUID
  band: String
  onBench: Boolean
  skillIds: [UUID!]
  search: String
}

input ProjectFilter {
  status: ProjectStatus
  type: String
  clientId: UUID
  practiceId: UUID
  managerId: UUID
}

input AllocationFilter {
  resourceId: UUID
  projectId: UUID
  status: AllocationStatus
  startDateFrom: Date
  startDateTo: Date
  endDateFrom: Date
  endDateTo: Date
  rollingOff: Boolean
}

input PaginationInput {
  page: Int = 1
  limit: Int = 20
}

input SortInput {
  field: String!
  order: SortOrder = ASC
}

enum SortOrder {
  ASC
  DESC
}

# Connection Types (for pagination)
type ResourceConnection {
  nodes: [Resource!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type ProjectConnection {
  nodes: [Project!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type AllocationConnection {
  nodes: [Allocation!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PageInfo {
  page: Int!
  limit: Int!
  totalPages: Int!
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
}

# Search Result
type ResourceSearchResult {
  resource: Resource!
  matchScore: Float!
  skillMatch: Float!
  availabilityMatch: Float!
  availability: Int!
}

# Availability
type AvailabilityData {
  resourceId: UUID!
  capacity: Int!
  summary: AvailabilitySummary!
  daily: [DailyAvailability!]!
}

type AvailabilitySummary {
  avgAvailability: Int!
  daysFullyBooked: Int!
  daysPartiallyBooked: Int!
  daysAvailable: Int!
}

type DailyAvailability {
  date: Date!
  allocated: Int!
  available: Int!
  allocations: [AllocationSummary!]!
}

type AllocationSummary {
  projectCode: String!
  percentage: Int!
}
```

### Example Query

```graphql
query DashboardData($practiceId: UUID, $startDate: Date!, $endDate: Date!) {
  dashboardStats(practiceId: $practiceId) {
    totalResources
    activeResources
    benchCount
    benchCost
    avgUtilization
    upcomingRolloffs
  }
  
  utilizationByPractice(startDate: $startDate, endDate: $endDate) {
    practice {
      id
      name
      code
    }
    resourceCount
    avgUtilization
    benchCount
  }
  
  upcomingRolloffs(days: 14) {
    allocation {
      resource {
        id
        fullName
        band
      }
      project {
        code
        name
        client {
          name
        }
      }
      endDate
      percentage
    }
    daysUntilRolloff
  }
  
  benchResources(practiceId: $practiceId) {
    id
    fullName
    band
    benchDays
    skills {
      skill {
        name
      }
      proficiency
    }
  }
}
```

---

## 7. Error Handling

### HTTP Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET, PUT, PATCH, DELETE |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE (no body) |
| 400 | Bad Request | Validation error, malformed request |
| 401 | Unauthorized | Missing or invalid auth token |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Business rule violation (e.g., duplicate, over-allocation) |
| 422 | Unprocessable | Semantic error (valid syntax, invalid operation) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Unexpected server error |

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Field validation failed |
| `INVALID_JSON` | 400 | Malformed JSON body |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `TOKEN_INVALID` | 401 | Malformed or tampered token |
| `ACCOUNT_LOCKED` | 423 | Too many failed logins |
| `PERMISSION_DENIED` | 403 | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | 404 | Entity doesn't exist |
| `DUPLICATE_ENTRY` | 409 | Unique constraint violation |
| `ALLOCATION_CONFLICT` | 409 | Resource over-allocated |
| `ACTIVE_ALLOCATIONS` | 409 | Cannot delete with active allocations |
| `INVALID_STATE_TRANSITION` | 422 | Invalid status change |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 8. Pagination & Filtering

### Pagination (All list endpoints)

```
GET /resources?page=2&limit=50
```

Response includes:
```json
{
  "meta": {
    "pagination": {
      "page": 2,
      "limit": 50,
      "total": 485,
      "totalPages": 10,
      "hasNext": true,
      "hasPrev": true
    }
  }
}
```

### Sorting

```
GET /resources?sort=firstName&order=asc
GET /resources?sort=createdAt&order=desc
```

### Filtering (Field-specific)

```
GET /resources?status=active&practiceId=uuid&band=B3
```

### Search (Text search)

```
GET /resources?search=john
```
Searches: firstName, lastName, email, employeeId

### Date Ranges

```
GET /allocations?startDateFrom=2025-01-01&startDateTo=2025-03-31
```

### Multiple Values

```
GET /resources?skillIds=uuid1,uuid2,uuid3
GET /projects?status=active,on_hold
```

---

*Last Updated: 2025-12-06T00:00:00Z*
*Version: 1.0*
