@echo off
cd /d "%~dp0"
echo Menjalankan MUG1III AUDIO di http://localhost:3000 ...
start "" http://localhost:3000
node node_modules\next\dist\bin\next dev -p 3000
pause
