# RMGaaS Data Flow Audit

> Comprehensive audit of data handling throughout the application

---

## 1. Authentication Data Flow

### Login Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│ API Gateway │───▶│ Auth Service│───▶│  Database   │
│ (Browser)   │    │   (Express) │    │             │    │ (PostgreSQL)│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                   │                  │                  │
      │ 1. POST /login    │                  │                  │
      │ {email, password} │                  │                  │
      │───────────────────▶                  │                  │
      │                   │ 2. Validate      │                  │
      │                   │ with Zod         │                  │
      │                   │──────────────────▶                  │
      │                   │                  │ 3. Find user     │
      │                   │                  │ by email         │
      │                   │                  │──────────────────▶
      │                   │                  │                  │
      │                   │                  │◀──────────────────
      │                   │                  │ 4. Verify        │
      │                   │                  │ password (Argon2)│
      │                   │                  │                  │
      │                   │ 5. Generate JWT  │                  │
      │                   │◀──────────────────                  │
      │                   │                  │                  │
      │ 6. Set HttpOnly   │                  │                  │
      │ cookies           │                  │                  │
      │◀───────────────────                  │                  │
```

### Audit Points ✅
- [x] Password never logged
- [x] Password never returned in response
- [x] JWT contains minimal claims (sub, tenantId, roles)
- [x] Access token short-lived (15 min)
- [x] Refresh token in HttpOnly cookie
- [x] CORS configured for specific origins

---

## 2. API Request Data Flow

### Authenticated Request Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│  Middleware │───▶│  Controller │───▶│   Service   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                   │                  │                  │
      │ 1. Request with   │                  │                  │
      │ Bearer token      │                  │                  │
      │───────────────────▶                  │                  │
      │                   │                  │                  │
      │                   │ 2. Verify JWT    │                  │
      │                   │ Extract claims   │                  │
      │                   │                  │                  │
      │                   │ 3. Add user to   │                  │
      │                   │ request context  │                  │
      │                   │──────────────────▶                  │
      │                   │                  │                  │
      │                   │                  │ 4. Validate body │
      │                   │                  │ with Zod schema  │
      │                   │                  │──────────────────▶
      │                   │                  │                  │
      │                   │                  │                  │ 5. Execute
      │                   │                  │                  │ with tenantId
      │                   │                  │                  │──────────────▶
```

### Middleware Stack
```typescript
1. Helmet          → Security headers
2. CORS            → Origin validation  
3. Rate Limiter    → Request throttling
4. Body Parser     → JSON parsing
5. Cookie Parser   → Signed cookies
6. Request Logger  → Audit trail
7. Authenticate    → JWT verification
8. [Route Handler] → Business logic
9. Error Handler   → Sanitized responses
```

### Audit Points ✅
- [x] All requests logged (without sensitive data)
- [x] JWT verified on every request
- [x] Rate limiting enforced
- [x] Request body validated with Zod
- [x] Error responses sanitized

---

## 3. Database Query Data Flow

### Query Construction
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Service   │───▶│   Prisma    │───▶│  SQL Query  │───▶│  PostgreSQL │
│             │    │   Client    │    │ (Prepared)  │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                   │                  │                  │
      │ 1. Query with     │                  │                  │
      │ where: {          │                  │                  │
      │   tenantId,       │                  │                  │
      │   status,         │                  │                  │
      │   ...             │                  │                  │
      │ }                 │                  │                  │
      │───────────────────▶                  │                  │
      │                   │ 2. Build         │                  │
      │                   │ parameterized    │                  │
      │                   │ query            │                  │
      │                   │──────────────────▶                  │
      │                   │                  │ 3. Execute       │
      │                   │                  │ with parameters  │
      │                   │                  │──────────────────▶
