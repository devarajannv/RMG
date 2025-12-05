<#
.SYNOPSIS
    Record an Architecture Decision Record (ADR)
.DESCRIPTION
    Adds a new ADR entry to ARCHITECTURE_DECISIONS.md
.EXAMPLE
    .\ctx-adr.ps1 -Title "Use PostgreSQL for database" -Context "Need relational DB" -Decision "PostgreSQL 16"
    .\ctx-adr.ps1 -Interactive
#>

param(
    [string]$Title,
    [string]$Context,
    [string]$Decision,
    [string]$Alternatives,
    [string]$Consequences,
    [ValidateSet("Proposed", "Accepted", "Deprecated", "Superseded")]
    [string]$Status = "Accepted",
    [switch]$Interactive
)

$ErrorActionPreference = "Stop"
$RootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ContextPath = Join-Path $RootPath ".context"
$AdrPath = Join-Path $ContextPath "ARCHITECTURE_DECISIONS.md"

function Read-UserInput {
    param([string]$Prompt, [string]$Default = "")
    Write-Host ""
    Write-Host $Prompt -ForegroundColor Cyan
    if ($Default) { Write-Host "(Default: $Default)" -ForegroundColor Gray }
    $input = Read-Host
    if ([string]::IsNullOrWhiteSpace($input) -and $Default) { return $Default }
    return $input
}

# Get next ADR number
$adrContent = Get-Content $AdrPath -Raw
$adrMatches = [regex]::Matches($adrContent, "## ADR-(\d+)")
$nextNumber = 1
if ($adrMatches.Count -gt 0) {
    $lastNumber = [int]($adrMatches[$adrMatches.Count - 1].Groups[1].Value)
    $nextNumber = $lastNumber + 1
}
$adrId = "ADR-{0:D3}" -f $nextNumber

Clear-Host

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ║   📐 NEW ARCHITECTURE DECISION RECORD                           ║" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Creating $adrId" -ForegroundColor White
Write-Host ""

# Interactive mode
if ($Interactive -or (-not $Title)) {
    $Title = Read-UserInput "Title (e.g., 'Use PostgreSQL for database'):"
    $Context = Read-UserInput "Context - What problem are we solving?"
    $Decision = Read-UserInput "Decision - What did we decide?"
    $Alternatives = Read-UserInput "Alternatives considered (or 'none'):" -Default "None considered"
    $Consequences = Read-UserInput "Consequences - What are the trade-offs?"
    
    Write-Host ""
    Write-Host "Status options: Proposed, Accepted, Deprecated, Superseded"
    $statusInput = Read-UserInput "Status:" -Default "Accepted"
    if ($statusInput -in @("Proposed", "Accepted", "Deprecated", "Superseded")) {
        $Status = $statusInput
    }
}

$date = Get-Date -Format "yyyy-MM-dd"

# Create ADR entry
$adrEntry = @"

---

## $adrId`: $Title

**Date:** $date
**Status:** $Status
**Deciders:** AI Assistant, Product Owner

### Context
$Context

### Decision
$Decision

### Alternatives Considered
$Alternatives

### Consequences
$Consequences

"@

# Find insertion point (before the last "---" or at end)
$insertPoint = $adrContent.LastIndexOf("*Last Updated:")
if ($insertPoint -gt 0) {
    $newContent = $adrContent.Substring(0, $insertPoint) + $adrEntry + "`n`n*Last Updated: $date*"
} else {
    $newContent = $adrContent + $adrEntry
}

Set-Content -Path $AdrPath -Value $newContent

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ $adrId recorded successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Title: $Title" -ForegroundColor White
Write-Host "Status: $Status" -ForegroundColor White
Write-Host ""
Write-Host "📁 View in: .context/ARCHITECTURE_DECISIONS.md" -ForegroundColor Gray
Write-Host ""
