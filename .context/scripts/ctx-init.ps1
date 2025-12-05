<# 
.SYNOPSIS
    Initialize the Context-as-Code structure for a new project
.DESCRIPTION
    Creates the complete .context folder structure and initial documentation files
.EXAMPLE
    .\ctx-init.ps1 -ProjectName "RMGaaS" -Description "Resource Management Platform"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectName,
    
    [Parameter(Mandatory=$true)]
    [string]$Description,
    
    [string]$Author = "AI Assistant"
)

$ErrorActionPreference = "Stop"
$Date = Get-Date -Format "yyyy-MM-dd"
$RootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "🚀 Initializing Context-as-Code for $ProjectName" -ForegroundColor Cyan

# Create directory structure
$directories = @(
    ".context",
    ".context/scripts",
    ".context/sessions",
    ".specs",
    ".specs/personas",
    ".specs/features",
    ".specs/api",
    ".architecture",
    "docs"
)

foreach ($dir in $directories) {
    $fullPath = Join-Path $RootPath $dir
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "  ✓ Created $dir" -ForegroundColor Green
    }
}

# Create MASTER_CONTEXT.md
$masterContext = @"
# $ProjectName - Master Context

> **This file is the single source of truth for project vision and goals.**
> **AI assistants should read this file FIRST at the start of every session.**

## Project Identity

- **Name:** $ProjectName
- **Description:** $Description
- **Created:** $Date
- **Owner:** NewVision Software Pvt. Ltd.

## Vision Statement

[To be defined - What problem does this solve? For whom? Why now?]

## Non-Negotiable Requirements

1. [List absolute requirements that cannot be compromised]
2. 
3. 

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| [Define key metrics] | | |

## Stakeholders

| Role | Name | Needs |
|------|------|-------|
| Product Owner | | |
| Technical Lead | | |
| End Users | | |

## Technology Constraints

- **Must Use:** 
- **Must Avoid:** 
- **Preferred:** 

## Out of Scope (Explicitly)

1. [What this project will NOT do]
2. 
3. 

---
*Last Updated: $Date*
"@

$masterContextPath = Join-Path $RootPath ".context/MASTER_CONTEXT.md"
if (-not (Test-Path $masterContextPath)) {
    Set-Content -Path $masterContextPath -Value $masterContext
    Write-Host "  ✓ Created MASTER_CONTEXT.md" -ForegroundColor Green
}

# Create CURRENT_STATE.md
$currentState = @"
# $ProjectName - Current State

> **This file tracks what has been built and what remains.**
> **Update this file at the end of every session.**

## Project Status: 🟡 IN PROGRESS

## Quick Stats

| Metric | Value |
|--------|-------|
| **Sessions Completed** | 0 |
| **Last Session** | N/A |
| **Total Commits** | 0 |
| **Test Coverage** | 0% |

## Feature Status

| ID | Feature | Status | Completion | Owner | Notes |
|----|---------|--------|------------|-------|-------|
| F001 | Project Setup | 📋 PLANNED | 0% | AI | Initial setup |

### Status Legend
- ✅ DONE - Complete and tested
- 🔨 IN PROGRESS - Currently being worked on
- 📋 PLANNED - Scheduled for development
- 🚫 BLOCKED - Has blockers
- ❌ CANCELLED - Will not be done

## What's Working Now

*Nothing yet - project just initialized*

## Known Issues

*None yet*

## Technical Debt

*None yet*

---
*Last Updated: $Date | Session: #0 (Init)*
"@

$currentStatePath = Join-Path $RootPath ".context/CURRENT_STATE.md"
if (-not (Test-Path $currentStatePath)) {
    Set-Content -Path $currentStatePath -Value $currentState
    Write-Host "  ✓ Created CURRENT_STATE.md" -ForegroundColor Green
}

# Create NEXT_ACTIONS.md
$nextActions = @"
# $ProjectName - Next Actions

> **Prioritized queue of work items.**
> **AI should work on P0 items first, then P1, etc.**

## Priority Legend
- **P0:** Critical - Do immediately
- **P1:** High - Do this session if P0 complete
- **P2:** Medium - Do when P0/P1 complete
- **P3:** Low - Nice to have
- **BLOCKED:** Cannot proceed until blocker resolved

## Action Queue

### P0 - Critical

| ID | Action | Context | Blocked By |
|----|--------|---------|------------|
| A001 | Complete project initialization | Set up folders, configs | - |

### P1 - High

