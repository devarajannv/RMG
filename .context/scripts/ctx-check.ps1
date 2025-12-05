<#
.SYNOPSIS
    Verify that AI context is being maintained correctly
.DESCRIPTION
    Runs a series of checks to ensure documentation is up-to-date
    and consistent. Use this anytime you suspect context drift.
.EXAMPLE
    .\ctx-check.ps1
    .\ctx-check.ps1 -Verbose
#>

param(
    [switch]$Verbose,
    [switch]$Fix
)

$ErrorActionPreference = "Stop"
$RootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ContextPath = Join-Path $RootPath ".context"

# Track issues
$issues = @()
$warnings = @()

function Write-Check {
    param(
        [string]$Check,
        [bool]$Passed,
        [string]$Message = ""
    )
    if ($Passed) {
        Write-Host "  ✓ $Check" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $Check" -ForegroundColor Red
        if ($Message) {
            Write-Host "    → $Message" -ForegroundColor Yellow
        }
    }
    return $Passed
}

function Write-Warning {
    param([string]$Message)
    Write-Host "  ⚠ $Message" -ForegroundColor Yellow
    $script:warnings += $Message
}

function Test-FileExists {
    param([string]$Path, [string]$Name)
    $exists = Test-Path $Path
    if (-not $exists) {
        $script:issues += "Missing file: $Name"
    }
    return $exists
}

function Test-FileNotEmpty {
    param([string]$Path, [string]$Name)
    if (Test-Path $Path) {
        $content = Get-Content $Path -Raw
        $notEmpty = $content.Length -gt 100
        if (-not $notEmpty) {
            $script:issues += "File is essentially empty: $Name"
        }
        return $notEmpty
    }
    return $false
}

function Test-FileUpdatedRecently {
    param([string]$Path, [int]$Days = 7)
    if (Test-Path $Path) {
        $lastWrite = (Get-Item $Path).LastWriteTime
        return ($lastWrite -gt (Get-Date).AddDays(-$Days))
    }
    return $false
}

Clear-Host

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ║   🔍 CONTEXT INTEGRITY CHECK                                    ║" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# CHECK 1: Required Files Exist
# ============================================================================
Write-Host "📁 FILE EXISTENCE CHECKS" -ForegroundColor Cyan
Write-Host "-" * 50

$requiredFiles = @{
    "MASTER_CONTEXT.md" = "Vision and requirements"
    "CURRENT_STATE.md" = "Feature status tracking"
    "NEXT_ACTIONS.md" = "Priority action queue"
    "ARCHITECTURE_DECISIONS.md" = "ADR records"
    "BLOCKERS.md" = "Issue tracking"
    "SESSION_LOG.md" = "Session history"
}

$allFilesExist = $true
foreach ($file in $requiredFiles.Keys) {
    $path = Join-Path $ContextPath $file
    $exists = Test-FileExists $path $file
    $result = Write-Check $file $exists "Required for: $($requiredFiles[$file])"
    $allFilesExist = $allFilesExist -and $exists
}

# ============================================================================
# CHECK 2: Files Have Content
# ============================================================================
Write-Host ""
Write-Host "📄 CONTENT CHECKS" -ForegroundColor Cyan
Write-Host "-" * 50

foreach ($file in $requiredFiles.Keys) {
    $path = Join-Path $ContextPath $file
    if (Test-Path $path) {
        $notEmpty = Test-FileNotEmpty $path $file
        Write-Check "$file has meaningful content" $notEmpty "File appears to be placeholder only"
    }
}

# ============================================================================
# CHECK 3: Freshness Checks
# ============================================================================
Write-Host ""
Write-Host "🕐 FRESHNESS CHECKS" -ForegroundColor Cyan
Write-Host "-" * 50

$currentStatePath = Join-Path $ContextPath "CURRENT_STATE.md"
$sessionLogPath = Join-Path $ContextPath "SESSION_LOG.md"

if (Test-Path $currentStatePath) {
    $fresh = Test-FileUpdatedRecently $currentStatePath 7
    if (-not $fresh) {
        Write-Warning "CURRENT_STATE.md not updated in 7+ days"
    } else {
        Write-Check "CURRENT_STATE.md is recent" $true
    }
}

if (Test-Path $sessionLogPath) {
    $fresh = Test-FileUpdatedRecently $sessionLogPath 7
    if (-not $fresh) {
        Write-Warning "SESSION_LOG.md not updated in 7+ days"
    } else {
        Write-Check "SESSION_LOG.md is recent" $true
    }
}

# ============================================================================
# CHECK 4: Consistency Checks
# ============================================================================
Write-Host ""
Write-Host "🔗 CONSISTENCY CHECKS" -ForegroundColor Cyan
Write-Host "-" * 50

