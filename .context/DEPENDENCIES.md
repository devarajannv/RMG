# Dependencies & Technology Stack

> **Version:** 1.0  
> **Last Updated:** 2025-12-06T00:00:00Z  
> **Status:** APPROVED

---

## Overview

This document defines all technology choices, library versions, and external dependencies for RMGaaS. **AI assistants MUST use these exact versions and libraries. Do NOT suggest alternatives without creating an ADR.**

---

## Technology Stack Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RMGaaS TECHNOLOGY STACK                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         FRONTEND                                     │   │
│  │  React 18 │ TypeScript 5.3 │ Vite 5 │ TailwindCSS 3.4               │   │
│  │  TanStack Query │ Zustand │ React Router 6 │ shadcn/ui              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         API LAYER                                    │   │
│  │  REST (Express) │ GraphQL (Apollo Server) │ WebSocket               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         BACKEND                                      │   │
│  │  Node.js 20 LTS │ Express 4.18 │ TypeScript 5.3                     │   │
│  │  Prisma 5.x │ Zod │ Winston │ Bull (Queues)                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         DATA LAYER                                   │   │
│  │  PostgreSQL 16 │ Redis 7 │ ClickHouse (Analytics)                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         INFRASTRUCTURE                               │   │
│  │  Docker │ Ubuntu 22.04 │ Nginx │ GitHub Actions                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Dependencies

### Core Framework

| Package | Version | Purpose | Locked? |
|---------|---------|---------|---------|
| `react` | ^18.2.0 | UI library | ✅ Major |
| `react-dom` | ^18.2.0 | React DOM bindings | ✅ Major |
| `typescript` | ^5.3.0 | Type safety | ✅ Major |
| `vite` | ^5.0.0 | Build tool & dev server | ✅ Major |

### State Management

| Package | Version | Purpose |
|---------|---------|---------|
| `@tanstack/react-query` | ^5.17.0 | Server state management |
| `zustand` | ^4.4.0 | Client state management |

### Routing

| Package | Version | Purpose |
|---------|---------|---------|
| `react-router-dom` | ^6.21.0 | Client-side routing |

### UI Components

| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | ^3.4.0 | Utility-first CSS |
| `@radix-ui/*` | latest | Accessible UI primitives (via shadcn) |
| `class-variance-authority` | ^0.7.0 | Component variants |
| `clsx` | ^2.1.0 | Class name utility |
| `tailwind-merge` | ^2.2.0 | Tailwind class merging |
| `lucide-react` | ^0.303.0 | Icon library |

### Forms & Validation

| Package | Version | Purpose |
|---------|---------|---------|
| `react-hook-form` | ^7.49.0 | Form management |
| `@hookform/resolvers` | ^3.3.0 | Validation resolvers |
| `zod` | ^3.22.0 | Schema validation |

### Data Fetching

| Package | Version | Purpose |
|---------|---------|---------|
| `@apollo/client` | ^3.8.0 | GraphQL client |
| `graphql` | ^16.8.0 | GraphQL language |

### Charts & Visualization

| Package | Version | Purpose |
|---------|---------|---------|
| `recharts` | ^2.10.0 | Charts library |
| `date-fns` | ^3.0.0 | Date manipulation |

### Tables

| Package | Version | Purpose |
|---------|---------|---------|
| `@tanstack/react-table` | ^8.11.0 | Headless table |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/react` | ^18.2.0 | React types |
| `@types/react-dom` | ^18.2.0 | React DOM types |
| `@vitejs/plugin-react` | ^4.2.0 | Vite React plugin |
| `eslint` | ^8.56.0 | Linting |
| `eslint-plugin-react-hooks` | ^4.6.0 | React hooks rules |
| `prettier` | ^3.2.0 | Code formatting |
| `autoprefixer` | ^10.4.0 | CSS prefixing |
| `postcss` | ^8.4.0 | CSS processing |

---

## Backend Dependencies

### Core

| Package | Version | Purpose | Locked? |
|---------|---------|---------|---------|
| `node` | 20.x LTS | Runtime | ✅ Major |
| `typescript` | ^5.3.0 | Type safety | ✅ Major |
| `express` | ^4.18.0 | HTTP framework | ✅ Major |

### Database & ORM

| Package | Version | Purpose |
|---------|---------|---------|
| `prisma` | ^5.8.0 | ORM & migrations |
| `@prisma/client` | ^5.8.0 | Database client |

### Authentication

| Package | Version | Purpose |
|---------|---------|---------|
| `jsonwebtoken` | ^9.0.0 | JWT signing/verification |
| `argon2` | ^0.31.0 | Password hashing |
| `cookie-parser` | ^1.4.0 | Cookie handling |

### Validation

| Package | Version | Purpose |
|---------|---------|---------|
| `zod` | ^3.22.0 | Schema validation |

### GraphQL

| Package | Version | Purpose |
|---------|---------|---------|
| `@apollo/server` | ^4.10.0 | GraphQL server |
| `graphql` | ^16.8.0 | GraphQL language |
| `dataloader` | ^2.2.0 | Batching & caching |

### Caching & Queues

| Package | Version | Purpose |
|---------|---------|---------|
| `ioredis` | ^5.3.0 | Redis client |
| `bull` | ^4.12.0 | Job queues |

### Logging & Monitoring

| Package | Version | Purpose |
|---------|---------|---------|
| `winston` | ^3.11.0 | Logging |
| `morgan` | ^1.10.0 | HTTP request logging |

### Security

| Package | Version | Purpose |
|---------|---------|---------|
| `helmet` | ^7.1.0 | Security headers |
| `cors` | ^2.8.0 | CORS handling |
| `express-rate-limit` | ^7.1.0 | Rate limiting |

### Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| `uuid` | ^9.0.0 | UUID generation |
| `date-fns` | ^3.0.0 | Date manipulation |
| `lodash` | ^4.17.0 | Utility functions |
| `dotenv` | ^16.3.0 | Environment variables |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/express` | ^4.17.0 | Express types |
| `@types/node` | ^20.10.0 | Node types |
| `ts-node` | ^10.9.0 | TypeScript execution |
| `tsx` | ^4.7.0 | TypeScript execution (fast) |
| `nodemon` | ^3.0.0 | Dev server restart |
| `jest` | ^29.7.0 | Testing framework |
| `@types/jest` | ^29.5.0 | Jest types |
| `supertest` | ^6.3.0 | HTTP testing |
| `@types/supertest` | ^6.0.0 | Supertest types |

