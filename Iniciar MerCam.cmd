@echo off
rem Doble clic: levanta el servidor de búsqueda (puerto 3010) y la app en
rem http://localhost:5176, y la abre en el navegador. Si ya está corriendo,
rem solo abre el navegador. Cerrar estas ventanas lo apaga.
title MerCam - servidor local
cd /d "%~dp0"

netstat -ano | findstr /r /c:":5176 .*LISTENING" >nul
if not errorlevel 1 (
  start "" http://localhost:5176
  exit /b
)

if not exist node_modules call npm install
netstat -ano | findstr /r /c:":3010 .*LISTENING" >nul
if errorlevel 1 start "MerCam - servidor de busqueda" cmd /k npm run servidor
call npm run dev -- --open
pause
