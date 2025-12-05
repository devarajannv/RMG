<#
.SYNOPSIS
    Update requirements or architecture - triggers a context review
.DESCRIPTION
    Use this when requirements change significantly or when
    architecture decisions need to be reconsidered
.EXAMPLE
    .\ctx-update.ps1 -Type "requirement" -Title "Add multi-tenancy support"
    .\ctx-update.ps1 -Type "architecture" -Title "Switch from REST to GraphQL"
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("requirement", "architecture", "scope", "priority")]
    [string]$Type,
    
    [Parameter(Mandatory=$true)]
    [string]$Title,
    
    [string]$Description,
    [string]$Impact,
    [string]$Reason,
    [switch]$Interactive
)

$ErrorActionPreference = "Stop"
$RootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ContextPath = Join-Path $RootPath ".context"

$date = Get-Date -Format "yyyy-MM-dd"
$time = Get-Date -Format "HH:mm"

function Read-UserInput {
    param([string]$Prompt, [string]$Default = "")
    Write-Host ""
    Write-Host $Prompt -ForegroundColor Cyan
    if ($Default) { Write-Host "(Default: $Default)" -ForegroundColor Gray }
    $input = Read-Host
    if ([string]::IsNullOrWhiteSpace($input) -and $Default) { return $Default }
    return $input
}

Clear-Host

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ║   🔄 CONTEXT UPDATE - $($Type.ToUpper())                                    " -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Interactive mode
if ($Interactive -or (-not $Description)) {
    $Description = Read-UserInput "Describe the change in detail:"
    $Impact = Read-UserInput "What's the impact? (High/Medium/Low)" -Default "Medium"
    $Reason = Read-UserInput "Why is this change needed?"
}

# Create change log entry
$changeEntry = @"

---

## [$date $time] $($Type.ToUpper()) CHANGE: $Title

**Type:** $Type
**Impact:** $Impact
**Reason:** $Reason

### Description
$Description

### Action Required
- [ ] Review MASTER_CONTEXT.md for updates needed
- [ ] Review ARCHITECTURE_DECISIONS.md for conflicts
- [ ] Update affected feature specs
- [ ] Communicate to stakeholders

"@

# Create or update CHANGE_LOG.md
$changeLogPath = Join-Path $ContextPath "CHANGE_LOG.md"
if (-not (Test-Path $changeLogPath)) {
    $header = @"
# Project Change Log

> **Track significant changes to requirements, architecture, or scope**

"@
    Set-Content -Path $changeLogPath -Value $header
}

Add-Content -Path $changeLogPath -Value $changeEntry

# Update SESSION_LOG with note about change
$sessionLogPath = Join-Path $ContextPath "SESSION_LOG.md"
$changeNote = "`n> ⚠️ **CHANGE RECORDED:** $Type change - $Title (see CHANGE_LOG.md)`n"

# Find current session and add note
$sessionContent = Get-Content $sessionLogPath -Raw
$sessionTracker = Join-Path $ContextPath "sessions/.current_session"
if (Test-Path $sessionTracker) {
    $sessionData = Get-Content $sessionTracker | ConvertFrom-Json
    $sessionNum = $sessionData.SessionNumber
    
    # Add note to current session
    if ($sessionContent -match "(## Session #$sessionNum[\s\S]*?### Summary)") {
        $sessionContent = $sessionContent.Replace($Matches[0], $Matches[0] + $changeNote)
        Set-Content -Path $sessionLogPath -Value $sessionContent
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  CONTEXT CHANGE RECORDED" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Type: $Type" -ForegroundColor White
Write-Host "   Title: $Title" -ForegroundColor White
Write-Host "   Impact: $Impact" -ForegroundColor White
Write-Host ""
Write-Host "📋 REQUIRED ACTIONS:" -ForegroundColor Red
Write-Host "   1. AI should re-read MASTER_CONTEXT.md" -ForegroundColor White
Write-Host "   2. Check for conflicts with existing ADRs" -ForegroundColor White
Write-Host "   3. Update affected features and specs" -ForegroundColor White
Write-Host ""
Write-Host "📁 Change logged in: .context/CHANGE_LOG.md" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 TIP: Run ctx-check.ps1 to verify context integrity" -ForegroundColor Cyan
Write-Host ""
