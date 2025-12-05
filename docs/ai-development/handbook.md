# AI-Led Development Handbook

> **The definitive guide for AI-augmented software development at NewVision**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [The Context System](#3-the-context-system)
4. [Daily Workflow](#4-daily-workflow)
5. [Working with AI](#5-working-with-ai)
6. [Team Collaboration](#6-team-collaboration)
7. [Code Reviews](#7-code-reviews)
8. [Quality Assurance](#8-quality-assurance)
9. [Troubleshooting](#9-troubleshooting)
10. [Best Practices](#10-best-practices)

---

## 1. Introduction

### What is AI-Led Development?

AI-Led Development is a methodology where AI assistants (like GitHub Copilot, Claude, GPT) work alongside human developers as active collaborators rather than just autocomplete tools.

```
Traditional Development          AI-Led Development
═══════════════════════         ═══════════════════════
                                
Human thinks                    Human directs
    ↓                              ↓
Human codes                     AI implements
    ↓                              ↓
Human tests                     Human + AI test
    ↓                              ↓
Human documents                 AI documents
                                    ↓
                                Human reviews
```

### Why This Approach?

| Challenge | Traditional | AI-Led |
|-----------|-------------|--------|
| Boilerplate code | Hours of typing | Seconds |
| Documentation | Often skipped | Always generated |
| Consistency | Varies by developer | Enforced by AI |
| Context switching | Lost context between sessions | Context preserved |
| Knowledge transfer | Meetings, docs | Self-documenting system |

### The Core Problem We Solve

**AI has no memory between sessions.** Every time you start a new chat, the AI forgets everything. This handbook describes our system to solve that problem.

---

## 2. Getting Started

### Prerequisites

1. **Git** installed and configured
2. **Node.js 18+** installed
3. **PowerShell 5.1+** (comes with Windows)
4. **VS Code** with extensions:
   - GitHub Copilot
   - Prisma
   - ESLint
   - Prettier
5. **AI Assistant Access** (Copilot Chat, Claude, etc.)

### Initial Setup

```powershell
# 1. Clone the repository
git clone https://github.com/newvision/rmgaas.git
cd rmgaas

# 2. Add scripts to PATH (one-time)
$env:PATH += ";$PWD\.context\scripts"

# 3. Verify setup
ctx status
```

### Project Structure Overview

```
rmgaas/
├── .context/                 # 🧠 AI CONTEXT SYSTEM
│   ├── scripts/             # CLI tools for context management
│   ├── team/                # Team collaboration data
│   ├── sessions/            # Session tracking
│   ├── features/            # Feature-specific context
│   ├── MASTER_CONTEXT.md    # Product vision (read-only)
│   ├── CURRENT_STATE.md     # What's built
│   ├── NEXT_ACTIONS.md      # Action queue
│   ├── ARCHITECTURE_DECISIONS.md  # ADRs
│   ├── CODING_STANDARDS.md  # How we code
│   └── BLOCKERS.md          # Known issues
│
├── .specs/                   # Requirements & specs
│   ├── personas/            # User stories by persona
│   ├── features/            # Feature specifications
│   └── api/                 # API contracts (OpenAPI)
│
├── docs/                     # 📚 This handbook & user docs
│   └── ai-development/      # AI development guides
│
├── src/                      # 💻 Source code
│   ├── client/              # React frontend
│   ├── server/              # Node.js backend
│   └── shared/              # Shared types & utils
│
└── tests/                    # Integration & E2E tests
```

---

## 3. The Context System

### Why Context Matters

```
SESSION 1                    SESSION 2 (Without Context)
════════════════════        ════════════════════════════
You: "Build auth"           You: "Continue auth work"
AI: "I'll use JWT..."       AI: "What auth? I don't know
     [builds feature]            what you're building."
     
SESSION 2 (With Context)
═══════════════════════════
You: "Read .context/ then continue auth work"
AI: "I see from CURRENT_STATE.md that auth is 60% 
     complete. Last session you built the JWT service.
     Next up: refresh token endpoint. Shall I continue?"
```

### Context Files Explained

| File | Purpose | Who Updates | When |
|------|---------|-------------|------|
| `MASTER_CONTEXT.md` | Product vision, non-negotiables | Tech Lead only | Rarely |
| `CURRENT_STATE.md` | Feature status, what's built | Anyone (via PR) | Every session |
| `NEXT_ACTIONS.md` | Priority task queue | Anyone (via PR) | Daily |
| `ARCHITECTURE_DECISIONS.md` | Technical decisions | Anyone (via ADR process) | When decisions made |
| `CODING_STANDARDS.md` | Development rules | Tech Lead only | Rarely |
| `BLOCKERS.md` | Issues and blockers | Anyone (directly) | As needed |
| `SESSION_LOG.md` | Session history | Auto-generated | Every session |

### The Golden Rule

> **NEVER start coding without first reading context files.**
> **NEVER end a session without updating context files.**

---

## 4. Daily Workflow

### Morning Routine

```powershell
# 1. Pull latest changes
git pull origin main

# 2. Start your session
.\ctx-start.ps1

# 3. Check team status
.\ctx-who.ps1

# 4. Claim a task
.\ctx-claim.ps1 -Id A003
```

### During Development

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT LOOP                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Create feature branch                                          │
│     git checkout -b feature/A003-auth-refresh                      │
│                                                                     │
│  2. Start AI chat session                                          │
│     "Please read these files first:                                │
│      - .context/MASTER_CONTEXT.md                                  │
│      - .context/CURRENT_STATE.md                                   │
│      - .context/CODING_STANDARDS.md                                │
│      Then help me implement [task description]"                    │
│                                                                     │
│  3. AI implements, you review                                       │
│     - Check against coding standards                               │
│     - Run tests frequently                                         │
│     - Commit small, atomic changes                                 │
│                                                                     │
│  4. If you make a decision → ctx-adr                               │
│  5. If you hit a blocker → ctx-blocker                             │
│  6. Periodically → ctx-check                                       │
│                                                                     │
│  7. When task complete:                                            │
│     - Update feature status                                        │
│     - Run ctx-merge-check                                          │
│     - Create PR                                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### End of Day

```powershell
# 1. End your session (documents progress)
.\ctx-end.ps1 -Interactive

# 2. Release or complete tasks
.\ctx-release.ps1 -Id A003 -Complete
# OR if not done:
.\ctx-release.ps1 -Id A003  # Returns to queue

# 3. Push your changes
git push origin feature/A003-auth-refresh

# 4. Create PR if feature complete
```

### Session Workflow Diagram

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  START  │────▶│  CLAIM  │────▶│  CODE   │────▶│   END   │
│ SESSION │     │  TASK   │     │  + AI   │     │ SESSION │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     │               │               │               │
     ▼               ▼               ▼               ▼
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ctx-start│     │ctx-claim│     │ctx-check│     │ctx-end  │
│git pull │     │         │     │ctx-adr  │     │ctx-release
└─────────┘     └─────────┘     │ctx-blocker     │git push │
                                └─────────┘     └─────────┘
```

---

## 5. Working with AI

### The Prompt Template

Always start AI sessions with this template:

```markdown
## Context

Please read these files to understand the project:
1. .context/MASTER_CONTEXT.md - Vision and requirements
2. .context/CURRENT_STATE.md - What's built
3. .context/CODING_STANDARDS.md - How we code
4. .context/ARCHITECTURE_DECISIONS.md - Technical decisions

## My Task

[Describe what you're working on]

## Specific Request

[What you need help with right now]

## Constraints

- Follow the coding standards strictly
- No new dependencies without asking
- Tests are required
- Update context files when done
```

### Do's and Don'ts

```
✅ DO                                    ❌ DON'T
═══════════════════════════════════════════════════════════════
Give full context                       Assume AI remembers anything
Ask AI to read files first              Start coding immediately
Review AI-generated code                Blindly accept AI code
Ask "why" when unsure                   Use code you don't understand
Commit frequently                       Make massive commits
Update context docs                     Skip documentation
Run tests after changes                 Assume AI tests are complete
Check coding standards                  Ignore style violations
```

### Effective Prompting

```markdown
❌ BAD PROMPT:
"Add authentication"

✅ GOOD PROMPT:
"I need to implement JWT authentication for our API.

Context:
- We're using Express.js with TypeScript
- See .context/CODING_STANDARDS.md for our patterns
- Database is PostgreSQL with Prisma
- ADR-005 decided on JWT over sessions

Requirements:
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Tokens stored in httpOnly cookies
- Include user role in token payload

Please:
1. Show me the token service implementation
2. Show me the auth middleware
3. Show me the login controller
4. Include tests for each
```

### When AI Gets It Wrong

```markdown
1. Point out the specific error
2. Reference the standard/ADR it violates
3. Ask for correction with reason

Example:
"This code uses 'any' type on line 15, but our coding
standards require explicit types. Please fix this and
explain why strong typing matters here."
```

---

## 6. Team Collaboration

### Claiming Tasks

Before starting work, ALWAYS claim the task:

```powershell
# See what's available
.\ctx-action.ps1 -List

# Claim a task
.\ctx-claim.ps1 -Id A005 -EstimatedHours 4

# Check who's working on what
.\ctx-who.ps1
```

### Preventing Conflicts

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CONFLICT PREVENTION                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  BEFORE YOU CODE:                                                   │
│  1. Pull latest: git pull origin main                              │
│  2. Check claims: ctx-who                                          │
│  3. Claim task: ctx-claim -Id A005                                 │
│  4. Create branch: git checkout -b feature/A005-description        │
│                                                                     │
│  DURING DEVELOPMENT:                                                │
│  5. Sync often: git fetch origin                                   │
│  6. Rebase if needed: git rebase origin/main                       │
│                                                                     │
│  BEFORE MERGE:                                                      │
│  7. Run: ctx-merge-check                                           │
│  8. Resolve any conflicts                                          │
│  9. Get PR review                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Communication Points

| Situation | Action |
|-----------|--------|
| Starting a task | `ctx-claim` + Slack message |
| Hit a blocker | `ctx-blocker` + ask for help |
| Making arch decision | `ctx-adr` + discuss with team |
| Task taking longer | Update estimate + communicate |
| Going to modify shared code | Notify in Slack first |
| Finished a task | `ctx-release -Complete` + PR |

### Feature Ownership

Each major feature has an owner:

```
.context/features/
├── auth/
│   └── OWNER.md           # Who owns this feature
├── allocation/
│   └── OWNER.md
└── dashboard/
    └── OWNER.md
```

**Rule:** Modifying a feature you don't own requires:
1. Discussion with owner
2. Owner approval on PR
3. Or escalation to Tech Lead

---

## 7. Code Reviews

### PR Checklist

Every PR must include:

```markdown
## PR Checklist

### Code Quality
- [ ] Follows coding standards (.context/CODING_STANDARDS.md)
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] No console.log or debug code
- [ ] No hardcoded values (use constants/config)

### Testing
- [ ] Unit tests added/updated
- [ ] All tests pass
- [ ] Test coverage maintained (>80%)

### Documentation
- [ ] Code comments where needed
- [ ] API documentation updated (if API changed)
- [ ] README updated (if setup changed)

### Context
- [ ] CURRENT_STATE.md updated
- [ ] ARCHITECTURE_DECISIONS.md updated (if decisions made)
- [ ] Feature spec updated (if requirements changed)
- [ ] ctx-merge-check passes

### Security
- [ ] No secrets in code
- [ ] Input validation present
- [ ] Auth checks in place
```

### Reviewing AI-Generated Code

Pay special attention to:

```
1. LOGIC ERRORS
   - AI can write syntactically correct but logically wrong code
   - Trace through the logic manually
   - Check edge cases

2. SECURITY ISSUES
   - AI may not consider security by default
   - Check for SQL injection, XSS, auth bypasses
   - Verify input validation

3. PERFORMANCE
   - AI may not optimize
   - Check for N+1 queries
   - Check for unnecessary re-renders

4. CONSISTENCY
   - Does it match existing patterns?
   - Does it follow our standards?
   - Are names consistent with codebase?

5. OVER-ENGINEERING
   - AI sometimes adds unnecessary complexity
   - Simplify where possible
   - Question every abstraction
```

---

## 8. Quality Assurance

### Testing with AI

```markdown
## AI Testing Prompt

"I need you to write tests for the ResourceService.

Context:
- Read .context/CODING_STANDARDS.md for test patterns
- We use Jest + Testing Library
- Tests should be in ResourceService.test.ts
- Mock external dependencies

Test cases needed:
1. Happy path for each method
2. Error cases (not found, validation errors)
3. Edge cases (empty arrays, null values)
4. Integration points (database calls)

For each test:
- Use descriptive names
- Follow AAA pattern (Arrange, Act, Assert)
- Include comments explaining what's being tested"
```

### QA Context Files

QA engineers should read:

```
.context/
├── MASTER_CONTEXT.md        # Understand requirements
├── CURRENT_STATE.md         # Know what to test
└── qa/
    ├── TEST_STRATEGY.md     # Testing approach
    ├── TEST_CASES/          # Test case repository
    ├── BUG_PATTERNS.md      # Known issue patterns
    └── ENVIRONMENTS.md      # Environment details
```

### Bug Reporting

```powershell
# Log a bug as a blocker
.\ctx-blocker.ps1 -Title "Login fails on Safari" `
                  -Impact "High" `
                  -Description "JWT token not stored in Safari due to ITP"
```

---

## 9. Troubleshooting

### Common Issues

#### "AI forgot the context"

```markdown
PROBLEM: AI is not following standards or context

SOLUTION:
1. Re-paste the context files
2. Say: "Please re-read .context/CODING_STANDARDS.md"
3. Point out specific violations
4. If persistent, start new chat session
```

#### "Merge conflicts in context files"

```markdown
PROBLEM: Git conflict in .context/ files

SOLUTION:
1. NEVER auto-merge context files
2. Run: ctx-merge-check
3. Manually review each conflict
4. When in doubt, keep BOTH versions and reconcile
5. For ADRs: keep both, create supersede relationship
```

#### "Don't know what to work on"

```markdown
PROBLEM: No clear next task

SOLUTION:
1. Run: ctx-team-status
2. Check: ctx-action -List
3. Look at P0 items first, then P1
4. If nothing assigned, ask Tech Lead
5. Consider: documentation, tests, tech debt
```

#### "Context check failing"

```markdown
PROBLEM: ctx-check reports errors

SOLUTION:
1. Read the specific error message
2. Update the affected file
3. Run ctx-check again
4. Common fixes:
   - Update CURRENT_STATE.md with progress
   - Add missing ADRs
   - Document blockers
```

### Getting Help

1. **Check documentation first** - `.context/` files
2. **Ask AI** - With full context
3. **Ask team** - Slack #rmgaas channel
4. **Escalate** - Tech Lead for architectural questions

---

## 10. Best Practices

### The Golden Rules

```
1. CONTEXT IS KING
   - Always read context before coding
   - Always update context after coding
   
2. SMALL, ATOMIC COMMITS
   - One logical change per commit
   - Easier to review, easier to revert
   
3. TEST EVERYTHING
   - If AI wrote it, test it twice
   - Tests are documentation
   
4. COMMUNICATE EARLY
   - Blocked? Say something immediately
   - Changing plans? Update the team
   
5. REVIEW EVERYTHING
   - AI code needs human review
   - Human code needs peer review
   
6. DOCUMENT DECISIONS
   - No decision is too small for an ADR
   - Future you will thank present you
```

### AI Collaboration Principles

```
✅ AI IS A TOOL, NOT A REPLACEMENT
   - You are responsible for the code
   - You must understand what it does
   - You sign off on quality

✅ TRUST BUT VERIFY
   - AI makes mistakes
   - Always review generated code
   - Test edge cases

✅ TEACH THE AI
   - Point out errors
   - Explain your standards
   - Give examples

✅ ITERATE QUICKLY
   - Generate → Review → Refine
   - Don't accept first output
   - Ask for improvements
```

### Productivity Tips

```
1. USE TEMPLATES
   - Save your best prompts
   - Reuse for similar tasks
   
2. BATCH SIMILAR WORK
   - Generate all tests together
   - Generate all components together
   
3. START WITH TYPES
   - Define interfaces first
   - AI generates better code with types
   
4. READ CODE ALOUD
   - Explains logic to yourself
   - Catches errors
   
5. TAKE BREAKS
   - AI fatigue is real
   - Fresh eyes catch more bugs
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────┐
│                     QUICK REFERENCE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SESSION COMMANDS                                                   │
│  ctx-start          Begin session, load context                    │
│  ctx-end            End session, document progress                 │
│  ctx-check          Verify context integrity                       │
│  ctx-status         Quick project status                           │
│                                                                     │
│  TEAM COMMANDS                                                      │
│  ctx-claim A001     Claim a task                                   │
│  ctx-release A001   Release/complete task                          │
│  ctx-who            See team status                                │
│  ctx-team-status    Full team dashboard                            │
│                                                                     │
│  DOCUMENTATION COMMANDS                                             │
│  ctx-adr            Record architecture decision                   │
│  ctx-blocker        Log a blocker                                  │
│  ctx-feature        Update feature status                          │
│  ctx-action         Manage action queue                            │
│  ctx-handoff        Generate handoff document                      │
│                                                                     │
│  GIT WORKFLOW                                                       │
│  git checkout -b feature/A001-desc    Create feature branch        │
│  ctx-merge-check                      Pre-merge validation         │
│  git push origin feature/A001-desc    Push branch                  │
│                                                                     │
│  AI PROMPT START                                                    │
│  "Read .context/MASTER_CONTEXT.md, CURRENT_STATE.md,               │
│   and CODING_STANDARDS.md, then help me with [task]"               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

*Last Updated: 2025-12-06*
*Version: 1.0*
*Maintainer: Tech Lead*
