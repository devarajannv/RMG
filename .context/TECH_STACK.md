# RMGaaS Technology Stack

> **Document Status:** APPROVED  
> **Last Updated:** 2025-12-15  
> **Version:** 1.0  
> **Target Environment:** Ubuntu Server (initial), Cloud (future)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOAD BALANCER                                   │
│                          (Nginx Reverse Proxy)                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             FRONTEND                                         │
│                    React 18 + Vite + TailwindCSS                            │
│                    shadcn/ui + TanStack Query                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             BACKEND API                                      │
│                    Node.js + Express + TypeScript                           │
│                    REST (mutations) + GraphQL (queries)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
     ┌────────────────┐    ┌────────────────┐    ┌────────────────┐
     │   PostgreSQL   │    │     Redis      │    │   File Store   │
     │    (Primary)   │    │ (Cache/Queue)  │    │   (uploads)    │
     └────────────────┘    └────────────────┘    └────────────────┘
```

---

## Frontend Stack

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **React** | 18.x | UI Framework | Industry standard, excellent DX |
| **Vite** | 5.x | Build Tool | Lightning fast HMR, modern ESM |
| **TypeScript** | 5.x | Type Safety | Catch errors early, AI works better |
| **TailwindCSS** | 3.x | Styling | Rapid development, consistent design |
| **shadcn/ui** | latest | Component Library | Beautiful, accessible, customizable |
| **TanStack Query** | 5.x | Server State | Caching, sync, real-time updates |
| **Zustand** | 4.x | Client State | Simple, performant local state |
| **React Router** | 6.x | Routing | Standard React routing |
| **Zod** | 3.x | Validation | Runtime type checking, shared schemas |
| **date-fns** | 3.x | Date Handling | Lightweight, tree-shakeable |
| **Recharts** | 2.x | Charts | React-native charting |
| **@tanstack/react-table** | 8.x | Tables | Powerful, headless tables |
| **React Hook Form** | 7.x | Forms | Performant form handling |
| **Motion** | 11.x | Animations | Smooth, delightful animations |

---

## Backend Stack

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **Node.js** | 20.x LTS | Runtime | Stable, TypeScript native |
| **Express** | 4.x | Web Framework | Simple, proven, flexible |
| **TypeScript** | 5.x | Type Safety | Consistency with frontend |
| **Prisma** | 5.x | ORM | Type-safe DB access, migrations |
| **GraphQL Yoga** | 5.x | GraphQL Server | Modern, performant |
| **Zod** | 3.x | Validation | Shared schemas frontend/backend |
| **JWT** | jsonwebtoken | Auth Tokens | Stateless authentication |
| **Argon2** | argon2 | Password Hashing | Most secure hashing algorithm |
| **Bull** | 5.x | Job Queue | Background processing |
| **Winston** | 3.x | Logging | Structured, leveled logging |
| **Helmet** | 7.x | Security Headers | OWASP compliance |
| **cors** | 2.x | CORS | Cross-origin handling |
| **multer** | 1.x | File Upload | Excel/CSV import |
| **xlsx** | latest | Excel Parsing | Data import |
| **nodemailer** | 6.x | Email | Notifications |

---

## Database Stack

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **PostgreSQL** | 16.x | Primary Database | RLS, JSONB, enterprise-grade |
| **Redis** | 7.x | Cache + Queue | Session, cache, job queue |
| **Prisma** | 5.x | ORM | Migrations, type safety |

### PostgreSQL Features Used

- **Row Level Security (RLS)** - Tenant isolation at database level
- **JSONB** - Flexible metadata storage
- **UUID** - Primary keys
- **Indexes** - B-tree, GIN for search
- **Triggers** - Audit logging
- **Views** - Dashboard aggregations

---

## Infrastructure Stack

| Technology | Purpose | Environment |
|------------|---------|-------------|
| **Docker** | Containerization | All |
| **Docker Compose** | Orchestration | Dev, Initial Prod |
| **Nginx** | Reverse Proxy, SSL | Production |
| **systemd** | Process Management | Ubuntu Server |
| **Let's Encrypt** | SSL Certificates | Production |

### Initial Deployment (Ubuntu Server)

```
Ubuntu Server 22.04/24.04 LTS
├── Docker Engine
├── Docker Compose
│   ├── rmg-frontend (Nginx + React build)
│   ├── rmg-api (Node.js)
│   ├── rmg-postgres (PostgreSQL 16)
│   └── rmg-redis (Redis 7)
├── Nginx (host-level reverse proxy)
└── SSL via Let's Encrypt
```

### Future Cloud Migration Path

| Component | Ubuntu Server | AWS | Azure | GCP |
|-----------|---------------|-----|-------|-----|
| Compute | Docker | ECS/EKS | AKS | GKE |
| Database | Docker PostgreSQL | RDS | Azure DB | Cloud SQL |
| Cache | Docker Redis | ElastiCache | Azure Cache | Memorystore |
| CDN | - | CloudFront | Azure CDN | Cloud CDN |
| Storage | Local | S3 | Blob | GCS |
| DNS | Local | Route 53 | Azure DNS | Cloud DNS |

---

## Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Linting |
| **Prettier** | Code Formatting |
| **Vitest** | Unit Testing |
| **Playwright** | E2E Testing |
| **Husky** | Git Hooks |
| **lint-staged** | Pre-commit Checks |
| **commitlint** | Commit Message Enforcement |
| **GitHub Actions** | CI/CD |

---

## Security Implementation

| Concern | Solution |
|---------|----------|
| **SQL Injection** | Prisma ORM (parameterized queries) |
| **XSS** | React (auto-escape), CSP headers |
| **CSRF** | SameSite cookies, token validation |
| **Password Storage** | Argon2 hashing |
| **Authentication** | JWT + HttpOnly refresh tokens |
| **Authorization** | RBAC + RLS |
| **Headers** | Helmet.js (security headers) |
| **Rate Limiting** | Express rate limiter |
| **Secrets** | Environment variables, no commits |
| **Dependencies** | npm audit, Dependabot |
| **HTTPS** | TLS 1.3 everywhere |

---

## UI/UX Specifications

### Branding

| Element | Specification |
|---------|---------------|
| **Logo** | NewVision logo (`New-Vision-2023.png`) |
| **Tagline** | "THINK FORWARD" |
| **Theme** | Light theme only (initially) |
| **Colors** | Derived from logo - grays, blues, teals, accents |

### Color Palette (from logo)

```css
:root {
  /* Primary - from logo text */
  --color-primary-900: #4a4a4a;  /* Dark gray text */
  --color-primary-700: #666666;
  --color-primary-500: #808080;
  
  /* Accent - from logo arrow */
  --color-accent-blue: #0077b6;   /* Deep blue */
  --color-accent-teal: #00b4d8;   /* Teal */
  --color-accent-orange: #f77f00; /* Orange */
  --color-accent-yellow: #fcbf49; /* Yellow */
  
  /* Backgrounds */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f8f9fa;
  --color-bg-tertiary: #e9ecef;
  
  /* Semantic */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
}
```

### Design Principles

1. **Clean & Professional** - Enterprise SaaS, not consumer app
2. **Light Theme** - No dark mode initially
3. **No Gaudy Colors** - Muted, professional palette
4. **Information Dense** - Show data without clutter
5. **Fast** - Performance is UX feature
6. **Accessible** - WCAG 2.1 AA compliance

### Performance Standards

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Time to Interactive | < 3s |
| Cumulative Layout Shift | < 0.1 |
| Bundle Size (gzipped) | < 250KB initial |

---

## Folder Structure

```
rmg/
├── apps/
│   ├── frontend/           # React app
│   │   ├── src/
│   │   │   ├── components/ # UI components
│   │   │   ├── features/   # Feature modules
│   │   │   ├── hooks/      # Custom hooks
│   │   │   ├── lib/        # Utilities
│   │   │   ├── pages/      # Route pages
│   │   │   └── stores/     # Zustand stores
│   │   └── ...
│   └── api/                # Backend
│       ├── src/
│       │   ├── modules/    # Feature modules
│       │   ├── middleware/ # Express middleware
│       │   ├── lib/        # Shared utilities
│       │   └── ...
│       └── ...
├── packages/
│   └── shared/             # Shared code
│       ├── schemas/        # Zod schemas
│       ├── types/          # TypeScript types
│       └── utils/          # Shared utilities
├── docker/                 # Docker configs
├── docs/                   # Documentation
├── .context/               # AI context files
└── .specs/                 # Feature specs
```

---

## Version Pinning Strategy

- **Major versions:** Pin exactly (React 18, not 19)
- **Minor versions:** Allow range (^18.2.0)
- **Lock file:** Always commit package-lock.json
- **Updates:** Monthly security reviews

---

## Banned Technologies

| Banned | Reason | Alternative |
|--------|--------|-------------|
| Moment.js | Deprecated, large | date-fns |
| Lodash (full) | Large bundle | lodash-es or native |
| jQuery | Not needed | React |
| bcrypt | Less secure | Argon2 |
| Sequelize | Prisma is better | Prisma |
| Material UI | Overweight | shadcn/ui |
| Redux | Overkill | Zustand |

---

*Document created from strategic deliberation session on 2025-12-15*

