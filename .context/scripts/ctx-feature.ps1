<#
.SYNOPSIS
    Update feature status
.DESCRIPTION
    Updates a feature's status in CURRENT_STATE.md
.EXAMPLE
    .\ctx-feature.ps1 -Id F001 -Status "IN_PROGRESS" -Completion 50
    .\ctx-feature.ps1 -Add -Name "User Authentication" -Description "OAuth2 implementation"
    .\ctx-feature.ps1 -List
#>

param(
    [string]$Id,
    [ValidateSet("DONE", "IN_PROGRESS", "PLANNED", "BLOCKED", "CANCELLED")]
    [string]$Status,
    [int]$Completion,
    [string]$Notes,
    [switch]$Add,
    [string]$Name,
    [string]$Description,
    [string]$Owner = "AI",
    [switch]$List
)

$ErrorActionPreference = "Stop"
$RootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ContextPath = Join-Path $RootPath ".context"
$StatePath = Join-Path $ContextPath "CURRENT_STATE.md"

$date = Get-Date -Format "yyyy-MM-dd"

# Status to emoji mapping
$statusEmoji = @{
    "DONE" = "✅ DONE"
    "IN_PROGRESS" = "🔨 IN PROGRESS"
    "PLANNED" = "📋 PLANNED"
    "BLOCKED" = "🚫 BLOCKED"
    "CANCELLED" = "❌ CANCELLED"
}

Clear-Host

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ║   📊 FEATURE STATUS MANAGEMENT                                  ║" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$stateContent = Get-Content $StatePath -Raw

# LIST MODE
if ($List) {
    Write-Host "Current Features:" -ForegroundColor Yellow
    Write-Host ""
    
    $featurePattern = "\| (F\d+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|"
    $matches = [regex]::Matches($stateContent, $featurePattern)
    
    foreach ($match in $matches) {
        $fId = $match.Groups[1].Value
        $fName = $match.Groups[2].Value.Trim()
        $fStatus = $match.Groups[3].Value.Trim()
        $fCompletion = $match.Groups[4].Value.Trim()
        
        Write-Host "  $fId | $fName | $fStatus | $fCompletion" -ForegroundColor White
    }
    
    Write-Host ""
    exit 0
}

# ADD MODE
if ($Add) {
    if (-not $Name) {
        Write-Host "Feature name:" -ForegroundColor Cyan
        $Name = Read-Host
    }
    
    # Get next feature number
    $featureMatches = [regex]::Matches($stateContent, "\| (F\d+)")
    $nextNumber = 1
    if ($featureMatches.Count -gt 0) {
        $numbers = $featureMatches | ForEach-Object { [int]($_.Groups[1].Value -replace 'F', '') }
        $nextNumber = ($numbers | Measure-Object -Maximum).Maximum + 1
    }
    $featureId = "F{0:D3}" -f $nextNumber
    
    $featureStatus = $statusEmoji["PLANNED"]
    $featureEntry = "| $featureId | $Name | $featureStatus | 0% | $Owner | $Description |`n"
    
    # Find feature table and add
    $tablePattern = "## Feature Status\s*\n\|[^\n]+\n\|[^\n]+\n"
    if ($stateContent -match $tablePattern) {
        $insertPoint = $stateContent.IndexOf($Matches[0]) + $Matches[0].Length
        # Find end of table entries
        $tableEnd = $stateContent.IndexOf("`n`n", $insertPoint)
        if ($tableEnd -gt 0) {
            $stateContent = $stateContent.Insert($tableEnd, $featureEntry)
        } else {
            $stateContent = $stateContent.Insert($insertPoint, $featureEntry)
        }
    }
    
    # Update timestamp
    $stateContent = $stateContent -replace '\*Last Updated:.*\*', "*Last Updated: $date | Session: #?*"
    
    Set-Content -Path $StatePath -Value $stateContent
    
    Write-Host "✅ Feature $featureId added: $Name" -ForegroundColor Green
    Write-Host ""
    exit 0
}

# UPDATE MODE
if (-not $Id) {
    Write-Host "Feature ID to update (e.g., F001):" -ForegroundColor Cyan
    $Id = Read-Host
}

if (-not $Status) {
    Write-Host ""
    Write-Host "New status (DONE, IN_PROGRESS, PLANNED, BLOCKED, CANCELLED):" -ForegroundColor Cyan
    $Status = Read-Host
}

if (-not $Completion) {
    Write-Host ""
    Write-Host "Completion percentage (0-100):" -ForegroundColor Cyan
    $completionInput = Read-Host
    if ($completionInput) {
        $Completion = [int]$completionInput
    }
}

# Find and update the feature
$featurePattern = "\| $Id \| ([^|]+) \| [^|]+ \| [^|]+ \| ([^|]+) \| ([^|]+) \|"
if ($stateContent -match $featurePattern) {
    $featureName = $Matches[1].Trim()
    $featureOwner = $Matches[2].Trim()
    $featureNotes = if ($Notes) { $Notes } else { $Matches[3].Trim() }
    
    $newStatus = $statusEmoji[$Status]
    $newLine = "| $Id | $featureName | $newStatus | $Completion% | $featureOwner | $featureNotes |"
    
    $stateContent = $stateContent -replace "\| $Id \|[^\n]+", $newLine
    
    # Update timestamp
    $stateContent = $stateContent -replace '\*Last Updated:.*\*', "*Last Updated: $date*"
    
    Set-Content -Path $StatePath -Value $stateContent
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✅ Feature $Id updated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Name: $featureName" -ForegroundColor White
    Write-Host "   Status: $newStatus" -ForegroundColor White
    Write-Host "   Completion: $Completion%" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ Feature $Id not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available features:" -ForegroundColor Yellow
    & $PSScriptRoot\ctx-feature.ps1 -List
}
