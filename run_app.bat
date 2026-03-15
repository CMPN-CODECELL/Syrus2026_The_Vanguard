@echo off
setlocal enabledelayedexpansion

:: ============================================
:: MedVision AI - One-Click Setup and Run
:: ============================================

title MedVision AI - Setup

echo.
echo  =============================================
echo   MedVision AI - Clinical Time Machine
echo   One-Click Setup and Run
echo  =============================================
echo.

:: Store the root directory
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: ============================================
:: STEP 1: Check Required Software
:: ============================================
echo [STEP 1/8] Checking required software...
echo.

:: Check Node.js
echo   Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   [FAIL] Node.js is not installed.
    echo   Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo   [OK] Node.js !NODE_VER! found

:: Check npm
echo   Checking npm...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo   [FAIL] npm is not installed.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('npm --version') do set NPM_VER=%%v
echo   [OK] npm v!NPM_VER! found

:: Check Python
echo   Checking Python...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo   [FAIL] Python is not installed.
    echo   Please install Python from: https://www.python.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version') do set PYTHON_VER=%%v
echo   [OK] !PYTHON_VER! found

:: Check pip
echo   Checking pip...
python -m pip --version >nul 2>nul
if %errorlevel% neq 0 (
    echo   [FAIL] pip is not installed.
    pause
    exit /b 1
)
echo   [OK] pip found

echo.
echo   All required software is installed.
echo.

:: ============================================
:: STEP 2: Setup Backend
:: ============================================
echo [STEP 2/8] Setting up Backend...
echo.

cd /d "%ROOT_DIR%backend"

:: Create venv if it doesn't exist
if not exist "venv" (
    echo   Creating Python virtual environment...
    python -m venv venv
    if !errorlevel! neq 0 (
        echo   [FAIL] Could not create virtual environment.
        pause
        exit /b 1
    )
    echo   [OK] Virtual environment created
) else (
    echo   [OK] Virtual environment exists
)

:: Activate venv
echo   Activating virtual environment...
call venv\Scripts\activate.bat

:: Install dependencies
echo   Installing/Updating Python dependencies...
pip install --upgrade pip -q 2>nul
pip install -r requirements.txt --quiet --disable-pip-version-check
if !errorlevel! neq 0 (
    echo   [WARNING] Some packages may have failed. Retrying...
    pip install -r requirements.txt
)
echo   [OK] Python dependencies installed

cd /d "%ROOT_DIR%"
echo.

:: ============================================
:: STEP 3: Setup Frontend
:: ============================================
echo [STEP 3/8] Setting up Frontend...
echo.

cd /d "%ROOT_DIR%frontend"

if not exist "node_modules" (
    echo   Installing Node.js dependencies - please wait...
    call npm install
    if !errorlevel! neq 0 (
        echo   [FAIL] npm install failed.
        pause
        exit /b 1
    )
    echo   [OK] Node.js dependencies installed
) else (
    echo   [OK] Node.js dependencies already installed
    call npm install --quiet 2>nul
)

:: Clean .next cache
if exist ".next" (
    echo   Cleaning .next cache...
    rmdir /s /q ".next" >nul 2>&1
    echo   [OK] Cache cleared
)

cd /d "%ROOT_DIR%"
echo.

:: ============================================
:: STEP 4: Interactive API Key Setup
:: ============================================
echo [STEP 4/8] Environment Configuration...
echo.

set "NEED_SETUP=0"

:: Check if .env files need setup
if not exist "backend\.env" set "NEED_SETUP=1"
if not exist "frontend\.env.local" set "NEED_SETUP=1"

:: Check if .env files have placeholder values
if exist "backend\.env" (
    findstr /C:"your_gemini_api_key_here" "backend\.env" >nul 2>nul
    if !errorlevel! equ 0 set "NEED_SETUP=1"
)