# Check if there's an active session
$sessionTracker = Join-Path $ContextPath "sessions/.current_session"
if (Test-Path $sessionTracker) {
    $sessionData = Get-Content $sessionTracker | ConvertFrom-Json
    if ($sessionData.Status -eq "IN_PROGRESS") {
        Write-Check "Active session detected (#$($sessionData.SessionNumber))" $true
    }
} else {
    Write-Warning "No active session - run ctx-start.ps1 first"
}

# Check for IN PROGRESS features without recent updates
$currentState = Get-Content $currentStatePath -Raw -ErrorAction SilentlyContinue
if ($currentState) {
    $inProgressCount = ([regex]::Matches($currentState, "🔨 IN PROGRESS")).Count
    if ($inProgressCount -gt 0) {
        Write-Check "Found $inProgressCount features in progress" $true
        
        # Check if CURRENT_STATE was updated recently
        $lastWrite = (Get-Item $currentStatePath).LastWriteTime
        $hoursSinceUpdate = ((Get-Date) - $lastWrite).TotalHours
        if ($hoursSinceUpdate -gt 24) {
            Write-Warning "Features marked IN PROGRESS but state not updated in 24+ hours"
        }
    }
}

# Check for blockers
$blockerPath = Join-Path $ContextPath "BLOCKERS.md"
if (Test-Path $blockerPath) {
    $blockerContent = Get-Content $blockerPath -Raw
    $blockerMatches = [regex]::Matches($blockerContent, "\| B\d+")
    if ($blockerMatches.Count -gt 0) {
        Write-Warning "$($blockerMatches.Count) active blocker(s) - ensure they're being addressed"
    } else {
        Write-Check "No active blockers" $true
    }
}

# ============================================================================
# CHECK 5: Git Status
# ============================================================================
Write-Host ""
Write-Host "📦 GIT STATUS" -ForegroundColor Cyan
Write-Host "-" * 50

Push-Location $RootPath
try {
    $gitStatus = git status --porcelain 2>$null
    if ($LASTEXITCODE -eq 0) {
        $uncommittedCount = ($gitStatus | Measure-Object -Line).Lines
        if ($uncommittedCount -gt 0) {
            Write-Warning "$uncommittedCount uncommitted changes - consider committing before session end"
        } else {
            Write-Check "All changes committed" $true
        }
        
        # Check for context file changes
        $contextChanges = $gitStatus | Where-Object { $_ -match "\.context/" }
        if ($contextChanges) {
            Write-Warning "Uncommitted changes in .context/ files"
        }
    } else {
        Write-Warning "Git not initialized or not available"
    }
}
finally {
    Pop-Location
}

# ============================================================================
# CHECK 6: Cross-Reference Checks
# ============================================================================
Write-Host ""
Write-Host "🔄 CROSS-REFERENCE CHECKS" -ForegroundColor Cyan
Write-Host "-" * 50

# Check if ADRs are referenced
$adrPath = Join-Path $ContextPath "ARCHITECTURE_DECISIONS.md"
if (Test-Path $adrPath) {
    $adrContent = Get-Content $adrPath -Raw
    $adrMatches = [regex]::Matches($adrContent, "## ADR-(\d+)")
    Write-Check "$($adrMatches.Count) Architecture Decision Records found" ($adrMatches.Count -gt 0) "Consider documenting key decisions"
}

# Check NEXT_ACTIONS has items
$nextActionsPath = Join-Path $ContextPath "NEXT_ACTIONS.md"
if (Test-Path $nextActionsPath) {
    $actionsContent = Get-Content $nextActionsPath -Raw
    $actionMatches = [regex]::Matches($actionsContent, "\| A\d+")
    if ($actionMatches.Count -eq 0) {
        Write-Warning "No actions in queue - add next steps to NEXT_ACTIONS.md"
    } else {
        Write-Check "$($actionMatches.Count) actions in queue" $true
    }
}

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$totalIssues = $issues.Count
$totalWarnings = $warnings.Count

if ($totalIssues -eq 0 -and $totalWarnings -eq 0) {
    Write-Host "✅ ALL CHECKS PASSED - Context integrity is good!" -ForegroundColor Green
} elseif ($totalIssues -eq 0) {
    Write-Host "⚠️  $totalWarnings WARNING(S) - Context is usable but needs attention" -ForegroundColor Yellow
} else {
    Write-Host "❌ $totalIssues ISSUE(S), $totalWarnings WARNING(S) - Context integrity compromised" -ForegroundColor Red
}

Write-Host ""

if ($totalIssues -gt 0) {
    Write-Host "CRITICAL ISSUES:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "  • $issue" -ForegroundColor Red
    }
    Write-Host ""
}

if ($totalWarnings -gt 0) {
    Write-Host "WARNINGS:" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "  • $warning" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "💡 AI INSTRUCTION: If checks failed, read the affected files and update them" -ForegroundColor Cyan
Write-Host ""

# Return exit code based on issues
exit $totalIssues