---

## Database

### PostgreSQL

| Component | Version | Notes |
|-----------|---------|-------|
| PostgreSQL | 16.x | Primary database |
| Extensions | | |
| - `uuid-ossp` | built-in | UUID generation |
| - `pgcrypto` | built-in | Cryptographic functions |

**Connection String Format:**
```
postgresql://user:password@host:5432/rmgaas?schema=public
```

### Redis

| Component | Version | Notes |
|-----------|---------|-------|
| Redis | 7.x | Caching & queues |

**Connection String Format:**
```
redis://user:password@host:6379/0
```

---

## Infrastructure

### Containerization

| Tool | Version | Purpose |
|------|---------|---------|
| Docker | 24.x | Containerization |
| Docker Compose | 2.x | Local orchestration |

### Web Server

| Tool | Version | Purpose |
|------|---------|---------|
| Nginx | 1.24.x | Reverse proxy, static files |

### Operating System

| OS | Version | Purpose |
|----|---------|---------|
| Ubuntu Server | 22.04 LTS | Production server |

### CI/CD

| Tool | Purpose |
|------|---------|
| GitHub Actions | CI/CD pipelines |

---

## External Services (Future)

| Service | Purpose | Priority |
|---------|---------|----------|
| SendGrid | Email delivery | P1 |
| Sentry | Error tracking | P1 |
| ClickHouse Cloud | Analytics | P2 |
| AWS S3 / Cloudflare R2 | File storage | P2 |

---

## Version Pinning Strategy

### Locked Versions (✅)
- Major versions locked
- Only security patches allowed
- Requires ADR to upgrade

### Flexible Versions (^)
- Minor/patch updates allowed
- Weekly dependency updates
- Automated vulnerability scanning

### Update Process
1. Run `npm audit` weekly
2. Review Dependabot PRs
3. Test in staging before production
4. Document breaking changes

---

## Package.json Templates

### Frontend (client/package.json)

```json
{
  "name": "@rmgaas/client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "test": "vitest",
    "test:ui": "vitest --ui"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.4.0",
    "@apollo/client": "^3.8.0",
    "graphql": "^16.8.0",
    "react-hook-form": "^7.49.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "date-fns": "^3.0.0",
    "recharts": "^2.10.0",
    "@tanstack/react-table": "^8.11.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.303.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "eslint": "^8.56.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "prettier": "^3.2.0",
    "vitest": "^1.2.0",
    "@testing-library/react": "^14.1.0"
  }
}
```

### Backend (server/package.json)

```json
{
  "name": "@rmgaas/server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint . --ext ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "express": "^4.18.0",
    "@apollo/server": "^4.10.0",
    "graphql": "^16.8.0",
    "dataloader": "^2.2.0",
    "@prisma/client": "^5.8.0",
    "ioredis": "^5.3.0",
    "bull": "^4.12.0",
    "jsonwebtoken": "^9.0.0",
    "argon2": "^0.31.0",
    "cookie-parser": "^1.4.0",
    "zod": "^3.22.0",
    "winston": "^3.11.0",
    "morgan": "^1.10.0",
    "helmet": "^7.1.0",
    "cors": "^2.8.0",
    "express-rate-limit": "^7.1.0",
    "uuid": "^9.0.0",
    "date-fns": "^3.0.0",
    "lodash": "^4.17.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/express": "^4.17.0",
    "@types/node": "^20.10.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/cookie-parser": "^1.4.0",
    "@types/morgan": "^1.9.0",
    "@types/cors": "^2.8.0",
    "@types/lodash": "^4.14.0",
    "@types/uuid": "^9.0.0",
    "tsx": "^4.7.0",
    "prisma": "^5.8.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "supertest": "^6.3.0",
    "@types/supertest": "^6.0.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "prettier": "^3.2.0"
  }
}
```

---

## Do NOT Use (Banned)

| Package | Reason | Alternative |
|---------|--------|-------------|
| `moment.js` | Large bundle, deprecated | `date-fns` |
| `axios` | Unnecessary with fetch | Native `fetch` |
| `lodash` (full) | Large bundle | Import specific functions |
| `jquery` | Not needed with React | React |
| `express-validator` | Verbose | `zod` |
| `sequelize` | Less type-safe | `prisma` |
| `mongoose` | Wrong DB choice | `prisma` |
| `passport` | Overcomplicated | Custom JWT |
| `styled-components` | Bundle size | TailwindCSS |
| `material-ui` | Styling conflicts | shadcn/ui |

---

*Last Updated: 2025-12-06T00:00:00Z*
*Version: 1.0*
