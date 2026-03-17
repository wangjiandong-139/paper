@echo off
REM Start all dev servers: server, admin, web

cd /d "%~dp0"

echo Starting @ai-paper/server (NestJS) ...
start "paper-server" cmd /k "pnpm --filter @ai-paper/server start:dev"

echo Starting @ai-paper/admin (admin portal) ...
start "paper-admin" cmd /k "pnpm --filter @ai-paper/admin dev"

echo Starting @ai-paper/web (web app) ...
start "paper-web" cmd /k "pnpm --filter @ai-paper/web dev"

echo.
echo Dev servers started in three separate windows.
echo You can close them manually or run stop-dev.bat to kill processes.

