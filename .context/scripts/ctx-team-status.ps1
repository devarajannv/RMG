<#
.SYNOPSIS
    Team-wide project status dashboard
.DESCRIPTION
    Comprehensive view of project health across all team members
.EXAMPLE
    .\ctx-team-status.ps1
    .\ctx-team-status.ps1 -Export
#>

param(
    [switch]$Export,
    [string]$ExportPath = "team-status-report.md"
)

$ErrorActionPreference = "Stop"
$RootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ContextPath = Join-Path $RootPath ".context"

function Get-ContextFile {
    param([string]$FileName)
    $path = Join-Path $ContextPath $FileName
    if (Test-Path $path) { return Get-Content $path -Raw }
    return $null
}

Clear-Host

$date = Get-Date -Format "yyyy-MM-dd HH:mm"

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ║   📊 TEAM STATUS DASHBOARD                                      ║" -ForegroundColor Cyan
Write-Host "  ║   $date                                            ║" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$report = "# Team Status Report`n`nGenerated: $date`n`n"

# ════════════════════════════════════════════════════════════════════════════
# PROJECT HEALTH
# ════════════════════════════════════════════════════════════════════════════

Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 📈 PROJECT HEALTH" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$currentState = Get-ContextFile "CURRENT_STATE.md"
$blockers = Get-ContextFile "BLOCKERS.md"
$actions = Get-ContextFile "NEXT_ACTIONS.md"

# Feature stats
$done = ([regex]::Matches($currentState, "✅ DONE")).Count
$inProgress = ([regex]::Matches($currentState, "🔨 IN PROGRESS")).Count
$planned = ([regex]::Matches($currentState, "📋 PLANNED")).Count
$blocked = ([regex]::Matches($currentState, "🚫 BLOCKED")).Count
$total = $done + $inProgress + $planned + $blocked

if ($total -gt 0) {
    $progress = [math]::Round(($done / $total) * 100, 0)
    $progressBar = ("█" * [math]::Floor($progress / 5)) + ("░" * (20 - [math]::Floor($progress / 5)))
    
    Write-Host "   Overall Progress: [$progressBar] $progress%" -ForegroundColor $(if ($progress -gt 70) { "Green" } elseif ($progress -gt 30) { "Yellow" } else { "Red" })
    Write-Host ""
    Write-Host "   ┌─────────────────────────────────────────┐" -ForegroundColor White
    Write-Host "   │  ✅ Done:          $($done.ToString().PadLeft(3))                 │" -ForegroundColor Green
    Write-Host "   │  🔨 In Progress:   $($inProgress.ToString().PadLeft(3))                 │" -ForegroundColor Yellow
    Write-Host "   │  📋 Planned:       $($planned.ToString().PadLeft(3))                 │" -ForegroundColor Gray
    Write-Host "   │  🚫 Blocked:       $($blocked.ToString().PadLeft(3))                 │" -ForegroundColor Red
    Write-Host "   │  ────────────────────────────────────── │" -ForegroundColor White
    Write-Host "   │  Total:            $($total.ToString().PadLeft(3))                 │" -ForegroundColor White
    Write-Host "   └─────────────────────────────────────────┘" -ForegroundColor White
}

$report += "## Project Health`n`n"
$report += "- Progress: $progress%`n"
$report += "- Done: $done | In Progress: $inProgress | Planned: $planned | Blocked: $blocked`n`n"

Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# ACTIVE BLOCKERS
# ════════════════════════════════════════════════════════════════════════════

$blockerCount = ([regex]::Matches($blockers, "\| B\d+")).Count

Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 🚫 BLOCKERS ($blockerCount active)" -ForegroundColor $(if ($blockerCount -gt 0) { "Red" } else { "Green" })
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($blockerCount -gt 0) {
    $blockerPattern = "\| (B\d+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|"
    $blockerMatches = [regex]::Matches($blockers, $blockerPattern)
    
    foreach ($match in $blockerMatches) {
        Write-Host "   ⚠️  [$($match.Groups[1].Value)] $($match.Groups[2].Value.Trim())" -ForegroundColor Yellow
        Write-Host "       Impact: $($match.Groups[3].Value.Trim()) | Owner: $($match.Groups[4].Value.Trim())" -ForegroundColor Gray
    }
    $report += "## Blockers`n`n$blockerCount active blockers requiring attention.`n`n"
} else {
    Write-Host "   ✅ No active blockers!" -ForegroundColor Green
    $report += "## Blockers`n`nNo active blockers.`n`n"
}

Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# TEAM ACTIVITY
# ════════════════════════════════════════════════════════════════════════════

Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 👥 TEAM ACTIVITY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$claimsPath = Join-Path $ContextPath "team/claims.json"
$sessionsPath = Join-Path $ContextPath "team/active_sessions.json"