if "!NEED_SETUP!"=="1" (
    echo  =============================================
    echo   API KEY SETUP ^(Optional^)
    echo  =============================================
    echo.
    echo   You can configure API keys now or skip to use demo mode.
    echo   Press ENTER to skip any field ^(leave it empty^).
    echo.
    echo  ---------------------------------------------
    echo   GEMINI API ^(Required for AI features^)
    echo  ---------------------------------------------
    echo   Get your key at: https://aistudio.google.com/apikey
    echo.
    set /p "GEMINI_KEY=   Enter Gemini API Key (or press ENTER to skip): "
    echo.
    
    echo  ---------------------------------------------
    echo   FIREBASE ^(Required for Google Login^)
    echo  ---------------------------------------------
    echo   Get from Firebase Console -^> Project Settings
    echo.
    set /p "FIREBASE_PROJECT_ID=   Firebase Project ID (or ENTER to skip): "
    
    if not "!FIREBASE_PROJECT_ID!"=="" (
        echo.
        echo   -- Frontend Firebase Config --
        set /p "FIREBASE_API_KEY=   Firebase API Key: "
        set /p "FIREBASE_MESSAGING_ID=   Messaging Sender ID: "
        set /p "FIREBASE_APP_ID=   App ID: "
        echo.
        echo   -- Backend Firebase Config --
        echo   ^(From Service Account JSON file^)
        set /p "FIREBASE_CLIENT_EMAIL=   Client Email: "
        echo.
        echo   ---------------------------------------------
        echo   FIREBASE PRIVATE KEY
        echo   ---------------------------------------------
        echo   From your Firebase service account JSON file, copy the
        echo   private_key value ^(the long string starting with -----BEGIN^)
        echo.
        echo   IMPORTANT: Paste the ENTIRE key including:
        echo   -----BEGIN PRIVATE KEY-----
        echo   ...your key content...
        echo   -----END PRIVATE KEY-----
        echo.
        set /p "FIREBASE_PRIVATE_KEY_INPUT=   Paste Private Key (single line, or ENTER to skip): "
    )
    echo.
    
    :: Create backend .env
    echo   Creating backend\.env...
    (
        echo # Gemini 3 API
        if "!GEMINI_KEY!"=="" (
            echo GEMINI_API_KEY=
            echo # ^^ Add your Gemini API key above for AI features
        ) else (
            echo GEMINI_API_KEY=!GEMINI_KEY!
        )
        echo.
        echo # Firebase Configuration
        if "!FIREBASE_PROJECT_ID!"=="" (
            echo FIREBASE_PROJECT_ID=
            echo FIREBASE_PRIVATE_KEY=
            echo FIREBASE_CLIENT_EMAIL=
        ) else (
            echo FIREBASE_PROJECT_ID=!FIREBASE_PROJECT_ID!
            if "!FIREBASE_PRIVATE_KEY_INPUT!"=="" (
                echo FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----\n"
                echo # ^^ Replace the above with your actual private key from service account JSON
            ) else (
                echo FIREBASE_PRIVATE_KEY="!FIREBASE_PRIVATE_KEY_INPUT!"
            )
            if "!FIREBASE_CLIENT_EMAIL!"=="" (
                echo FIREBASE_CLIENT_EMAIL=
            ) else (
                echo FIREBASE_CLIENT_EMAIL=!FIREBASE_CLIENT_EMAIL!
            )
        )
        echo.
        echo # Debug mode - shows Gemini API calls in console
        echo DEBUG_GEMINI=true
        echo.
        echo # Environment
        echo ENVIRONMENT=development
    ) > "backend\.env"
    echo   [OK] Created backend\.env
    
    :: Create frontend .env.local
    echo   Creating frontend\.env.local...
    (
        echo # API Configuration
        echo NEXT_PUBLIC_API_URL=http://localhost:8001
        echo.
        echo # Firebase Configuration
        if "!FIREBASE_PROJECT_ID!"=="" (
            echo NEXT_PUBLIC_FIREBASE_API_KEY=
            echo NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
            echo NEXT_PUBLIC_FIREBASE_PROJECT_ID=
            echo NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
            echo NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
            echo NEXT_PUBLIC_FIREBASE_APP_ID=
        ) else (
            if "!FIREBASE_API_KEY!"=="" (
                echo NEXT_PUBLIC_FIREBASE_API_KEY=
            ) else (
                echo NEXT_PUBLIC_FIREBASE_API_KEY=!FIREBASE_API_KEY!
            )
            echo NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=!FIREBASE_PROJECT_ID!.firebaseapp.com
            echo NEXT_PUBLIC_FIREBASE_PROJECT_ID=!FIREBASE_PROJECT_ID!
            echo NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=!FIREBASE_PROJECT_ID!.appspot.com
            if "!FIREBASE_MESSAGING_ID!"=="" (
                echo NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
            ) else (
                echo NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=!FIREBASE_MESSAGING_ID!
            )
            if "!FIREBASE_APP_ID!"=="" (
                echo NEXT_PUBLIC_FIREBASE_APP_ID=
            ) else (
                echo NEXT_PUBLIC_FIREBASE_APP_ID=!FIREBASE_APP_ID!
            )
        )
    ) > "frontend\.env.local"
    echo   [OK] Created frontend\.env.local
    echo.
) else (
    echo   [OK] Environment files already configured
    echo.
)

:: ============================================
:: STEP 5: Clean Up Existing Processes
:: ============================================
echo [STEP 5/8] Cleaning up ports...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo   [OK] Port 8001 cleared

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo   [OK] Port 3000 cleared

timeout /t 2 /nobreak >nul
echo.

