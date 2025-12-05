<#
.SYNOPSIS
    Release a claimed task
.DESCRIPTION
    Releases a task back to the queue or marks it complete
.EXAMPLE
    .\ctx-release.ps1 -Id A001
    .\ctx-release.ps1 -Id A001 -Complete
    .\ctx-release.ps1 -Id A001 -Abandon -Reason "Blocked by dependency"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Id,
    
    [switch]$Complete,
    [switch]$Abandon,
    [string]$Reason,
    [string]$Developer = $env:USERNAME
)

$ErrorActionPreference = "Stop"
$RootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ContextPath = Join-Path $RootPath ".context"
$ClaimsPath = Join-Path $ContextPath "team/claims.json"
$HistoryPath = Join-Path $ContextPath "team/claims_history.json"

$date = Get-Date -Format "yyyy-MM-dd HH:mm"

Clear-Host

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ║   📤 RELEASE TASK                                               ║" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Load claims
if (-not (Test-Path $ClaimsPath)) {
    Write-Host "❌ No claims file found" -ForegroundColor Red
    exit 1
}

$claims = Get-Content $ClaimsPath | ConvertFrom-Json -AsHashtable
if (-not $claims) { $claims = @{} }

# Check if task is claimed
if (-not $claims.ContainsKey($Id)) {
    Write-Host "❌ Task $Id is not currently claimed" -ForegroundColor Red
    exit 1
}

$claim = $claims[$Id]

# Verify ownership (or admin override)
if ($claim.developer -ne $Developer) {
    Write-Host "⚠️  Task is claimed by $($claim.developer), not you ($Developer)" -ForegroundColor Yellow
    Write-Host "   Are you sure you want to release it? (y/N)" -ForegroundColor Yellow
    $confirm = Read-Host
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Host "Cancelled." -ForegroundColor Gray
        exit 0
    }
}

# Load or create history
$history = @()
if (Test-Path $HistoryPath) {
    $history = Get-Content $HistoryPath | ConvertFrom-Json
    if (-not $history) { $history = @() }
}

# Add to history
$historyEntry = @{
    id = $Id
    developer = $claim.developer
    claimedAt = $claim.claimedAt
    releasedAt = $date
    releasedBy = $Developer
    outcome = if ($Complete) { "completed" } elseif ($Abandon) { "abandoned" } else { "released" }
    reason = $Reason
    taskTitle = $claim.taskTitle
}
$history += $historyEntry

# Save history
$history | ConvertTo-Json -Depth 10 | Set-Content $HistoryPath

# Remove from active claims
$claims.Remove($Id)
$claims | ConvertTo-Json -Depth 10 | Set-Content $ClaimsPath

# Update NEXT_ACTIONS.md
$actionsPath = Join-Path $ContextPath "NEXT_ACTIONS.md"
$actionsContent = Get-Content $actionsPath -Raw

if ($Complete) {
    # Remove from actions (completed)
    $actionsContent = $actionsContent -replace "\| $Id \|[^\n]+\n", ""
    Write-Host "✅ Task $Id completed and removed from queue!" -ForegroundColor Green
} else {
    # Remove lock indicator
    $actionsContent = $actionsContent -replace "(\| $Id \| [^|]+ \| [^|]+ \|) 🔒[^|]+ \|", "`$1 - |"
    if ($Abandon) {
        Write-Host "⚠️  Task $Id abandoned and returned to queue" -ForegroundColor Yellow
        if ($Reason) {
            Write-Host "   Reason: $Reason" -ForegroundColor Gray
        }
    } else {
        Write-Host "📤 Task $Id released back to queue" -ForegroundColor Cyan
    }
}

Set-Content -Path $actionsPath -Value $actionsContent

Write-Host ""
Write-Host "   Task: $($claim.taskTitle)" -ForegroundColor White
Write-Host "   Was claimed by: $($claim.developer)" -ForegroundColor White
Write-Host "   Duration: $($claim.claimedAt) → $date" -ForegroundColor White
Write-Host ""
