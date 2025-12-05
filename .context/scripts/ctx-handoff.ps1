<#
.SYNOPSIS
    Generate a comprehensive handoff document
.DESCRIPTION
    Creates a standalone document containing all project context
    for handoff to another AI or human developer
.EXAMPLE
    .\ctx-handoff.ps1
    .\ctx-handoff.ps1 -Output "handoff_dec2025.md"
#>

param(
    [string]$Output = "HANDOFF.md"
)

$ErrorActionPreference = "Stop"
$RootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ContextPath = Join-Path $RootPath ".context"

$date = Get-Date -Format "yyyy-MM-dd HH:mm"

Clear-Host

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ║   📋 GENERATING HANDOFF DOCUMENT                                ║" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Read all context files
function Get-ContextFile {
    param([string]$FileName)
    $path = Join-Path $ContextPath $FileName
    if (Test-Path $path) {
        return Get-Content $path -Raw
    }
    return "[File not found: $FileName]"
}

$masterContext = Get-ContextFile "MASTER_CONTEXT.md"
$currentState = Get-ContextFile "CURRENT_STATE.md"
$nextActions = Get-ContextFile "NEXT_ACTIONS.md"
$adrs = Get-ContextFile "ARCHITECTURE_DECISIONS.md"
$blockers = Get-ContextFile "BLOCKERS.md"
$sessionLog = Get-ContextFile "SESSION_LOG.md"

# Extract key info
$projectName = "Unknown Project"
if ($masterContext -match "# (.+) - Master Context") {
    $projectName = $Matches[1]
}

# Get session count
$sessionCount = ([regex]::Matches($sessionLog, "## Session #\d+")).Count

# Get feature stats
$done = ([regex]::Matches($currentState, "✅ DONE")).Count
$inProgress = ([regex]::Matches($currentState, "🔨 IN PROGRESS")).Count
$planned = ([regex]::Matches($currentState, "📋 PLANNED")).Count
$blocked = ([regex]::Matches($currentState, "🚫 BLOCKED")).Count
$total = $done + $inProgress + $planned + $blocked

# Get blocker count
$blockerCount = ([regex]::Matches($blockers, "\| B\d+")).Count

# Get ADR count  
$adrCount = ([regex]::Matches($adrs, "## ADR-\d+")).Count

# Get last 3 sessions
$lastSessions = ""
$sessionMatches = [regex]::Matches($sessionLog, "(## Session #\d+[\s\S]*?)(?=## Session #|$)")
$recentSessions = $sessionMatches | Select-Object -Last 3
foreach ($session in $recentSessions) {
    $lastSessions += $session.Value + "`n"
}

# Generate handoff document
$handoff = @"
# 📋 PROJECT HANDOFF DOCUMENT

> **Generated:** $date
> **Purpose:** Complete context for AI/Human developer handoff

---

## 🎯 QUICK START

### What is this project?
**$projectName**

### Where are we?
- **Sessions Completed:** $sessionCount
- **Features Done:** $done / $total
- **Active Blockers:** $blockerCount
- **Architecture Decisions:** $adrCount

### What to do next?
Read these files in order:
1. ``.context/MASTER_CONTEXT.md`` - Understand the vision
2. ``.context/CURRENT_STATE.md`` - See what's built
3. ``.context/NEXT_ACTIONS.md`` - Know what to work on
4. ``.context/BLOCKERS.md`` - Be aware of issues

### How to run the project
``````bash
# Navigate to project
cd $RootPath

# Install dependencies
npm install  # or pnpm install

# Start development
npm run dev
``````

---

## 📊 PROJECT STATUS SUMMARY

### Feature Progress
| Status | Count |
|--------|-------|
| ✅ Done | $done |
| 🔨 In Progress | $inProgress |
| 📋 Planned | $planned |
| 🚫 Blocked | $blocked |
| **Total** | **$total** |

### Health Indicators
- Blockers: $(if ($blockerCount -eq 0) { "✅ None" } else { "⚠️ $blockerCount active" })
- ADRs: $(if ($adrCount -gt 0) { "✅ $adrCount documented" } else { "⚠️ None recorded" })

---

## 📝 RECENT SESSION HISTORY

$lastSessions

---

## 🏗️ ARCHITECTURE DECISIONS

$adrs

---

## 🚫 KNOWN BLOCKERS

$blockers

---

## 📋 FULL CONTEXT FILES

### Master Context
$masterContext

---

### Current State
$currentState

---

### Next Actions
$nextActions

---

## 🔧 PROJECT STRUCTURE

``````
$RootPath/
├── .context/              # AI context management
│   ├── scripts/           # Context CLI tools
│   ├── sessions/          # Session tracking
│   ├── MASTER_CONTEXT.md
│   ├── CURRENT_STATE.md
│   ├── NEXT_ACTIONS.md
│   ├── ARCHITECTURE_DECISIONS.md
│   ├── BLOCKERS.md
│   └── SESSION_LOG.md
├── .specs/                # Requirements & specs
├── .architecture/         # Technical designs
├── docs/                  # User documentation
└── src/                   # Source code
``````

---

## 💡 INSTRUCTIONS FOR AI ASSISTANT

1. **Start every session** by running ``.\ctx-start.ps1``
2. **Read context files** listed in the Quick Start section
3. **Confirm understanding** before making changes
4. **Log decisions** using ``.\ctx-adr.ps1``
5. **Update feature status** using ``.\ctx-feature.ps1``
6. **Record blockers** using ``.\ctx-blocker.ps1``
7. **End every session** by running ``.\ctx-end.ps1``

---

*This document was auto-generated by ctx-handoff.ps1*
*For the latest context, always read the source files in .context/*
"@

$outputPath = Join-Path $RootPath $Output
Set-Content -Path $outputPath -Value $handoff

Write-Host "✅ Handoff document generated!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Location: $outputPath" -ForegroundColor White
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Yellow
Write-Host "   Project: $projectName" -ForegroundColor Gray
Write-Host "   Sessions: $sessionCount" -ForegroundColor Gray
Write-Host "   Features: $done/$total done" -ForegroundColor Gray
Write-Host "   Blockers: $blockerCount" -ForegroundColor Gray
Write-Host "   ADRs: $adrCount" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Share this file with anyone taking over the project" -ForegroundColor Cyan
Write-Host ""
