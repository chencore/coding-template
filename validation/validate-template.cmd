@echo off
call "%~dp0validate-hardness.cmd" %*
if errorlevel 1 exit /b %ERRORLEVEL%
call "%~dp0validate-ui.cmd" %*
exit /b %ERRORLEVEL%
