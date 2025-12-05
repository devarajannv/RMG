<#
.SYNOPSIS
    Pre-merge validation of context consistency
.DESCRIPTION
    Checks for context conflicts before merging branches
.EXAMPLE
    .\ctx-merge-check.ps1
    .\ctx-merge-check.ps1 -TargetBranch main -SourceBranch feature/auth
#>

param(
    [string]$TargetBranch = "main",
    [string]$SourceBranch,
    [switch]$AutoFix
)

$ErrorActionPreference = "Stop"
$RootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ContextPath = Join-Path $RootPath ".context"

$issues = @()
$warnings = @()

function Add-Issue {
    param([string]$Message, [string]$File, [string]$Severity = "ERROR")
    $script:issues += @{
        Message = $Message
        File = $File
        Severity = $Severity
    }
}

function Add-Warning {
    param([string]$Message, [string]$File)
    $script:warnings += @{
        Message = $Message
        File = $File
    }
}

Clear-Host

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ║   🔍 PRE-MERGE CONTEXT VALIDATION                               ║" -ForegroundColor Cyan
Write-Host "  ║                                                                  ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Push-Location $RootPath

try {
    # Get current branch if not specified
    if (-not $SourceBranch) {
        $SourceBranch = git branch --show-current 2>$null
    }
    
    Write-Host "Checking: $SourceBranch → $TargetBranch" -ForegroundColor White
    Write-Host ""
    
    # ════════════════════════════════════════════════════════════════════════
    # CHECK 1: Context file conflicts
    # ════════════════════════════════════════════════════════════════════════
    
    Write-Host "1️⃣  Checking for context file conflicts..." -ForegroundColor Yellow
    
    $contextConflicts = git diff --name-only $TargetBranch...$SourceBranch -- ".context/" 2>$null
    
    if ($contextConflicts) {
        Write-Host "   Modified context files:" -ForegroundColor White
        foreach ($file in $contextConflicts) {
            Write-Host "   └── $file" -ForegroundColor Gray
            
            # Check if file was modified in both branches
            $targetChanges = git log $TargetBranch --oneline -1 -- $file 2>$null
            if ($targetChanges) {
                Add-Warning "File modified in both branches - review carefully" $file
                Write-Host "       ⚠️  Also modified in $TargetBranch" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "   ✓ No context file conflicts detected" -ForegroundColor Green
    }
    
    Write-Host ""
    
    # ════════════════════════════════════════════════════════════════════════
    # CHECK 2: ADR consistency
    # ════════════════════════════════════════════════════════════════════════
    
    Write-Host "2️⃣  Checking ADR consistency..." -ForegroundColor Yellow
    
    $adrPath = Join-Path $ContextPath "ARCHITECTURE_DECISIONS.md"
    if (Test-Path $adrPath) {
        $adrContent = Get-Content $adrPath -Raw
        
        # Check for duplicate ADR numbers
        $adrNumbers = [regex]::Matches($adrContent, "## ADR-(\d+)")
        $seen = @{}
        foreach ($match in $adrNumbers) {
            $num = $match.Groups[1].Value
            if ($seen.ContainsKey($num)) {
                Add-Issue "Duplicate ADR number: ADR-$num" "ARCHITECTURE_DECISIONS.md"
            }
            $seen[$num] = $true
        }
        
        # Check for conflicting decisions on same topic
        $deprecatedCount = ([regex]::Matches($adrContent, "Status:\s*Deprecated")).Count
        $supersededCount = ([regex]::Matches($adrContent, "Status:\s*Superseded")).Count
        
        if ($deprecatedCount -gt 0 -or $supersededCount -gt 0) {
            Add-Warning "$deprecatedCount deprecated, $supersededCount superseded ADRs - ensure referenced correctly" "ARCHITECTURE_DECISIONS.md"
        }
        
        Write-Host "   ✓ ADR consistency check complete" -ForegroundColor Green
    }
    
    Write-Host ""
    
    # ════════════════════════════════════════════════════════════════════════
    # CHECK 3: Feature ownership conflicts
    # ════════════════════════════════════════════════════════════════════════
    
    Write-Host "3️⃣  Checking feature ownership..." -ForegroundColor Yellow
    
    $claimsPath = Join-Path $ContextPath "team/claims.json"
    if (Test-Path $claimsPath) {
        $claims = Get-Content $claimsPath | ConvertFrom-Json -AsHashtable
        
        # Check if any claimed tasks are being modified by non-owner
        $modifiedFiles = git diff --name-only $TargetBranch...$SourceBranch 2>$null
        
        foreach ($file in $modifiedFiles) {
            # Extract feature from path if applicable
            if ($file -match "features/([^/]+)/") {
                $featureName = $Matches[1]
                # Check if someone else owns this feature
                foreach ($taskId in $claims.Keys) {
                    $claim = $claims[$taskId]
                    if ($claim.taskTitle -match $featureName -and $claim.developer -ne $env:USERNAME) {
                        Add-Warning "Modifying feature owned by $($claim.developer): $featureName" $file
                    }
                }
            }
        }
        
        Write-Host "   ✓ Feature ownership check complete" -ForegroundColor Green
    }
    
    Write-Host ""
    
    # ════════════════════════════════════════════════════════════════════════
    # CHECK 4: API contract changes
    # ════════════════════════════════════════════════════════════════════════
    
    Write-Host "4️⃣  Checking API contract changes..." -ForegroundColor Yellow
    
    $apiChanges = git diff --name-only $TargetBranch...$SourceBranch -- "*.openapi.*" "*.swagger.*" "**/api/**" 2>$null
    
    if ($apiChanges) {
        Add-Warning "API files modified - ensure backwards compatibility" "API"
        foreach ($file in $apiChanges) {
            Write-Host "   └── $file" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ✓ No API contract changes detected" -ForegroundColor Green
    }
    
    Write-Host ""
    
    # ════════════════════════════════════════════════════════════════════════
    # CHECK 5: Session state cleanup
    # ════════════════════════════════════════════════════════════════════════
    
    Write-Host "5️⃣  Checking session state cleanup..." -ForegroundColor Yellow
    
    $sessionFiles = git diff --name-only $TargetBranch...$SourceBranch -- ".context/sessions/.current_session" 2>$null
    
    if ($sessionFiles) {
        Add-Issue "Personal session file included in commit - should be gitignored" ".current_session"
    } else {
        Write-Host "   ✓ Session state clean" -ForegroundColor Green
    }
    
    Write-Host ""
    
    # ════════════════════════════════════════════════════════════════════════
    # CHECK 6: Required context updates
    # ════════════════════════════════════════════════════════════════════════
    
    Write-Host "6️⃣  Checking for required context updates..." -ForegroundColor Yellow
    
    $codeChanges = git diff --stat $TargetBranch...$SourceBranch -- "src/" "packages/" "app/" 2>$null
    $contextUpdates = git diff --stat $TargetBranch...$SourceBranch -- ".context/CURRENT_STATE.md" 2>$null
    
    if ($codeChanges -and -not $contextUpdates) {
        Add-Warning "Code changes detected but CURRENT_STATE.md not updated" "CURRENT_STATE.md"
    }
    
    # Check if new features added without specs
    $newFiles = git diff --name-only --diff-filter=A $TargetBranch...$SourceBranch -- "src/" 2>$null
    if ($newFiles) {
        $specUpdates = git diff --name-only $TargetBranch...$SourceBranch -- ".specs/" ".context/features/" 2>$null
        if (-not $specUpdates) {
            Add-Warning "New source files added but no spec updates" ".specs/"
        }
    }
    
    Write-Host "   ✓ Context update check complete" -ForegroundColor Green
    
    Write-Host ""
    
    # ════════════════════════════════════════════════════════════════════════
    # RESULTS
    # ════════════════════════════════════════════════════════════════════════
    
    Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    if ($issues.Count -eq 0 -and $warnings.Count -eq 0) {
        Write-Host "✅ ALL CHECKS PASSED - Safe to merge!" -ForegroundColor Green
        Write-Host ""
        exit 0
    }
    
    if ($issues.Count -gt 0) {
        Write-Host "❌ ERRORS ($($issues.Count)):" -ForegroundColor Red
        foreach ($issue in $issues) {
            Write-Host "   • $($issue.File): $($issue.Message)" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "⚠️  WARNINGS ($($warnings.Count)):" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "   • $($warning.File): $($warning.Message)" -ForegroundColor Yellow
        }
        Write-Host ""
    }
    
    if ($issues.Count -gt 0) {
        Write-Host "🛑 MERGE BLOCKED - Fix errors before proceeding" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "⚠️  MERGE WITH CAUTION - Review warnings above" -ForegroundColor Yellow
        exit 0
    }
}
finally {
    Pop-Location
}

Write-Host ""