| ID | Action | Context | Blocked By |
|----|--------|---------|------------|
| | | | |

### P2 - Medium

| ID | Action | Context | Blocked By |
|----|--------|---------|------------|
| | | | |

### P3 - Low

| ID | Action | Context | Blocked By |
|----|--------|---------|------------|
| | | | |

### BLOCKED

| ID | Action | Blocker | Waiting On |
|----|--------|---------|------------|
| | | | |

---
*Last Updated: $Date*
"@

$nextActionsPath = Join-Path $RootPath ".context/NEXT_ACTIONS.md"
if (-not (Test-Path $nextActionsPath)) {
    Set-Content -Path $nextActionsPath -Value $nextActions
    Write-Host "  ✓ Created NEXT_ACTIONS.md" -ForegroundColor Green
}

# Create ARCHITECTURE_DECISIONS.md
$adrContent = @"
# $ProjectName - Architecture Decision Records

> **Every significant technical decision is recorded here with rationale.**
> **Before making a decision, check if it contradicts existing ADRs.**

## ADR Template

``````markdown
## ADR-XXX: [Title]

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded
**Deciders:** [Names]

### Context
What is the issue that we're seeing that is motivating this decision?

### Decision
What is the change that we're proposing and/or doing?

### Alternatives Considered
1. Alternative A - Why rejected
2. Alternative B - Why rejected

### Consequences
What becomes easier or more difficult because of this change?
``````

---

## Decisions

*No decisions recorded yet. First decision will be ADR-001.*

---
*Last Updated: $Date*
"@

$adrPath = Join-Path $RootPath ".context/ARCHITECTURE_DECISIONS.md"
if (-not (Test-Path $adrPath)) {
    Set-Content -Path $adrPath -Value $adrContent
    Write-Host "  ✓ Created ARCHITECTURE_DECISIONS.md" -ForegroundColor Green
}

# Create BLOCKERS.md
$blockersContent = @"
# $ProjectName - Blockers & Issues

> **Track all blockers, issues, and technical debt here.**

## Active Blockers

| ID | Blocker | Impact | Owner | Since | Resolution Path |
|----|---------|--------|-------|-------|-----------------|
| | *None* | | | | |

## Resolved Blockers (Last 10)

| ID | Blocker | Resolution | Resolved Date |
|----|---------|------------|---------------|
| | *None yet* | | |

## Technical Debt

| ID | Debt Item | Severity | Effort | Notes |
|----|-----------|----------|--------|-------|
| | *None yet* | | | |

### Severity Levels
- 🔴 Critical - Blocks production or major features
- 🟠 High - Significant impact on development speed
- 🟡 Medium - Should be addressed soon
- 🟢 Low - Address when convenient

---
*Last Updated: $Date*
"@

$blockersPath = Join-Path $RootPath ".context/BLOCKERS.md"
if (-not (Test-Path $blockersPath)) {
    Set-Content -Path $blockersPath -Value $blockersContent
    Write-Host "  ✓ Created BLOCKERS.md" -ForegroundColor Green
}

# Create SESSION_LOG.md
$sessionLog = @"
# $ProjectName - Session Log

> **Rolling log of all development sessions.**
> **Append to this file at the end of every session.**

---

## Session #0 - Project Initialization

**Date:** $Date
**Duration:** N/A
**Participants:** $Author

### Summary
Project context structure initialized.

### Completed
- Created .context folder structure
- Created initial documentation files
- Set up session management scripts

### Decisions Made
- None (initialization only)

### Blockers Encountered
- None

### Next Session Should
- Complete MASTER_CONTEXT.md with project details
- Begin actual development

---
"@

$sessionLogPath = Join-Path $RootPath ".context/SESSION_LOG.md"
if (-not (Test-Path $sessionLogPath)) {
    Set-Content -Path $sessionLogPath -Value $sessionLog
    Write-Host "  ✓ Created SESSION_LOG.md" -ForegroundColor Green
}

# Create .contextignore (for any tools that might process .context)
$contextIgnore = @"
# Files to ignore in context processing
*.tmp
*.bak
sessions/archive/*
"@

$contextIgnorePath = Join-Path $RootPath ".context/.contextignore"
Set-Content -Path $contextIgnorePath -Value $contextIgnore

Write-Host ""
Write-Host "✅ Context-as-Code initialized successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Edit .context/MASTER_CONTEXT.md with project vision"
Write-Host "  2. Run ctx-start.ps1 to begin first session"
Write-Host ""
