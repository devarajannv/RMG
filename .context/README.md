# RMGaaS Context System

> AI-accessible documentation for maintaining context across development sessions

---

## How to Use

**AI Assistants:** Start every session by reading `MASTER_CONTEXT.md` first.

**Developers:** Update relevant files after significant decisions or changes.

---

## Document Index

### Core Documents (Read First)

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [MASTER_CONTEXT.md](./MASTER_CONTEXT.md) | Single source of truth | Every session |
| [CURRENT_STATE.md](./CURRENT_STATE.md) | Current development status | Every session |
| [NEXT_ACTIONS.md](./NEXT_ACTIONS.md) | Priority task queue | Before starting work |

### Strategic Documents

| Document | Purpose |
|----------|---------|
| [PRODUCT_STRATEGY.md](./PRODUCT_STRATEGY.md) | Vision, market, positioning, GTM |
| [USE_CASES.md](./USE_CASES.md) | Complete use case framework by persona |
| [FEATURE_SCOPE.md](./FEATURE_SCOPE.md) | 14-day development scope |
| [DECISIONS_LOG.md](./DECISIONS_LOG.md) | All decisions from strategic sessions |

### Technical Documents

| Document | Purpose |
|----------|---------|
| [TECH_STACK.md](./TECH_STACK.md) | Technology choices and rationale |
| [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) | ADRs (Architecture Decision Records) |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Integration strategy (PeopleStrong, HubSpot, APIs) |
| [DATA_MODEL.md](./DATA_MODEL.md) | Entity definitions and relationships |
| [API_CONTRACTS.md](./API_CONTRACTS.md) | REST and GraphQL specifications |
| [DEPENDENCIES.md](./DEPENDENCIES.md) | Library versions and constraints |
| [ENV_CONFIG.md](./ENV_CONFIG.md) | Environment variables |

### Standards Documents

| Document | Purpose |
|----------|---------|
| [CODING_STANDARDS.md](./CODING_STANDARDS.md) | Code style and conventions |
| [SECURITY_REQUIREMENTS.md](./SECURITY_REQUIREMENTS.md) | Security requirements (all must-have) |
| [BRAND_GUIDELINES.md](./BRAND_GUIDELINES.md) | UI/UX, colors, typography |

### Process Documents

| Document | Purpose |
|----------|---------|
| [WORKFLOWS.md](./WORKFLOWS.md) | Business process definitions |
| [GLOSSARY.md](./GLOSSARY.md) | Domain terminology |
| [BLOCKERS.md](./BLOCKERS.md) | Current blockers |
| [SESSION_LOG.md](./SESSION_LOG.md) | Session history |

---

## Quick Reference

### Project Identity

- **Product:** RMGaaS (Resource Management & Governance as a Service)
- **Owner:** NewVision Software
- **Product Owner:** Devarajan
- **Development Model:** AI-Led (Cursor)
- **Timeline:** 14 days

### Tech Stack Summary

```
Frontend:  React 18 + Vite + TailwindCSS + shadcn/ui
Backend:   Node.js + Express + TypeScript
Database:  PostgreSQL 16 + Redis
ORM:       Prisma
API:       REST (mutations) + GraphQL (queries)
Auth:      JWT + Argon2
Deploy:    Docker + Ubuntu Server
```

### Key Decisions

1. **Target Market:** IT + Engineering Services, 1000+ employees, Global
2. **Intelligence:** Rules-based (day 1) + ML (as data grows)
3. **Security:** ALL requirements are MUST-HAVE
4. **Theme:** Light only, professional, no gaudy colors
5. **First Customer:** NewVision (dogfooding)
6. **GTM:** Product-Led Growth

---

## Document Versioning

| Document | Version | Status |
|----------|---------|--------|
| MASTER_CONTEXT | 2.0 | ✅ Approved |
| CURRENT_STATE | 2.0 | ✅ Day 8 Complete |
| NEXT_ACTIONS | 2.0 | ✅ Day 9 Ready |
| FEATURE_SCOPE | 1.1 | ✅ Progress Updated |
| SESSION_LOG | 1.2 | ✅ Session 003 Added |
| PRODUCT_STRATEGY | 1.0 | ✅ Approved |
| USE_CASES | 1.0 | ✅ Approved |
| TECH_STACK | 1.0 | ✅ Approved |
| SECURITY_REQUIREMENTS | 1.0 | ✅ Approved |
| BRAND_GUIDELINES | 1.0 | ✅ Approved |
| DECISIONS_LOG | 1.0 | ✅ Living |
| INTEGRATIONS | 1.0 | ✅ Approved |

---

## Session History

### 2025-12-15: Session 001 - Strategic Planning

**Focus:** Product strategy, market positioning, feature scope, tech stack, security requirements

**Key Outputs:**
- All strategy documents created
- Ready for development

---

### 2025-12-15: Session 002 - Development Days 1-7

**Focus:** Foundation, Auth, Resource, Client, Project, Contract, Dashboard

**Key Outputs:**
- Full backend API
- All frontend pages
- Real data imported

---

### 2025-12-15: Session 003 - UI Fixes + Day 8

**Focus:** UI overhaul, CSV import fixes, Timesheet Management

**Key Outputs:**
- UI branded with NewVision colors
- 1,504 resources imported from CSV
- Timesheet weekly grid + approval workflow
- Dev/Prod environment toggle

**Current Status:** Day 8 Complete, Ready for Day 9

---

## Quick Start for Next Session

```bash
# 1. Start Docker containers (if not running)
cd /home/devarajan/RMG/RMG
sudo docker-compose up -d postgres redis

# 2. Start API server
cd apps/api && npm run dev &

# 3. Start Frontend
cd apps/frontend && npm run dev &

# 4. Access app
# URL: http://localhost:3000
# Login: admin@newvision.in / Password123!@#
```

## What to Do Next

1. Read CURRENT_STATE.md for implementation details
2. Read NEXT_ACTIONS.md for Day 9 tasks
3. Start Day 9: Skill Matching & Search

---

*Last Updated: 2025-12-15 (Post Day 8)*

