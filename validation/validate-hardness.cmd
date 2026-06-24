@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0validate-hardness.ps1" %*
exit /b %ERRORLEVEL%
