<#
.SYNOPSIS
    Start a new development session with full context loading
.DESCRIPTION
    Reads all context files and displays current project state.
    Run this at the beginning of every session.
.EXAMPLE
    .\ctx-start.ps1
#>

param(
    [switch]$Brief,
    [switch]$NoPrompt
)

$ErrorActionPreference = "Stop"
$RootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ContextPath = Join-Path $RootPath ".context"

# Colors
$HeaderColor = "Cyan"
$SuccessColor = "Green"
$WarningColor = "Yellow"
$ErrorColor = "Red"
$InfoColor = "White"

function Write-Section {
    param([string]$Title, [string]$Color = $HeaderColor)
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor $Color
    Write-Host " $Title" -ForegroundColor $Color
    Write-Host ("=" * 70) -ForegroundColor $Color
}

function Read-ContextFile {
    param([string]$FileName)
    $path = Join-Path $ContextPath $FileName
    if (Test-Path $path) {
        return Get-Content $path -Raw
    }
    return $null
}

function Get-SessionCount {
    $logPath = Join-Path $ContextPath "SESSION_LOG.md"
    if (Test-Path $logPath) {
        $content = Get-Content $logPath -Raw
        $matches = [regex]::Matches($content, "## Session #(\d+)")
        if ($matches.Count -gt 0) {
            $lastSession = [int]($matches[$matches.Count - 1].Groups[1].Value)
            return $lastSession
        }
    }
    return 0
}

function Get-FeatureStats {
    $statePath = Join-Path $ContextPath "CURRENT_STATE.md"
    if (Test-Path $statePath) {
        $content = Get-Content $statePath -Raw
        $done = ([regex]::Matches($content, "✅ DONE")).Count
        $inProgress = ([regex]::Matches($content, "🔨 IN PROGRESS")).Count
        $planned = ([regex]::Matches($content, "📋 PLANNED")).Count
        $blocked = ([regex]::Matches($content, "🚫 BLOCKED")).Count
        return @{
            Done = $done
            InProgress = $inProgress
            Planned = $planned
            Blocked = $blocked
            Total = $done + $inProgress + $planned + $blocked
        }
    }
    return $null
}

function Get-BlockerCount {
    $blockerPath = Join-Path $ContextPath "BLOCKERS.md"
    if (Test-Path $blockerPath) {
        $content = Get-Content $blockerPath -Raw
        # Count rows in Active Blockers table (excluding header and empty)
        $matches = [regex]::Matches($content, "\| B\d+")
        return $matches.Count
    }
    return 0
}

function Get-P0ActionCount {
    $actionsPath = Join-Path $ContextPath "NEXT_ACTIONS.md"
    if (Test-Path $actionsPath) {
        $content = Get-Content $actionsPath -Raw
        # Count P0 actions
        $matches = [regex]::Matches($content, "\| A\d+")
        return $matches.Count
    }
    return 0
}

# Clear screen for fresh start
Clear-Host

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor $HeaderColor
Write-Host "  ║                                                                  ║" -ForegroundColor $HeaderColor
Write-Host "  ║   🚀 CONTEXT-AS-CODE SESSION START                              ║" -ForegroundColor $HeaderColor
Write-Host "  ║                                                                  ║" -ForegroundColor $HeaderColor
Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor $HeaderColor
Write-Host ""

# Check if context exists
if (-not (Test-Path $ContextPath)) {
    Write-Host "❌ ERROR: .context folder not found!" -ForegroundColor $ErrorColor
    Write-Host "   Run ctx-init.ps1 first to initialize the project." -ForegroundColor $WarningColor
    exit 1
}

# Get session number
$lastSession = Get-SessionCount
$newSession = $lastSession + 1

Write-Host "📅 Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor $InfoColor
Write-Host "🔢 Starting Session: #$newSession" -ForegroundColor $InfoColor
Write-Host ""

# Read and display MASTER_CONTEXT summary
Write-Section "📋 PROJECT CONTEXT"
$masterContext = Read-ContextFile "MASTER_CONTEXT.md"
if ($masterContext) {
    # Extract project name and description
    if ($masterContext -match "# (.+) - Master Context") {
        Write-Host "Project: $($Matches[1])" -ForegroundColor $SuccessColor
    }
    if ($masterContext -match "- \*\*Description:\*\* (.+)") {
        Write-Host "Description: $($Matches[1])" -ForegroundColor $InfoColor
    }
} else {
    Write-Host "⚠️  MASTER_CONTEXT.md not found or empty" -ForegroundColor $WarningColor
}

