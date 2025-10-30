@echo off
echo ================================================
echo    Greenscreen Kiosk - Quick Start
echo ================================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [1/4] Installing dependencies...
    call npm install
    echo.
) else (
    echo [1/4] Dependencies already installed
    echo.
)

echo [2/4] Starting server...
start "Greenscreen Server" cmd /k "npm start"
timeout /t 5 /nobreak >nul

echo [3/4] Generating test data...
timeout /t 3 /nobreak >nul
node server\generate-test-data.js 25

echo.
echo [4/4] Opening operator dashboard...
timeout /t 2 /nobreak >nul
start http://localhost:5000/operator

echo.
echo ================================================
echo    Setup Complete!
echo ================================================
echo.
echo Operator Dashboard: http://localhost:5000/operator
echo Kiosk Interface:    http://localhost:5000
echo.
echo Press any key to close this window...
pause >nul
