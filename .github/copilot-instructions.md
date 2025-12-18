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

## Current State

- **Backend:** 22 modules, 99 endpoints, 55 models - SOLID
- **Frontend:** 18 pages, missing Request UI & Workflow Builder
- **AI:** 100% SIMULATED - no real LLM calls exist

## Implementation Priority

1. Complete traditional UI (Request Flow, Workflow Builder)
2. Add permission system to frontend
3. Then add real AI layer

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