```

### Tenant Isolation Pattern
```typescript
// EVERY query includes tenantId
const resources = await prisma.resource.findMany({
  where: {
    tenantId: req.user.tenantId,  // ← Always filtered
    status: 'ACTIVE',
  },
});
```

### Audit Points ✅
- [x] Prisma uses parameterized queries (SQL injection safe)
- [x] TenantId filter on all queries
- [x] Soft delete pattern (deletedAt)
- [x] No raw SQL queries
- [x] Connection pooling enabled

---

## 4. Data Export Flow

### Export Process
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│  Export     │───▶│   Query     │───▶│  Format     │
│             │    │  Controller │    │   Service   │    │   (CSV/JSON)│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                   │                  │                  │
      │ 1. GET /export/   │                  │                  │
      │ resources?format= │                  │                  │
      │ csv               │                  │                  │
      │───────────────────▶                  │                  │
      │                   │ 2. Auth check    │                  │
      │                   │ Permission check │                  │
      │                   │──────────────────▶                  │
      │                   │                  │ 3. Query with    │
      │                   │                  │ tenantId filter  │
      │                   │                  │──────────────────▶
      │                   │                  │                  │
      │                   │◀──────────────────────────────────────
      │                   │ 4. Format data   │                  │
      │                   │ (CSV/JSON)       │                  │
      │                   │                  │                  │
      │ 5. Stream response│                  │                  │
      │ with headers      │                  │                  │
      │◀───────────────────                  │                  │
```

### Audit Points ✅
- [x] Authentication required
- [x] Tenant isolation enforced
- [x] Export logged to audit trail
- [x] Sensitive fields can be excluded
- [x] Response streamed for large datasets
- [x] Content-Disposition header set

---

## 5. Data Import Flow

### Import Process
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│   Import    │───▶│  Validate   │───▶│   Process   │
│             │    │  Controller │    │   Service   │    │   & Save    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                   │                  │                  │
      │ 1. POST /import/  │                  │                  │
      │ resources         │                  │                  │
      │ {data: "csv..."}  │                  │                  │
      │───────────────────▶                  │                  │
      │                   │ 2. Parse CSV     │                  │
      │                   │──────────────────▶                  │
      │                   │                  │ 3. Validate      │
      │                   │                  │ each row         │
      │                   │                  │──────────────────▶
      │                   │                  │                  │
      │                   │                  │ 4. Check for     │
      │                   │                  │ duplicates       │
      │                   │                  │                  │
      │                   │                  │ 5. Create/Update │
      │                   │                  │ with tenantId    │
      │                   │                  │                  │
      │ 6. Return result  │                  │                  │
      │ {imported: N,     │                  │                  │
      │  errors: [...]}   │                  │                  │
      │◀───────────────────────────────────────────────────────────
```

### Validation Pipeline
```typescript
1. Parse CSV/JSON
2. Validate required fields
3. Validate data types
4. Validate field lengths
5. Check for duplicates (email, employeeId)
6. Validate foreign keys (practiceId, locationId)
7. Sanitize string inputs
8. Create/Update with tenantId
```

### Audit Points ✅
- [x] File size limits enforced
- [x] Data validated row-by-row
- [x] Errors reported per row
- [x] Transaction rollback on failure (optional)
- [x] Audit log entry created
- [x] TenantId assigned to imported records

---

## 6. Sensitive Data Handling

### Password Handling
```
┌─────────────────────────────────────────────────────────────────┐
│ Password Flow                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ User Input → Zod Validation → Argon2 Hash → Database Storage    │
│                                                                 │
│ NEVER: Logged, Returned in API, Stored in plain text            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Token Handling
```
┌─────────────────────────────────────────────────────────────────┐
│ JWT Token Flow                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Access Token:                                                   │
│   - Short-lived (15 min)                                        │
│   - Contains: sub, tenantId, roles                              │
│   - Sent in Authorization header                                │
│                                                                 │
│ Refresh Token:                                                  │
│   - Long-lived (7 days)                                         │
│   - HttpOnly cookie                                             │
│   - Only sent to /auth/refresh                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Audit Points ✅
- [x] Passwords hashed with Argon2
- [x] No plaintext passwords anywhere
- [x] JWT secrets > 64 characters
- [x] Tokens not logged
- [x] Sensitive fields excluded from logs

---

## 7. Multi-Tenant Data Isolation

### Isolation Strategy
```
┌─────────────────────────────────────────────────────────────────┐
│ Tenant Isolation                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Every table has tenantId column                                 │
│ Every query filters by tenantId                                 │
│ TenantId comes from JWT, never from user input                  │
│                                                                 │
│ SELECT * FROM resources                                         │
│ WHERE tenant_id = $1  ← From JWT                                │
│   AND status = $2     ← From user input                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Query Pattern
```typescript
// Service layer - tenantId always from authenticated user
async getResources(tenantId: string, filters: ResourceFilters) {
  return prisma.resource.findMany({
    where: {
      tenantId,  // ← Required, from auth context
      ...filters,
    },
  });
}
```

