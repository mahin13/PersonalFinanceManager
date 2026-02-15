@echo off
echo ============================================================
echo PERSONAL FINANCE MANAGER - APK BUILD SCRIPT
echo ============================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if EAS CLI is installed
where eas >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Installing EAS CLI...
    npm install -g eas-cli
)

echo.
echo Step 1: Checking EAS login status...
eas whoami 2>nul
if %ERRORLEVEL% neq 0 (
    echo.
    echo You need to login to your Expo account.
    echo If you don't have one, create it at: https://expo.dev/signup
    echo.
    eas login
)

echo.
echo Step 2: Building APK...
echo This will build your app in the cloud. It may take 10-20 minutes.
echo.

cd /d "%~dp0"
eas build -p android --profile preview

echo.
echo ============================================================
echo BUILD COMPLETE!
echo ============================================================
echo.
echo The APK download link will be shown above.
echo Copy the link and download your APK file.
echo.
pause
