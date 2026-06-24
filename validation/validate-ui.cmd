@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0validate-ui.ps1" %*
exit /b %ERRORLEVEL%
