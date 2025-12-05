@echo off
REM Quick access to Context-as-Code scripts
REM Add this folder to PATH or create shortcuts

setlocal

set SCRIPTS_DIR=%~dp0

if "%1"=="" goto :help
if "%1"=="start" powershell -ExecutionPolicy Bypass -File "%SCRIPTS_DIR%ctx-start.ps1" %2 %3 %4
if "%1"=="check" powershell -ExecutionPolicy Bypass -File "%SCRIPTS_DIR%ctx-check.ps1" %2 %3 %4
if "%1"=="end" powershell -ExecutionPolicy Bypass -File "%SCRIPTS_DIR%ctx-end.ps1" %2 %3 %4
if "%1"=="status" powershell -ExecutionPolicy Bypass -File "%SCRIPTS_DIR%ctx-status.ps1" %2 %3 %4
if "%1"=="adr" powershell -ExecutionPolicy Bypass -File "%SCRIPTS_DIR%ctx-adr.ps1" %2 %3 %4
if "%1"=="blocker" powershell -ExecutionPolicy Bypass -File "%SCRIPTS_DIR%ctx-blocker.ps1" %2 %3 %4
if "%1"=="feature" powershell -ExecutionPolicy Bypass -File "%SCRIPTS_DIR%ctx-feature.ps1" %2 %3 %4
if "%1"=="action" powershell -ExecutionPolicy Bypass -File "%SCRIPTS_DIR%ctx-action.ps1" %2 %3 %4
if "%1"=="handoff" powershell -ExecutionPolicy Bypass -File "%SCRIPTS_DIR%ctx-handoff.ps1" %2 %3 %4
if "%1"=="update" powershell -ExecutionPolicy Bypass -File "%SCRIPTS_DIR%ctx-update.ps1" %2 %3 %4
if "%1"=="init" powershell -ExecutionPolicy Bypass -File "%SCRIPTS_DIR%ctx-init.ps1" %2 %3 %4
goto :eof

:help
echo.
echo  Context-as-Code CLI
echo  ====================
echo.
echo  Usage: ctx [command] [options]
echo.
echo  Commands:
echo    init      Initialize context structure for new project
echo    start     Start a new development session
echo    check     Verify context integrity
echo    end       End current session with documentation
echo    status    Quick project status overview
echo    adr       Record architecture decision
echo    blocker   Log or resolve a blocker
echo    feature   Update feature status
echo    action    Manage action queue
echo    handoff   Generate handoff document
echo    update    Record requirement/architecture change
echo.
echo  Examples:
echo    ctx start
echo    ctx check
echo    ctx adr -Interactive
echo    ctx feature -List
echo    ctx end -Summary "Completed auth module"
echo.