### Audit Points ✅
- [x] TenantId on all entities
- [x] TenantId from JWT, not request body
- [x] Cross-tenant access blocked
- [x] Foreign key constraints include tenantId
- [x] No way to query without tenantId

---

## 8. Error Handling & Logging

### Error Response Sanitization
```typescript
// Production error response
{
  error: "Resource not found",
  code: "NOT_FOUND"
}

// NEVER returned:
{
  error: "Resource not found",
  code: "NOT_FOUND",
  stack: "Error: ...",           // ❌ No stack traces
  query: "SELECT * FROM ...",    // ❌ No SQL queries
  details: { passwordHash: "..." } // ❌ No sensitive data
}
```

### Logging Rules
```
✅ Log: Request method, path, status, duration
✅ Log: User ID, tenant ID for audit
✅ Log: Error codes and messages

❌ Never Log: Passwords
❌ Never Log: Full JWT tokens
❌ Never Log: Credit card numbers
❌ Never Log: Full email addresses (mask if needed)
```

### Audit Points ✅
- [x] Stack traces hidden in production
- [x] Generic error messages to clients
- [x] Sensitive data excluded from logs
- [x] Request logging for audit trail
- [x] Error logging for debugging

---

## 9. Webhook Data Flow

### Webhook Delivery
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Event     │───▶│  Webhook    │───▶│   Sign &    │───▶│   External  │
│  Trigger    │    │   Service   │    │   Deliver   │    │   Endpoint  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                   │                  │                  │
      │ 1. Event occurs   │                  │                  │
      │ (e.g., resource   │                  │                  │
      │  created)         │                  │                  │
      │───────────────────▶                  │                  │
      │                   │ 2. Find matching │                  │
      │                   │ webhooks         │                  │
      │                   │──────────────────▶                  │
      │                   │                  │ 3. Build payload │
      │                   │                  │ Sign with secret │
      │                   │                  │──────────────────▶
      │                   │                  │                  │
      │                   │                  │ 4. POST to URL   │
      │                   │                  │ with signature   │
      │                   │                  │──────────────────▶
```

### Webhook Payload Structure
```json
{
  "event": "resource.created",
  "timestamp": "2025-12-16T10:00:00.000Z",
  "tenantId": "tenant-123",
  "data": {
    "resourceId": "uuid",
    "employeeId": "NV001",
    "name": "John Doe"
    // No sensitive data
  }
}
```

### Audit Points ✅
- [x] HMAC signature for verification
- [x] No sensitive data in payload
- [x] Retry with exponential backoff
- [x] Delivery status tracked
- [x] Webhook URL validated (HTTPS only in prod)

---

## 10. Security Summary

### Implemented Controls

| Control | Status | Implementation |
|---------|--------|----------------|
| SQL Injection | ✅ | Prisma parameterized queries |
| XSS | ✅ | Content-Type headers, CSP |
| CSRF | ✅ | SameSite cookies |
| Authentication | ✅ | JWT + Refresh tokens |
| Authorization | ✅ | RBAC, tenant isolation |
| Rate Limiting | ✅ | express-rate-limit |
| Input Validation | ✅ | Zod schemas |
| Password Security | ✅ | Argon2 hashing |
| HTTPS | ✅ | Enforced in production |
| Security Headers | ✅ | Helmet middleware |
| Logging | ✅ | Winston, no sensitive data |
| Audit Trail | ✅ | AuditLog entity |

### Recommendations

1. **Add CSP headers** - Content Security Policy for additional XSS protection
2. **Enable HIDS** - Host-based intrusion detection
3. **Regular security audits** - Quarterly penetration testing
4. **Dependency scanning** - npm audit in CI/CD
5. **Secret rotation** - JWT secrets rotated periodically

---

*Audit completed: December 16, 2025*