:: ============================================
:: STEP 6: Verify Gemini API Connection
:: ============================================
echo [STEP 6/8] Testing Gemini API connection...
echo.

cd /d "%ROOT_DIR%backend"
call venv\Scripts\activate.bat

:: Create a quick test script that explicitly loads .env from backend folder
(
echo import os
echo import sys
echo from pathlib import Path
echo.
echo # Explicitly load .env from backend folder
echo backend_dir = Path^(r'%ROOT_DIR%backend'^)
echo env_path = backend_dir / '.env'
echo.
echo if env_path.exists^(^):
echo     with open^(env_path, 'r'^) as f:
echo         for line in f:
echo             line = line.strip^(^)
echo             if line and not line.startswith^('#'^) and '=' in line:
echo                 key, _, value = line.partition^('='^)
echo                 os.environ[key.strip^(^)] = value.strip^(^)
echo.
echo api_key = os.getenv^('GEMINI_API_KEY', ''
echo ^)
echo if not api_key or api_key == 'your_gemini_api_key_here':
echo     print^('   [SKIP] No Gemini API key configured'^)
echo     print^('   AI features will be limited. Add key to backend\\.env later.'^)
echo     sys.exit^(0^)
echo.
echo print^(f'   API Key: {api_key[:8]}...{api_key[-4:]}'^)
echo.
echo try:
echo     import google.generativeai as genai
echo     genai.configure^(api_key=api_key^)
echo     model = genai.GenerativeModel^('gemini-2.0-flash'^)
echo     response = model.generate_content^('Say "API OK" in 2 words'^)
echo     print^(f'   [OK] Gemini API working: {response.text.strip^(^)[:50]}'^)
echo except Exception as e:
echo     error_str = str^(e^)
echo     if 'quota' in error_str.lower^(^) or 'rate' in error_str.lower^(^):
echo         print^('   [RATE LIMIT] API quota exceeded. Wait a few minutes.'^)
echo     elif 'invalid' in error_str.lower^(^) or 'api_key' in error_str.lower^(^):
echo         print^('   [INVALID KEY] Check your Gemini API key'^)
echo     else:
echo         print^(f'   [ERROR] {error_str[:100]}'^)
) > "%TEMP%\test_gemini.py"

python "%TEMP%\test_gemini.py"
del "%TEMP%\test_gemini.py" >nul 2>&1

cd /d "%ROOT_DIR%"
echo.

:: ============================================
:: STEP 7: Start Backend Server
:: ============================================
echo [STEP 7/8] Starting Backend Server...
echo.

cd /d "%ROOT_DIR%backend"
call venv\Scripts\activate.bat

:: Start backend with debug logging - use python -m uvicorn to ensure venv is used
start "MedVision-Backend" cmd /k "cd /d "%ROOT_DIR%backend" && call venv\Scripts\activate.bat && echo. && echo ============================================ && echo   MedVision AI - Backend Server && echo   Port: 8001 && echo ============================================ && echo. && set DEBUG_GEMINI=true && python -m uvicorn app.main:app --reload --port 8001"

echo   [OK] Backend starting on http://localhost:8001
echo.
timeout /t 5 /nobreak >nul

cd /d "%ROOT_DIR%"

:: ============================================
:: STEP 8: Start Frontend Server
:: ============================================
echo [STEP 8/8] Starting Frontend Server...
echo.

cd /d "%ROOT_DIR%frontend"

start "MedVision-Frontend" cmd /k "cd /d "%ROOT_DIR%frontend" && echo. && echo ============================================ && echo   MedVision AI - Frontend Server && echo   Port: 3000 && echo ============================================ && echo. && npm run dev"

echo   [OK] Frontend starting on http://localhost:3000
echo.

:: Wait for frontend to be ready (polling with curl/powershell)
echo   Waiting for frontend server to be ready...
set "READY=0"
for /L %%i in (1,1,30) do (
    if "!READY!"=="0" (
        timeout /t 2 /nobreak >nul
        powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop; exit 0 } catch { exit 1 }" >nul 2>&1
        if !errorlevel! equ 0 (
            set "READY=1"
            echo   [OK] Frontend server is ready!
        )
    )
)

if "!READY!"=="0" (
    echo   [WARNING] Frontend may not be fully ready, opening anyway...
    timeout /t 5 /nobreak >nul
)

:: ============================================
:: Open Browser
:: ============================================
echo.
echo  =============================================
echo   Setup Complete!
echo  =============================================
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8001
echo   API Docs: http://localhost:8001/docs
echo.

:: Small delay after server is ready to ensure first render is complete
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo  =============================================
echo   MedVision AI is running!
echo  =============================================
echo.
echo   To stop: Close the terminal windows
echo   To reconfigure: Delete backend\.env and run again
echo.
pause >nul

endlocal
