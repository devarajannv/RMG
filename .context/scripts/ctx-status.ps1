<#
.SYNOPSIS
    Quick project status overview
.DESCRIPTION
    Shows a compact summary of project state without full context loading
.EXAMPLE
    .\ctx-status.ps1
#>

$ErrorActionPreference = "Stop"
$RootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ContextPath = Join-Path $RootPath ".context"

function Get-ContextFile {
    param([string]$FileName)
    $path = Join-Path $ContextPath $FileName
    if (Test-Path $path) {
        return Get-Content $path -Raw
    }
    return $null
}

Clear-Host

Write-Host ""
Write-Host "  📊 PROJECT STATUS" -ForegroundColor Cyan
Write-Host "  ═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$masterContext = Get-ContextFile "MASTER_CONTEXT.md"
$currentState = Get-ContextFile "CURRENT_STATE.md"
$blockers = Get-ContextFile "BLOCKERS.md"
$sessionLog = Get-ContextFile "SESSION_LOG.md"

# Project name
if ($masterContext -match "# (.+) - Master Context") {
    Write-Host "  Project: $($Matches[1])" -ForegroundColor White
}

# Session count
$sessionCount = ([regex]::Matches($sessionLog, "## Session #\d+")).Count
Write-Host "  Sessions: $sessionCount" -ForegroundColor White

# Feature stats
$done = ([regex]::Matches($currentState, "✅ DONE")).Count
$inProgress = ([regex]::Matches($currentState, "🔨 IN PROGRESS")).Count
$planned = ([regex]::Matches($currentState, "📋 PLANNED")).Count
$blocked = ([regex]::Matches($currentState, "🚫 BLOCKED")).Count
$total = $done + $inProgress + $planned + $blocked

if ($total -gt 0) {
    $progress = [math]::Round(($done / $total) * 100, 0)
    $progressBar = ("█" * [math]::Floor($progress / 5)) + ("░" * (20 - [math]::Floor($progress / 5)))
    Write-Host ""
    Write-Host "  Progress: [$progressBar] $progress%" -ForegroundColor $(if ($progress -gt 70) { "Green" } elseif ($progress -gt 30) { "Yellow" } else { "Red" })
    Write-Host ""
    Write-Host "  Features:" -ForegroundColor White
    Write-Host "    ✅ Done:        $done" -ForegroundColor Green
    Write-Host "    🔨 In Progress: $inProgress" -ForegroundColor Yellow
    Write-Host "    📋 Planned:     $planned" -ForegroundColor Gray
    Write-Host "    🚫 Blocked:     $blocked" -ForegroundColor Red
}

# Blocker count
$blockerCount = ([regex]::Matches($blockers, "\| B\d+")).Count
Write-Host ""
if ($blockerCount -gt 0) {
    Write-Host "  ⚠️  Active Blockers: $blockerCount" -ForegroundColor Red
} else {
    Write-Host "  ✅ No Active Blockers" -ForegroundColor Green
}

# Active session check
$sessionTracker = Join-Path $ContextPath "sessions/.current_session"
if (Test-Path $sessionTracker) {
    $sessionData = Get-Content $sessionTracker | ConvertFrom-Json
    if ($sessionData.Status -eq "IN_PROGRESS") {
        Write-Host ""
        Write-Host "  🔄 Active Session: #$($sessionData.SessionNumber)" -ForegroundColor Cyan
        Write-Host "     Started: $($sessionData.StartTime)" -ForegroundColor Gray
    }
}

# Git status
Write-Host ""
Push-Location $RootPath
try {
    $uncommitted = (git status --porcelain 2>$null | Measure-Object -Line).Lines
    if ($uncommitted -gt 0) {
        Write-Host "  📦 Git: $uncommitted uncommitted changes" -ForegroundColor Yellow
    } else {
        Write-Host "  📦 Git: Clean" -ForegroundColor Green
    }
}
catch {
    Write-Host "  📦 Git: Not initialized" -ForegroundColor Gray
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "  ═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Commands: ctx-start | ctx-check | ctx-end | ctx-handoff" -ForegroundColor Gray
Write-Host ""
