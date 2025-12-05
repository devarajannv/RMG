<#
.SYNOPSIS
    End a development session with proper documentation
.DESCRIPTION
    Prompts for session summary, updates all context files,
    and commits changes to git.
.EXAMPLE
    .\ctx-end.ps1
    .\ctx-end.ps1 -Summary "Completed allocation API"
#>

param(
    [string]$Summary,
    [string]$Completed,
    [string]$Decisions,
    [string]$Blockers,
    [string]$NextSession,
    [switch]$NoCommit,
    [switch]$Interactive
)

$ErrorActionPreference = "Stop"
$RootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ContextPath = Join-Path $RootPath ".context"

function Read-UserInput {
    param(
        [string]$Prompt,
        [string]$Default = "",
        [switch]$MultiLine
    )
    
    Write-Host ""
    Write-Host $Prompt -ForegroundColor Cyan
    if ($Default) {
        Write-Host "(Default: $Default)" -ForegroundColor Gray
    }
    if ($MultiLine) {
        Write-Host "(Enter each item on a new line, empty line to finish)" -ForegroundColor Gray
        $lines = @()
        while ($true) {
            $line = Read-Host
            if ([string]::IsNullOrWhiteSpace($line)) { break }
            $lines += $line
        }
        if ($lines.Count -eq 0 -and $Default) {
            return $Default
        }
        return $lines -join "`n"
    } else {
        $input = Read-Host
        if ([string]::IsNullOrWhiteSpace($input) -and $Default) {
            return $Default
        }
        return $input
    }
}

Clear-Host

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ║   📝 SESSION END - DOCUMENTING PROGRESS                         ║" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Get current session info
$sessionTracker = Join-Path $ContextPath "sessions/.current_session"
$sessionNumber = 1
$sessionStart = Get-Date

if (Test-Path $sessionTracker) {
    $sessionData = Get-Content $sessionTracker | ConvertFrom-Json
    $sessionNumber = $sessionData.SessionNumber
    $sessionStart = [DateTime]::Parse($sessionData.StartTime)
}

$sessionDuration = [math]::Round(((Get-Date) - $sessionStart).TotalHours, 1)
$date = Get-Date -Format "yyyy-MM-dd"
$time = Get-Date -Format "HH:mm"

Write-Host "📅 Session #$sessionNumber ending at $time" -ForegroundColor White
Write-Host "⏱️  Duration: $sessionDuration hours" -ForegroundColor White
Write-Host ""

# Interactive mode - gather information
if ($Interactive -or (-not $Summary)) {
    Write-Host "Please provide session details:" -ForegroundColor Yellow
    Write-Host "-" * 50
    
    if (-not $Summary) {
        $Summary = Read-UserInput "What was accomplished this session? (one line summary)"
    }
    
    if (-not $Completed) {
        $Completed = Read-UserInput "List items completed:" -MultiLine
    }
    
    if (-not $Decisions) {
        $Decisions = Read-UserInput "Any architectural decisions made? (or 'none')" -Default "None"
    }
    
    if (-not $Blockers) {
        $Blockers = Read-UserInput "Any new blockers? (or 'none')" -Default "None"
    }
    
    if (-not $NextSession) {
        $NextSession = Read-UserInput "What should be done next session?"
    }
}

# Format completed items as list
$completedList = ""
if ($Completed) {
    $items = $Completed -split "`n" | ForEach-Object { "- $_" }
    $completedList = $items -join "`n"
} else {
    $completedList = "- Session documented"
}

# ============================================================================
# UPDATE SESSION_LOG.md
# ============================================================================
Write-Host ""
Write-Host "📝 Updating SESSION_LOG.md..." -ForegroundColor Yellow

$sessionEntry = @"

---

## Session #$sessionNumber

**Date:** $date
**Time:** $time
**Duration:** $sessionDuration hours
**Participants:** AI Assistant

### Summary
$Summary

### Completed
$completedList

### Decisions Made
$Decisions