$claims = @{}
$sessions = @{}

if (Test-Path $claimsPath) {
    $claims = Get-Content $claimsPath | ConvertFrom-Json -AsHashtable
    if (-not $claims) { $claims = @{} }
}

if (Test-Path $sessionsPath) {
    $sessions = Get-Content $sessionsPath | ConvertFrom-Json -AsHashtable
    if (-not $sessions) { $sessions = @{} }
}

$activeDevelopers = @()
if ($claims.Count -gt 0) {
    $activeDevelopers = $claims.Values | ForEach-Object { $_.developer } | Sort-Object -Unique
}

Write-Host "   Active Developers: $($activeDevelopers.Count)" -ForegroundColor White
Write-Host "   Tasks Claimed: $($claims.Count)" -ForegroundColor White
Write-Host "   Active Sessions: $($sessions.Count)" -ForegroundColor White
Write-Host ""

if ($claims.Count -gt 0) {
    Write-Host "   Current Work:" -ForegroundColor Yellow
    foreach ($key in $claims.Keys) {
        $claim = $claims[$key]
        $sessionIcon = if ($sessions.ContainsKey($claim.developer)) { "🟢" } else { "⚪" }
        Write-Host "   $sessionIcon $($claim.developer): [$key] $($claim.taskTitle)" -ForegroundColor Gray
    }
}

$report += "## Team Activity`n`n"
$report += "- Active Developers: $($activeDevelopers.Count)`n"
$report += "- Tasks Claimed: $($claims.Count)`n`n"

Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# ACTION QUEUE SUMMARY
# ════════════════════════════════════════════════════════════════════════════

Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 🎯 ACTION QUEUE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$p0Count = ([regex]::Matches($actions, "### P0[\s\S]*?(?=###)") | ForEach-Object { ([regex]::Matches($_.Value, "\| A\d+")).Count } | Measure-Object -Sum).Sum
$p1Count = ([regex]::Matches($actions, "### P1[\s\S]*?(?=###)") | ForEach-Object { ([regex]::Matches($_.Value, "\| A\d+")).Count } | Measure-Object -Sum).Sum
$p2Count = ([regex]::Matches($actions, "### P2[\s\S]*?(?=###)") | ForEach-Object { ([regex]::Matches($_.Value, "\| A\d+")).Count } | Measure-Object -Sum).Sum

Write-Host "   P0 (Critical):  $p0Count" -ForegroundColor $(if ($p0Count -gt 0) { "Red" } else { "Green" })
Write-Host "   P1 (High):      $p1Count" -ForegroundColor $(if ($p1Count -gt 3) { "Yellow" } else { "White" })
Write-Host "   P2 (Medium):    $p2Count" -ForegroundColor Gray

$report += "## Action Queue`n`n"
$report += "- P0: $p0Count | P1: $p1Count | P2: $p2Count`n`n"

Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# GIT STATUS
# ════════════════════════════════════════════════════════════════════════════

Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 📦 GIT STATUS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Push-Location $RootPath
try {
    $currentBranch = git branch --show-current 2>$null
    $uncommitted = (git status --porcelain 2>$null | Measure-Object -Line).Lines
    $branches = (git branch -r 2>$null | Measure-Object -Line).Lines
    
    Write-Host "   Current Branch: $currentBranch" -ForegroundColor White
    Write-Host "   Uncommitted Changes: $uncommitted" -ForegroundColor $(if ($uncommitted -gt 0) { "Yellow" } else { "Green" })
    Write-Host "   Remote Branches: $branches" -ForegroundColor Gray
    
    # List feature branches
    $featureBranches = git branch -r 2>$null | Where-Object { $_ -match "feature/" }
    if ($featureBranches) {
        Write-Host ""
        Write-Host "   Active Feature Branches:" -ForegroundColor Yellow
        foreach ($branch in $featureBranches | Select-Object -First 5) {
            Write-Host "   └── $($branch.Trim())" -ForegroundColor Gray
        }
    }
    
    $report += "## Git Status`n`n"
    $report += "- Branch: $currentBranch`n"
    $report += "- Uncommitted: $uncommitted`n`n"
}
catch {
    Write-Host "   Git not available" -ForegroundColor Gray
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Export if requested
if ($Export) {
    $exportFullPath = Join-Path $RootPath $ExportPath
    Set-Content -Path $exportFullPath -Value $report
    Write-Host "📄 Report exported to: $ExportPath" -ForegroundColor Green
    Write-Host ""
}

Write-Host "Commands: ctx-who | ctx-claim | ctx-status | ctx-check" -ForegroundColor Gray
Write-Host ""
