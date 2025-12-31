# RMGaaS - AI Assistant Instructions

> **⚠️ READ ARCHITECTURE.md FIRST**  
> Before doing ANY work, read `/ARCHITECTURE.md` completely.
> It contains all architectural decisions and constraints.

## Quick Context

### Product Model: Writer + Scribe

```
WRITER = Core Product (MUST work without AI)
SCRIBE = AI Layer (Accelerates everything, never required)
```

### Two-Portal Architecture

```
PLATFORM PORTAL (platform.product.com) = NewVision internal admin
  - Tenant provisioning, billing, support tools
  - NOT BUILT YET (Phase 1.5 in roadmap)

TENANT APP (app.product.com) = Customer-facing application
  - All users including tenant admins
  - Organization Onboarding lives here
```

### The Litmus Test

> "If OpenAI's API went down for a week, would users still be productive?"
> 
> **Answer must be: YES**

### AI Role by Phase

| Phase | AI Role |
|-------|---------|
| Onboarding | PRIMARY (recommended path) |
| Workflow Config | PRIMARY (recommended path) |
| Daily Operations | OPTIONAL (accelerator) |

### What AI CANNOT Do

1. Approve/reject workflow steps
2. Complete workflows for users
3. Override permissions
4. Act without confirmation (Tier 3+)
5. Access data user cannot see
6. Submit without user review

## 🚨 Current Critical Blocker

**Organization Onboarding Module is MISSING.**

Features like Workflow Builder have empty dropdowns because foundational data (roles, org structure, users) doesn't exist for new tenants.

**This is Phase 0 in the roadmap - must be built first.**

## Current State

- **Backend:** 22 modules, 99 endpoints, 55 models - SOLID
- **Frontend:** 18 pages, Workflow Builder exists but non-functional without org data
- **AI:** 100% SIMULATED - no real LLM calls exist
- **Platform Portal:** NOT STARTED
- **Org Onboarding:** NOT STARTED ← **BLOCKING**

## Implementation Priority (Updated Dec 31, 2025)

1. **Phase 0:** Organization Onboarding Module (BLOCKING)
   - Org Identity, Structure, Roles, People Setup flows
   - Without this, product cannot be used
   
2. **Phase 1.5:** Platform Portal (Minimum Viable)
   - Tenant provisioning for NewVision staff
   - Without this, can't onboard customers
   
3. **Phase 2:** AI Layer
   - LLM integration, onboarding agent
   - Accelerates but not required

## Key Files

```
/ARCHITECTURE.md         ← Source of truth (READ FIRST)
/ALIGNMENT_TRACKER.md    ← Progress tracker
/apps/api/               ← Backend (Express + Prisma)
/apps/frontend/          ← Frontend (React + Vite)
/docs/                   ← Detailed documentation
```

## Tech Stack

- Backend: Express.js + TypeScript + Prisma + PostgreSQL
- Frontend: React + Vite + TanStack Query + Zustand
- UI: Tailwind CSS + shadcn/ui
- AI: [Not yet implemented - currently simulated]

## Before You Code

1. ✅ Read `/ARCHITECTURE.md`
2. ✅ Check `/ALIGNMENT_TRACKER.md` for current status
3. ✅ Understand Writer + Scribe model
4. ✅ Verify your change aligns with architecture
5. ✅ Update tracker if completing a milestone