# Display current state summary
Write-Section "📊 CURRENT STATE"
$featureStats = Get-FeatureStats
if ($featureStats -and $featureStats.Total -gt 0) {
    $completion = [math]::Round(($featureStats.Done / $featureStats.Total) * 100, 1)
    Write-Host "Overall Progress: $completion% ($($featureStats.Done)/$($featureStats.Total) features done)" -ForegroundColor $InfoColor
    Write-Host ""
    Write-Host "  ✅ Done:        $($featureStats.Done)" -ForegroundColor $SuccessColor
    Write-Host "  🔨 In Progress: $($featureStats.InProgress)" -ForegroundColor $WarningColor
    Write-Host "  📋 Planned:     $($featureStats.Planned)" -ForegroundColor $InfoColor
    Write-Host "  🚫 Blocked:     $($featureStats.Blocked)" -ForegroundColor $ErrorColor
} else {
    Write-Host "No features tracked yet" -ForegroundColor $WarningColor
}

# Display blockers
$blockerCount = Get-BlockerCount
if ($blockerCount -gt 0) {
    Write-Host ""
    Write-Host "⚠️  ACTIVE BLOCKERS: $blockerCount" -ForegroundColor $ErrorColor
    Write-Host "   Review .context/BLOCKERS.md before proceeding" -ForegroundColor $WarningColor
}

# Display priority actions
Write-Section "🎯 PRIORITY ACTIONS (P0)"
$actionsContent = Read-ContextFile "NEXT_ACTIONS.md"
if ($actionsContent) {
    # Extract P0 section
    if ($actionsContent -match "### P0 - Critical([\s\S]*?)### P1") {
        $p0Section = $Matches[1]
        $actionMatches = [regex]::Matches($p0Section, "\| (A\d+) \| ([^|]+) \|")
        if ($actionMatches.Count -gt 0) {
            foreach ($match in $actionMatches) {
                Write-Host "  → [$($match.Groups[1].Value)] $($match.Groups[2].Value.Trim())" -ForegroundColor $WarningColor
            }
        } else {
            Write-Host "  No P0 actions - check P1 priorities" -ForegroundColor $SuccessColor
        }
    }
} else {
    Write-Host "  NEXT_ACTIONS.md not found" -ForegroundColor $WarningColor
}

# Display last session summary
Write-Section "📝 LAST SESSION SUMMARY"
$sessionLog = Read-ContextFile "SESSION_LOG.md"
if ($sessionLog -and $lastSession -gt 0) {
    # Extract last session
    $pattern = "## Session #$lastSession([\s\S]*?)(?=## Session #|$)"
    if ($sessionLog -match $pattern) {
        $lastSessionContent = $Matches[1]
        # Extract summary
        if ($lastSessionContent -match "### Summary\s*\n([^\n#]+)") {
            Write-Host "Last Session (#$lastSession): $($Matches[1].Trim())" -ForegroundColor $InfoColor
        }
        # Extract what was completed
        if ($lastSessionContent -match "### Completed\s*\n([\s\S]*?)###") {
            $completed = $Matches[1] -split "`n" | Where-Object { $_ -match "^- " } | Select-Object -First 3
            if ($completed) {
                Write-Host ""
                Write-Host "Completed:" -ForegroundColor $SuccessColor
                foreach ($item in $completed) {
                    Write-Host "  $item" -ForegroundColor $InfoColor
                }
            }
        }
    }
} else {
    Write-Host "This is the first session" -ForegroundColor $InfoColor
}

# Files for AI to read
Write-Section "📚 CONTEXT FILES FOR AI"
Write-Host "The AI assistant should read these files to maintain context:" -ForegroundColor $InfoColor
Write-Host ""
Write-Host "  1. .context/MASTER_CONTEXT.md      - Vision & requirements" -ForegroundColor $InfoColor
Write-Host "  2. .context/CURRENT_STATE.md       - What's built" -ForegroundColor $InfoColor
Write-Host "  3. .context/NEXT_ACTIONS.md        - What to do" -ForegroundColor $InfoColor
Write-Host "  4. .context/ARCHITECTURE_DECISIONS.md - Why decisions were made" -ForegroundColor $InfoColor
Write-Host "  5. .context/BLOCKERS.md            - Known issues" -ForegroundColor $InfoColor
Write-Host ""

# Session tracking file
$sessionTracker = Join-Path $ContextPath "sessions/.current_session"
$sessionDir = Split-Path $sessionTracker -Parent
if (-not (Test-Path $sessionDir)) {
    New-Item -ItemType Directory -Path $sessionDir -Force | Out-Null
}
@{
    SessionNumber = $newSession
    StartTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Status = "IN_PROGRESS"
} | ConvertTo-Json | Set-Content $sessionTracker

Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor $HeaderColor
Write-Host ""
Write-Host "✅ Session #$newSession started at $(Get-Date -Format 'HH:mm')" -ForegroundColor $SuccessColor
Write-Host ""
Write-Host "💡 TIP: Ask the AI to read the context files listed above" -ForegroundColor $WarningColor
Write-Host "💡 TIP: Run ctx-check.ps1 anytime to verify context alignment" -ForegroundColor $WarningColor
Write-Host "💡 TIP: Run ctx-end.ps1 when finishing this session" -ForegroundColor $WarningColor
Write-Host ""