### Blockers Encountered
$Blockers

### Next Session Should
$NextSession

"@

$sessionLogPath = Join-Path $ContextPath "SESSION_LOG.md"
Add-Content -Path $sessionLogPath -Value $sessionEntry
Write-Host "  ✓ Session log updated" -ForegroundColor Green

# ============================================================================
# UPDATE CURRENT_STATE.md
# ============================================================================
Write-Host "📊 Updating CURRENT_STATE.md..." -ForegroundColor Yellow

$currentStatePath = Join-Path $ContextPath "CURRENT_STATE.md"
$stateContent = Get-Content $currentStatePath -Raw

# Update session count
$stateContent = $stateContent -replace '\| \*\*Sessions Completed\*\* \| \d+ \|', "| **Sessions Completed** | $sessionNumber |"
$stateContent = $stateContent -replace '\| \*\*Last Session\*\* \| [^|]+ \|', "| **Last Session** | $date |"

# Update last updated footer
$stateContent = $stateContent -replace '\*Last Updated:.*\*', "*Last Updated: $date | Session: #$sessionNumber*"

Set-Content -Path $currentStatePath -Value $stateContent
Write-Host "  ✓ Current state updated" -ForegroundColor Green

# ============================================================================
# UPDATE NEXT_ACTIONS.md (if next session provided)
# ============================================================================
if ($NextSession -and $NextSession -ne "None") {
    Write-Host "🎯 Updating NEXT_ACTIONS.md..." -ForegroundColor Yellow
    
    $nextActionsPath = Join-Path $ContextPath "NEXT_ACTIONS.md"
    $actionsContent = Get-Content $nextActionsPath -Raw
    
    # Update last updated
    $actionsContent = $actionsContent -replace '\*Last Updated:.*\*', "*Last Updated: $date*"
    
    Set-Content -Path $nextActionsPath -Value $actionsContent
    Write-Host "  ✓ Next actions noted" -ForegroundColor Green
}

# ============================================================================
# ADD BLOCKER (if any)
# ============================================================================
if ($Blockers -and $Blockers -ne "None" -and $Blockers -ne "none") {
    Write-Host "🚫 Updating BLOCKERS.md..." -ForegroundColor Yellow
    
    # Would add blocker to file - keeping simple for now
    Write-Host "  ⚠ Remember to manually add blocker details to BLOCKERS.md" -ForegroundColor Yellow
}

# ============================================================================
# CLEAR SESSION TRACKER
# ============================================================================
if (Test-Path $sessionTracker) {
    $sessionData = Get-Content $sessionTracker | ConvertFrom-Json
    $sessionData.Status = "COMPLETED"
    $sessionData.EndTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $sessionData | ConvertTo-Json | Set-Content $sessionTracker
}

# ============================================================================
# GIT COMMIT
# ============================================================================
if (-not $NoCommit) {
    Write-Host ""
    Write-Host "📦 Committing changes to git..." -ForegroundColor Yellow
    
    Push-Location $RootPath
    try {
        # Add context files
        git add .context/ 2>$null
        
        # Check if there are changes
        $status = git status --porcelain .context/ 2>$null
        if ($status) {
            $commitMsg = "docs(session): end session #$sessionNumber - $Summary"
            git commit -m $commitMsg 2>$null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Changes committed" -ForegroundColor Green
            } else {
                Write-Host "  ⚠ Commit failed - commit manually" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ℹ No context changes to commit" -ForegroundColor Gray
        }
    }
    finally {
        Pop-Location
    }
}

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Session #$sessionNumber completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 SESSION SUMMARY" -ForegroundColor White
Write-Host "   Duration: $sessionDuration hours" -ForegroundColor Gray
Write-Host "   Summary: $Summary" -ForegroundColor Gray
Write-Host ""
Write-Host "📌 NEXT SESSION" -ForegroundColor White
Write-Host "   $NextSession" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 To start a new session: .\ctx-start.ps1" -ForegroundColor Yellow
Write-Host ""
