<#
.SYNOPSIS
    Claim a task from the action queue
.DESCRIPTION
    Assigns a task to yourself, preventing double-work in team environment
.EXAMPLE
    .\ctx-claim.ps1 -Id A001
    .\ctx-claim.ps1 -Id A001 -Developer "Alice"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Id,
    
    [string]$Developer = $env:USERNAME,
    
    [string]$EstimatedHours
)

$ErrorActionPreference = "Stop"
$RootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ContextPath = Join-Path $RootPath ".context"
$ClaimsPath = Join-Path $ContextPath "team/claims.json"

$date = Get-Date -Format "yyyy-MM-dd HH:mm"

# Ensure team folder exists
$teamPath = Join-Path $ContextPath "team"
if (-not (Test-Path $teamPath)) {
    New-Item -ItemType Directory -Path $teamPath -Force | Out-Null
}

# Load or create claims file
$claims = @{}
if (Test-Path $ClaimsPath) {
    $claims = Get-Content $ClaimsPath | ConvertFrom-Json -AsHashtable
}
if (-not $claims) { $claims = @{} }

Clear-Host

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ║   🎯 CLAIM TASK                                                 ║" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if already claimed
if ($claims.ContainsKey($Id)) {
    $existingClaim = $claims[$Id]
    if ($existingClaim.developer -eq $Developer) {
        Write-Host "⚠️  You already have this task claimed!" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Task $Id is already claimed by $($existingClaim.developer)" -ForegroundColor Red
        Write-Host "   Claimed on: $($existingClaim.claimedAt)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   Contact them or use: ctx-release $Id (if you have permission)" -ForegroundColor Yellow
    }
    exit 1
}

# Verify task exists in NEXT_ACTIONS.md
$actionsPath = Join-Path $ContextPath "NEXT_ACTIONS.md"
$actionsContent = Get-Content $actionsPath -Raw

if ($actionsContent -notmatch "\| $Id \|") {
    Write-Host "❌ Task $Id not found in NEXT_ACTIONS.md" -ForegroundColor Red
    exit 1
}

# Extract task title
$taskTitle = ""
if ($actionsContent -match "\| $Id \| ([^|]+) \|") {
    $taskTitle = $Matches[1].Trim()
}

# Create claim
$claims[$Id] = @{
    developer = $Developer
    claimedAt = $date
    estimatedHours = $EstimatedHours
    taskTitle = $taskTitle
    status = "in-progress"
}

# Save claims
$claims | ConvertTo-Json -Depth 10 | Set-Content $ClaimsPath

# Update NEXT_ACTIONS.md to show claim
$actionsContent = $actionsContent -replace "(\| $Id \| [^|]+ \| [^|]+ \|) [^|]+ \|", "`$1 🔒 $Developer |"
Set-Content -Path $actionsPath -Value $actionsContent

Write-Host "✅ Task $Id claimed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "   Task: $taskTitle" -ForegroundColor White
Write-Host "   Developer: $Developer" -ForegroundColor White
Write-Host "   Claimed: $date" -ForegroundColor White
if ($EstimatedHours) {
    Write-Host "   Estimated: $EstimatedHours hours" -ForegroundColor White
}
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Create feature branch: git checkout -b feature/$Id-description" -ForegroundColor Gray
Write-Host "   2. Run ctx-start to begin session" -ForegroundColor Gray
Write-Host "   3. When done: ctx-release $Id" -ForegroundColor Gray
Write-Host ""
