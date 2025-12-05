<#
.SYNOPSIS
    Add or update a next action item
.DESCRIPTION
    Manages the priority action queue in NEXT_ACTIONS.md
.EXAMPLE
    .\ctx-action.ps1 -Add -Title "Build user authentication" -Priority P1
    .\ctx-action.ps1 -Complete A001
    .\ctx-action.ps1 -Block A002 -BlockedBy "Waiting for API keys"
    .\ctx-action.ps1 -List
#>

param(
    [switch]$Add,
    [switch]$Complete,
    [switch]$Block,
    [switch]$List,
    [string]$Id,
    [string]$Title,
    [string]$Context,
    [ValidateSet("P0", "P1", "P2", "P3")]
    [string]$Priority = "P1",
    [string]$BlockedBy
)

$ErrorActionPreference = "Stop"
$RootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ContextPath = Join-Path $RootPath ".context"
$ActionsPath = Join-Path $ContextPath "NEXT_ACTIONS.md"

$date = Get-Date -Format "yyyy-MM-dd"

Clear-Host

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ║   🎯 ACTION QUEUE MANAGEMENT                                    ║" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$actionsContent = Get-Content $ActionsPath -Raw

# LIST MODE
if ($List) {
    Write-Host "Current Actions:" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($p in @("P0", "P1", "P2", "P3", "BLOCKED")) {
        Write-Host "  $p" -ForegroundColor $(switch ($p) { "P0" { "Red" } "P1" { "Yellow" } "P2" { "White" } "P3" { "Gray" } "BLOCKED" { "Magenta" } })
        
        $actionPattern = "\| (A\d+) \| ([^|]+) \| ([^|]+) \|"
        $section = ""
        
        if ($p -eq "BLOCKED") {
            if ($actionsContent -match "### BLOCKED([\s\S]*?)(?=---|$)") {
                $section = $Matches[1]
            }
        } else {
            if ($actionsContent -match "### $p[^\n]*\n([\s\S]*?)(?=###|---|$)") {
                $section = $Matches[1]
            }
        }
        
        $matches = [regex]::Matches($section, $actionPattern)
        if ($matches.Count -gt 0) {
            foreach ($match in $matches) {
                Write-Host "    [$($match.Groups[1].Value)] $($match.Groups[2].Value.Trim())" -ForegroundColor White
            }
        } else {
            Write-Host "    (empty)" -ForegroundColor Gray
        }
        Write-Host ""
    }
    exit 0
}

# ADD MODE
if ($Add) {
    if (-not $Title) {
        Write-Host "Action title:" -ForegroundColor Cyan
        $Title = Read-Host
    }
    if (-not $Context) {
        Write-Host "Context/details:" -ForegroundColor Cyan
        $Context = Read-Host
    }
    
    # Get next action number
    $actionMatches = [regex]::Matches($actionsContent, "\| (A\d+)")
    $nextNumber = 1
    if ($actionMatches.Count -gt 0) {
        $numbers = $actionMatches | ForEach-Object { [int]($_.Groups[1].Value -replace 'A', '') }
        $nextNumber = ($numbers | Measure-Object -Maximum).Maximum + 1
    }
    $actionId = "A{0:D3}" -f $nextNumber
    
    $actionEntry = "| $actionId | $Title | $Context | - |`n"
    
    # Find priority section and add
    $sectionHeader = "### $Priority"
    if ($actionsContent -match "$sectionHeader[^\n]*\n\|[^\n]+\n\|[^\n]+\n") {
        $insertPoint = $actionsContent.IndexOf($Matches[0]) + $Matches[0].Length
        $actionsContent = $actionsContent.Insert($insertPoint, $actionEntry)
    }
    
    # Update timestamp
    $actionsContent = $actionsContent -replace '\*Last Updated:.*\*', "*Last Updated: $date*"
    
    Set-Content -Path $ActionsPath -Value $actionsContent
    
    Write-Host "✅ Action $actionId added to $Priority queue" -ForegroundColor Green
    Write-Host "   Title: $Title" -ForegroundColor White
    Write-Host ""
    exit 0
}

# COMPLETE MODE
if ($Complete) {
    if (-not $Id) {
        Write-Host "Action ID to complete:" -ForegroundColor Cyan
        $Id = Read-Host
    }
    
    # Remove from wherever it is
    $actionsContent = $actionsContent -replace "\| $Id \|[^\n]+\n", ""
    
    # Update timestamp
    $actionsContent = $actionsContent -replace '\*Last Updated:.*\*', "*Last Updated: $date*"
    
    Set-Content -Path $ActionsPath -Value $actionsContent
    
    Write-Host "✅ Action $Id completed and removed from queue" -ForegroundColor Green
    Write-Host ""
    exit 0
}

# BLOCK MODE
if ($Block) {
    if (-not $Id) {
        Write-Host "Action ID to block:" -ForegroundColor Cyan
        $Id = Read-Host
    }
    if (-not $BlockedBy) {
        Write-Host "Blocked by (reason):" -ForegroundColor Cyan
        $BlockedBy = Read-Host
    }
    
    # Find the action
    $actionPattern = "\| $Id \| ([^|]+) \| ([^|]+) \| [^|]+ \|"
    if ($actionsContent -match $actionPattern) {
        $title = $Matches[1].Trim()
        $context = $Matches[2].Trim()
        
        # Remove from current location
        $actionsContent = $actionsContent -replace "\| $Id \|[^\n]+\n", ""
        
        # Add to BLOCKED section
        $blockedEntry = "| $Id | $title | $BlockedBy | TBD |`n"
        
        if ($actionsContent -match "### BLOCKED\s*\n\|[^\n]+\n\|[^\n]+\n") {
            $insertPoint = $actionsContent.IndexOf($Matches[0]) + $Matches[0].Length
            $actionsContent = $actionsContent.Insert($insertPoint, $blockedEntry)
        }
        
        # Update timestamp
        $actionsContent = $actionsContent -replace '\*Last Updated:.*\*', "*Last Updated: $date*"
        
        Set-Content -Path $ActionsPath -Value $actionsContent
        
        Write-Host "✅ Action $Id moved to BLOCKED" -ForegroundColor Yellow
        Write-Host "   Reason: $BlockedBy" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "❌ Action $Id not found" -ForegroundColor Red
    }
    exit 0
}

# Default: show help
Write-Host "Usage:" -ForegroundColor Yellow
Write-Host "  ctx-action.ps1 -List                           # Show all actions"
Write-Host "  ctx-action.ps1 -Add -Title 'Do X' -Priority P0 # Add new action"
Write-Host "  ctx-action.ps1 -Complete A001                  # Mark complete"
Write-Host "  ctx-action.ps1 -Block A002 -BlockedBy 'reason' # Mark blocked"
Write-Host ""
