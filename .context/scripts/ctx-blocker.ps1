<#
.SYNOPSIS
    Record a blocker or issue
.DESCRIPTION
    Adds a new blocker entry to BLOCKERS.md
.EXAMPLE
    .\ctx-blocker.ps1 -Title "Database connection timeout" -Impact "High" -Description "Cannot connect to PostgreSQL"
    .\ctx-blocker.ps1 -Interactive
    .\ctx-blocker.ps1 -Resolve B001 -Resolution "Increased connection pool size"
#>

param(
    [string]$Title,
    [string]$Description,
    [ValidateSet("Critical", "High", "Medium", "Low")]
    [string]$Impact = "Medium",
    [string]$Owner = "AI Assistant",
    [string]$ResolutionPath,
    [string]$Resolve,
    [string]$Resolution,
    [switch]$Interactive
)

$ErrorActionPreference = "Stop"
$RootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ContextPath = Join-Path $RootPath ".context"
$BlockerPath = Join-Path $ContextPath "BLOCKERS.md"

function Read-UserInput {
    param([string]$Prompt, [string]$Default = "")
    Write-Host ""
    Write-Host $Prompt -ForegroundColor Cyan
    if ($Default) { Write-Host "(Default: $Default)" -ForegroundColor Gray }
    $input = Read-Host
    if ([string]::IsNullOrWhiteSpace($input) -and $Default) { return $Default }
    return $input
}

$date = Get-Date -Format "yyyy-MM-dd"

Clear-Host

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ║   🚫 BLOCKER MANAGEMENT                                         ║" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$blockerContent = Get-Content $BlockerPath -Raw

# RESOLVE MODE
if ($Resolve) {
    Write-Host "Resolving blocker: $Resolve" -ForegroundColor Yellow
    
    if (-not $Resolution) {
        $Resolution = Read-UserInput "How was this resolved?"
    }
    
    # Find the blocker in active blockers
    $pattern = "\| $Resolve \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|"
    if ($blockerContent -match $pattern) {
        $blockerTitle = $Matches[1].Trim()
        
        # Remove from active
        $blockerContent = $blockerContent -replace "\| $Resolve \|[^\n]+\n", ""
        
        # Add to resolved section
        $resolvedEntry = "| $Resolve | $blockerTitle | $Resolution | $date |`n"
        
        # Find resolved section and add
        if ($blockerContent -match "## Resolved Blockers.*?\n\|[^\n]+\n\|[^\n]+\n") {
            $insertPoint = $blockerContent.IndexOf($Matches[0]) + $Matches[0].Length
            $blockerContent = $blockerContent.Insert($insertPoint, $resolvedEntry)
        }
        
        Set-Content -Path $BlockerPath -Value $blockerContent
        
        Write-Host ""
        Write-Host "✅ Blocker $Resolve resolved!" -ForegroundColor Green
        Write-Host "   Title: $blockerTitle" -ForegroundColor Gray
        Write-Host "   Resolution: $Resolution" -ForegroundColor Gray
    } else {
        Write-Host "❌ Blocker $Resolve not found in active blockers" -ForegroundColor Red
    }
    
    exit 0
}

# ADD MODE
# Get next blocker number
$blockerMatches = [regex]::Matches($blockerContent, "\| (B\d+)")
$nextNumber = 1
if ($blockerMatches.Count -gt 0) {
    $numbers = $blockerMatches | ForEach-Object { [int]($_.Groups[1].Value -replace 'B', '') }
    $nextNumber = ($numbers | Measure-Object -Maximum).Maximum + 1
}
$blockerId = "B{0:D3}" -f $nextNumber

Write-Host "Creating blocker: $blockerId" -ForegroundColor White
Write-Host ""

# Interactive mode
if ($Interactive -or (-not $Title)) {
    $Title = Read-UserInput "Blocker title:"
    $Description = Read-UserInput "Description (what's the problem):"
    
    Write-Host ""
    Write-Host "Impact levels: Critical, High, Medium, Low"
    $impactInput = Read-UserInput "Impact:" -Default "Medium"
    if ($impactInput -in @("Critical", "High", "Medium", "Low")) {
        $Impact = $impactInput
    }
    
    $Owner = Read-UserInput "Owner:" -Default "AI Assistant"
    $ResolutionPath = Read-UserInput "Potential resolution path:"
}

# Impact emoji
$impactEmoji = switch ($Impact) {
    "Critical" { "🔴" }
    "High" { "🟠" }
    "Medium" { "🟡" }
    "Low" { "🟢" }
}

# Add to active blockers
$blockerEntry = "| $blockerId | $Title | $impactEmoji $Impact | $Owner | $date | $ResolutionPath |`n"

# Find active blockers table and add entry
$pattern = "## Active Blockers\s*\n\|[^\n]+\n\|[^\n]+\n"
if ($blockerContent -match $pattern) {
    $insertPoint = $blockerContent.IndexOf($Matches[0]) + $Matches[0].Length
    $blockerContent = $blockerContent.Insert($insertPoint, $blockerEntry)
}

# Update timestamp
$blockerContent = $blockerContent -replace '\*Last Updated:.*\*', "*Last Updated: $date*"

Set-Content -Path $BlockerPath -Value $blockerContent

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Blocker $blockerId created!" -ForegroundColor Green
Write-Host ""
Write-Host "   Title: $Title" -ForegroundColor White
Write-Host "   Impact: $impactEmoji $Impact" -ForegroundColor White
Write-Host "   Owner: $Owner" -ForegroundColor White
Write-Host ""
Write-Host "📁 View in: .context/BLOCKERS.md" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 To resolve: .\ctx-blocker.ps1 -Resolve $blockerId -Resolution 'How it was fixed'" -ForegroundColor Yellow
Write-Host ""
