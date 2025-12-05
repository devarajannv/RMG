<#
.SYNOPSIS
    AI Context Sync - Outputs all context for AI to read
.DESCRIPTION
    Concatenates all context files into a single output
    for copying into AI chat context
.EXAMPLE
    .\ctx-sync.ps1
    .\ctx-sync.ps1 -Compact
    .\ctx-sync.ps1 | clip  # Copy to clipboard
#>

param(
    [switch]$Compact,
    [switch]$ToClipboard
)

$ErrorActionPreference = "Stop"
$RootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ContextPath = Join-Path $RootPath ".context"

function Get-ContextFile {
    param([string]$FileName)
    $path = Join-Path $ContextPath $FileName
    if (Test-Path $path) {
        return Get-Content $path -Raw
    }
    return "[Not found]"
}

$output = @"
# ═══════════════════════════════════════════════════════════════════════
# AI CONTEXT SYNC - $(Get-Date -Format "yyyy-MM-dd HH:mm")
# ═══════════════════════════════════════════════════════════════════════

## INSTRUCTIONS FOR AI

You are continuing work on a project. Read the context below carefully.
- MASTER_CONTEXT: Vision and non-negotiables
- CURRENT_STATE: What's built, what's pending
- NEXT_ACTIONS: What to work on (P0 first)
- ARCHITECTURE_DECISIONS: Technical choices made
- BLOCKERS: Known issues

After reading, confirm your understanding before proceeding.

═══════════════════════════════════════════════════════════════════════
MASTER CONTEXT
═══════════════════════════════════════════════════════════════════════

$(Get-ContextFile "MASTER_CONTEXT.md")

═══════════════════════════════════════════════════════════════════════
CURRENT STATE
═══════════════════════════════════════════════════════════════════════

$(Get-ContextFile "CURRENT_STATE.md")

═══════════════════════════════════════════════════════════════════════
NEXT ACTIONS
═══════════════════════════════════════════════════════════════════════

$(Get-ContextFile "NEXT_ACTIONS.md")

═══════════════════════════════════════════════════════════════════════
ARCHITECTURE DECISIONS
═══════════════════════════════════════════════════════════════════════

$(Get-ContextFile "ARCHITECTURE_DECISIONS.md")

═══════════════════════════════════════════════════════════════════════
BLOCKERS
═══════════════════════════════════════════════════════════════════════

$(Get-ContextFile "BLOCKERS.md")

═══════════════════════════════════════════════════════════════════════
END OF CONTEXT SYNC
═══════════════════════════════════════════════════════════════════════
"@

if ($Compact) {
    # Remove excessive whitespace for smaller context
    $output = $output -replace "(\r?\n){3,}", "`n`n"
}

if ($ToClipboard) {
    $output | Set-Clipboard
    Write-Host "✅ Context copied to clipboard!" -ForegroundColor Green
    Write-Host "   Paste this into your AI chat to sync context." -ForegroundColor Gray
} else {
    Write-Output $output
}
