<#
.SYNOPSIS
    Show who is working on what
.DESCRIPTION
    Displays all active task claims across the team
.EXAMPLE
    .\ctx-who.ps1
    .\ctx-who.ps1 -Developer "Alice"
    .\ctx-who.ps1 -Verbose
#>

param(
    [string]$Developer,
    [switch]$History,
    [int]$HistoryDays = 7
)

$ErrorActionPreference = "Stop"
$RootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ContextPath = Join-Path $RootPath ".context"
$ClaimsPath = Join-Path $ContextPath "team/claims.json"
$HistoryPath = Join-Path $ContextPath "team/claims_history.json"
$SessionsPath = Join-Path $ContextPath "team/active_sessions.json"

Clear-Host

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ║   👥 TEAM STATUS - Who's Working on What                        ║" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Load claims
$claims = @{}
if (Test-Path $ClaimsPath) {
    $claims = Get-Content $ClaimsPath | ConvertFrom-Json -AsHashtable
    if (-not $claims) { $claims = @{} }
}

# Load active sessions
$sessions = @{}
if (Test-Path $SessionsPath) {
    $sessions = Get-Content $SessionsPath | ConvertFrom-Json -AsHashtable
    if (-not $sessions) { $sessions = @{} }
}

# ACTIVE CLAIMS
Write-Host "🎯 ACTIVE TASK CLAIMS" -ForegroundColor Yellow
Write-Host "─" * 60

if ($claims.Count -eq 0) {
    Write-Host "   No tasks currently claimed" -ForegroundColor Gray
} else {
    # Group by developer
    $byDeveloper = @{}
    foreach ($key in $claims.Keys) {
        $claim = $claims[$key]
        $dev = $claim.developer
        if (-not $byDeveloper.ContainsKey($dev)) {
            $byDeveloper[$dev] = @()
        }
        $byDeveloper[$dev] += @{
            id = $key
            claim = $claim
        }
    }
    
    foreach ($dev in $byDeveloper.Keys | Sort-Object) {
        if ($Developer -and $dev -ne $Developer) { continue }
        
        $devClaims = $byDeveloper[$dev]
        $sessionStatus = if ($sessions.ContainsKey($dev)) { "🟢 Active" } else { "⚪ Offline" }
        
        Write-Host ""
        Write-Host "   👤 $dev $sessionStatus" -ForegroundColor White
        
        foreach ($item in $devClaims) {
            $claim = $item.claim
            $hoursAgo = [math]::Round(((Get-Date) - [DateTime]::Parse($claim.claimedAt)).TotalHours, 1)
            
            Write-Host "      ├── [$($item.id)] $($claim.taskTitle)" -ForegroundColor Cyan
            Write-Host "      │   Claimed: $hoursAgo hours ago" -ForegroundColor Gray
            if ($claim.estimatedHours) {
                Write-Host "      │   Estimated: $($claim.estimatedHours) hours" -ForegroundColor Gray
            }
        }
    }
}

Write-Host ""

# ACTIVE SESSIONS
Write-Host "💻 ACTIVE SESSIONS" -ForegroundColor Yellow
Write-Host "─" * 60

if ($sessions.Count -eq 0) {
    Write-Host "   No active sessions" -ForegroundColor Gray
} else {
    foreach ($dev in $sessions.Keys | Sort-Object) {
        if ($Developer -and $dev -ne $Developer) { continue }
        
        $session = $sessions[$dev]
        $duration = [math]::Round(((Get-Date) - [DateTime]::Parse($session.startTime)).TotalMinutes, 0)
        
        Write-Host ""
        Write-Host "   👤 $dev" -ForegroundColor White
        Write-Host "      Session #$($session.sessionNumber) | $duration minutes" -ForegroundColor Cyan
        if ($session.currentTask) {
            Write-Host "      Working on: $($session.currentTask)" -ForegroundColor Gray
        }
    }
}

Write-Host ""

# HISTORY (if requested)
if ($History) {
    Write-Host "📜 RECENT HISTORY (Last $HistoryDays days)" -ForegroundColor Yellow
    Write-Host "─" * 60
    
    if (Test-Path $HistoryPath) {
        $history = Get-Content $HistoryPath | ConvertFrom-Json
        $cutoff = (Get-Date).AddDays(-$HistoryDays)
        
        $recent = $history | Where-Object { 
            [DateTime]::Parse($_.releasedAt) -gt $cutoff 
        } | Sort-Object { [DateTime]::Parse($_.releasedAt) } -Descending | Select-Object -First 10
        
        if ($recent) {
            foreach ($entry in $recent) {
                if ($Developer -and $entry.developer -ne $Developer) { continue }
                
                $outcomeIcon = switch ($entry.outcome) {
                    "completed" { "✅" }
                    "abandoned" { "⚠️" }
                    default { "📤" }
                }
                
                Write-Host ""
                Write-Host "   $outcomeIcon [$($entry.id)] $($entry.taskTitle)" -ForegroundColor White
                Write-Host "      By: $($entry.developer) | $($entry.outcome)" -ForegroundColor Gray
                Write-Host "      $($entry.claimedAt) → $($entry.releasedAt)" -ForegroundColor Gray
            }
        } else {
            Write-Host "   No recent history" -ForegroundColor Gray
        }
    } else {
        Write-Host "   No history file found" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "─" * 60
Write-Host ""
Write-Host "Commands: ctx-claim <ID> | ctx-release <ID> | ctx-who -History" -ForegroundColor Gray
Write-Host ""
