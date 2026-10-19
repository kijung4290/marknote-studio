@echo off
chcp 65001 >nul
cd /d "%~dp0"
node scripts/build.js
node scripts/launch.js
