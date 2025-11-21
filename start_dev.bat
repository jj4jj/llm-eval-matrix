@echo off
echo 🚀 Starting EvalMatrix Development Environment...
echo.

:: Kill any existing processes on ports 5173 and 8001
echo 🔍 Checking for existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001') do taskkill /F /PID %%a 2>nul

:: Start Backend
echo 📦 Starting Backend Server (Port 8001)...
cd /d "%~dp0backend"
start "Backend Server" cmd /k "python main.py"

:: Wait a moment for backend to start
echo ⏳ Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

:: Start Frontend
echo 🎨 Starting Frontend Server (Port 5173)...
cd /d "%~dp0"
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ✅ Development servers started successfully!
echo.
echo 📋 Access Points:
echo    Frontend: http://localhost:5173
echo    Backend API: http://localhost:8001/api
echo    Backend Health: http://localhost:8001/health
echo.
echo 🔧 To stop all servers, close both terminal windows
echo.
pause