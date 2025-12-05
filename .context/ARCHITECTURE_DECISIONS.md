# Architecture Decision Records

> **Document Status:** Living Document  
> **Last Updated:** 2025-12-06T00:00:00Z  
> **Total ADRs:** 5

---

## Table of Contents

1. [ADR-001: PostgreSQL as Primary Database](#adr-001-postgresql-as-primary-database)
2. [ADR-002: REST + GraphQL Hybrid API](#adr-002-rest--graphql-hybrid-api)
3. [ADR-003: React + Vite + TailwindCSS Frontend](#adr-003-react--vite--tailwindcss-frontend)
4. [ADR-004: Multi-Tenant Architecture](#adr-004-multi-tenant-architecture)
5. [ADR-005: JWT Authentication with Refresh Tokens](#adr-005-jwt-authentication-with-refresh-tokens)

---

## Decision Status Legend

| Status | Meaning |
|--------|---------|
| ✅ Accepted | Decision made and in effect |
| 🔄 Superseded | Replaced by newer decision |
| ❌ Rejected | Considered but not adopted |
| 🤔 Proposed | Under discussion |

---

## ADR-001: PostgreSQL as Primary Database

**Status:** ✅ Accepted  
**Date:** 2025-12-06  
**Deciders:** Tech Lead  
**Category:** Database

### Context

We need to choose a primary database for RMGaaS that can handle:
- Multi-tenant data isolation
- Complex queries (resource matching, capacity planning)
- ACID compliance for financial calculations
- JSON storage for flexible schema needs
- Good TypeScript/Prisma support

### Options Considered

1. **PostgreSQL** - Enterprise-grade relational database
2. **MySQL** - Popular relational database
3. **MongoDB** - Document database
4. **SQL Server** - Microsoft's enterprise database

### Decision

**PostgreSQL 16** as the primary database.

### Rationale

- **Row-Level Security (RLS)** - Native support for multi-tenant isolation
- **JSONB** - Flexible schema for metadata without sacrificing queries
- **Performance** - Excellent for complex analytical queries
- **Prisma Support** - First-class support with migrations
- **Cost** - Open source, no licensing fees
- **Ecosystem** - TimescaleDB extension for time-series if needed
- **Proven** - Used by GitLab, Notion, Supabase at scale

### Consequences

**Positive:**
- Strong data integrity
- Powerful query capabilities
- Good tooling ecosystem

**Negative:**
- Horizontal scaling more complex than NoSQL
- Requires more schema planning upfront

**Mitigations:**
- Use connection pooling (PgBouncer)
- Consider read replicas for scale
- Design schema for sharding future if needed

### Related ADRs
- ADR-004 (Multi-Tenant Architecture)

---

## ADR-002: REST + GraphQL Hybrid API

**Status:** ✅ Accepted  
**Date:** 2025-12-06  
**Deciders:** Tech Lead  
**Category:** API Design

### Context

Need to decide on API architecture for RMGaaS that supports:
- Multiple client types (web, mobile, third-party)
- Complex data fetching (dashboards with multiple entities)
- Real-time updates
- File uploads
- Webhooks

### Options Considered

1. **REST Only** - Traditional RESTful API
2. **GraphQL Only** - Facebook's query language
3. **REST + GraphQL Hybrid** - Best of both worlds
4. **gRPC** - High-performance RPC

### Decision

**Hybrid approach:**
- **GraphQL** for queries (reading data)
- **REST** for mutations (write operations)
- **WebSockets** for real-time (via GraphQL subscriptions)

### Rationale

**GraphQL for Queries:**
- Dashboards can fetch exactly needed data in one request
- No over-fetching or under-fetching
- Self-documenting schema
- Great developer experience

**REST for Mutations:**
- Simpler error handling
- Better for file uploads
- Easier to cache/invalidate
- More predictable behavior
- Better webhook compatibility

### API Structure

```
/api/v1/
├── graphql              # All queries
├── auth/                # REST: login, logout, refresh
├── resources/           # REST: CRUD operations
├── allocations/         # REST: CRUD operations
├── projects/            # REST: CRUD operations
├── reports/             # REST: Generate reports
└── webhooks/            # REST: Webhook endpoints
```

### Consequences

**Positive:**
- Flexible querying for complex UIs
- Simple mutations
- Clear separation of concerns

**Negative:**
- Two paradigms to learn
- More complex API surface

**Mitigations:**
- Clear documentation on when to use which
- Consistent patterns across all REST endpoints

---

## ADR-003: React + Vite + TailwindCSS Frontend

**Status:** ✅ Accepted  
**Date:** 2025-12-06  
**Deciders:** Tech Lead  
**Category:** Frontend

### Context

Need to select frontend stack for RMGaaS that supports:
- Complex dashboard UIs
- Real-time updates
- Mobile-responsive design
- Fast development iteration
- Good AI assistant compatibility

### Options Considered

1. **React + Vite + Tailwind** - Modern React stack
2. **Next.js + Tailwind** - Full-stack React framework
3. **Vue.js + Vite** - Alternative reactive framework
4. **Angular** - Enterprise framework

### Decision

**React 18 + Vite + TailwindCSS + shadcn/ui**

### Rationale

**React 18:**
- Concurrent features for better UX
- Huge ecosystem
- Best AI assistant support (most training data)
- Strong TypeScript integration

**Vite:**
- Lightning-fast HMR
- Simpler than Webpack
- Native ESM support
- Better DX than CRA

**TailwindCSS:**
- Utility-first = faster development
- Consistent design system
- Small bundle with purging
- Great with AI (AI writes Tailwind well)

**shadcn/ui:**
- Copy-paste components (not a dependency)
- Full control and customization
- Accessible by default
- Beautiful defaults

### Consequences

**Positive:**
- Very fast development
- Consistent styling
- Good performance
- AI writes this stack well

**Negative:**
- Tailwind has learning curve
- HTML can get verbose

**Mitigations:**
- Use component extraction
- Create design system tokens
- Document common patterns

---

## ADR-004: Multi-Tenant Architecture

**Status:** ✅ Accepted  
**Date:** 2025-12-06  
**Deciders:** Tech Lead  
**Category:** Architecture

### Context

RMGaaS must support multiple organizations (tenants) with:
- Complete data isolation
- Per-tenant customization
- Scalable pricing tiers
- Potential for dedicated instances

### Options Considered

1. **Single Database, Shared Tables** - tenant_id column
2. **Single Database, Schema per Tenant** - PostgreSQL schemas
3. **Database per Tenant** - Complete isolation
4. **Hybrid** - Based on tier

### Decision

**Hybrid approach based on tier:**

| Tier | Isolation Level | Notes |
|------|-----------------|-------|
| Free/Starter | Row-Level Security (RLS) | Shared tables, tenant_id filter |
| Professional | Schema per Tenant | Separate schema, same database |
| Enterprise | Database per Tenant | Complete isolation |

### Rationale

**RLS for Small Tenants:**
- Cost-effective
- Easy to manage
- Sufficient isolation for most cases

**Schema per Tenant for Professional:**
- Better performance isolation
- Easier backup/restore per tenant
- Can have custom indexes

**Database per Tenant for Enterprise:**
- Complete isolation (compliance)
- Independent scaling
- Can be in specific regions

### Implementation

```typescript
// Middleware extracts tenant from JWT
const tenant = extractTenant(request);

// Connection pool per isolation level
if (tenant.tier === 'enterprise') {
  return getEnterpriseConnection(tenant.databaseUrl);
} else if (tenant.tier === 'professional') {
  return getSchemaConnection(tenant.schemaName);
} else {
  return getSharedConnection().withRLS(tenant.id);
}
```

### Consequences

**Positive:**
- Flexible pricing model
- Appropriate isolation per tier
- Cost-effective scaling

**Negative:**
- Complex connection management
- Migration complexity (multiple targets)

**Mitigations:**
- Abstraction layer for tenant context
- Automated migration tooling
- Thorough testing per isolation mode

---

## ADR-005: JWT Authentication with Refresh Tokens

**Status:** ✅ Accepted  
**Date:** 2025-12-06  
**Deciders:** Tech Lead  
**Category:** Security

### Context

Need authentication mechanism that supports:
- Stateless API servers
- Multiple devices per user
- Secure token storage
- Multi-tenant context
- SSO integration (future)

### Options Considered

1. **Session-based** - Server-side sessions
2. **JWT only** - Access tokens only
3. **JWT + Refresh** - Access + refresh tokens
4. **OAuth2/OIDC** - Full OAuth implementation

### Decision

**JWT with Refresh Tokens stored in HttpOnly cookies**

### Token Design

```typescript
// Access Token (15 min expiry)
{
  sub: "user-uuid",
  tenantId: "tenant-uuid",
  role: "admin",
  permissions: ["read:resources", "write:resources"],
  exp: 1234567890
}

// Refresh Token (7 day expiry)
{
  sub: "user-uuid",
  tenantId: "tenant-uuid",
  tokenFamily: "family-uuid",  // For rotation
  exp: 1234567890
}
```

### Storage

| Token | Storage | Notes |
|-------|---------|-------|
| Access | Memory + HttpOnly Cookie | Short-lived |
| Refresh | HttpOnly Cookie | Secure, SameSite=Strict |

### Rationale

- **Stateless** - No server-side session storage
- **Secure** - HttpOnly prevents XSS token theft
- **Scalable** - Any server can validate JWT
- **Flexible** - Can add SSO later via OIDC

### Refresh Flow

```
1. Access token expires
2. Client calls /api/auth/refresh with refresh cookie
3. Server validates refresh token
4. Server issues new access + refresh tokens
5. Old refresh token invalidated (rotation)
```

### Consequences

**Positive:**
- Stateless and scalable
- Secure token storage
- Standard approach

**Negative:**
- Token revocation is eventual (15 min window)
- Refresh token rotation adds complexity

**Mitigations:**
- Token blacklist in Redis for immediate revocation
- Token family tracking for rotation detection

---

## Template for New ADRs

```markdown
## ADR-XXX: [Title]

**Status:** 🤔 Proposed  
**Date:** YYYY-MM-DD  
**Deciders:** [Names]  
**Category:** [Database/API/Frontend/Architecture/Security/etc.]

### Context

[What is the issue/need that requires a decision?]

### Options Considered

1. **Option A** - Brief description
2. **Option B** - Brief description
3. **Option C** - Brief description

### Decision

**[Chosen option]**

### Rationale

[Why was this option chosen? What factors influenced the decision?]

### Consequences

**Positive:**
- [benefit 1]
- [benefit 2]

**Negative:**
- [drawback 1]
- [drawback 2]

**Mitigations:**
- [how to address drawbacks]

### Related ADRs
- ADR-XXX (if any)
```

---

## How to Add an ADR

Use the `ctx-adr` script:

```powershell
.\ctx-adr.ps1 -Title "Use Redis for Caching" `
              -Category "Infrastructure" `
              -Decision "Redis Cluster for distributed caching" `
              -Rationale "High performance, pub/sub support, Prisma integration"
```

Or add manually following the template above.
