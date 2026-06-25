@echo off
setlocal
set "ROOT=%~dp0"
set "STAGING=%ROOT%dist\staging"
set "DIST=%ROOT%dist\win-unpacked\resources"
set "NODE=D:\nodejs\node.exe"
set "PNM=%ROOT%node_modules\.pnpm"
set "ASAR=%ROOT%node_modules\.pnpm\node_modules\@electron\asar\bin\asar.js"
set "PNM_FLAT=%PNM%\node_modules"

echo ============================================
echo  Claw Master - Build Portable EXE
echo ============================================
echo.

:: Step 1: TypeScript build
echo [1/4] Building TypeScript...
cd /d "%ROOT%"
call npm run build
if errorlevel 1 (
    echo BUILD FAILED
    exit /b 1
)
echo OK
echo.

:: Step 2: Stage files
echo [2/4] Staging files...
if exist "%STAGING%" rmdir /s /q "%STAGING%"
mkdir "%STAGING%"
mkdir "%STAGING%\node_modules"

:: Copy compiled output (preserve out/ prefix to match package.json main field)
xcopy /s /e /q /y "%ROOT%out" "%STAGING%\out\" >nul
copy /y "%ROOT%package.json" "%STAGING%\" >nul

:: Copy runtime dependencies from pnpm store
echo    Copying ssh2...
robocopy "%PNM%\ssh2@1.17.0\node_modules\ssh2" "%STAGING%\node_modules\ssh2" /E /COPY:DAT /SL /R:0 /W:0 /NFL /NDL /NJH /NJS >nul
echo    Copying openai...
robocopy "%PNM%\openai@4.104.0_encoding@0.1.13_zod@3.25.76\node_modules\openai" "%STAGING%\node_modules\openai" /E /COPY:DAT /SL /R:0 /W:0 /NFL /NDL /NJH /NJS >nul
echo    Copying better-sqlite3...
robocopy "%PNM%\better-sqlite3@11.10.0\node_modules\better-sqlite3" "%STAGING%\node_modules\better-sqlite3" /E /COPY:DAT /SL /R:0 /W:0 /NFL /NDL /NJH /NJS >nul
:: Copy all hoisted sub-dependencies (whatwg-url, tr46, webidl-conversions, bindings, etc.)
echo    Copying sub-dependencies...
robocopy "%PNM_FLAT%" "%STAGING%\node_modules" /E /COPY:DAT /SL /R:0 /W:0 /NFL /NDL /NJH /NJS >nul
echo OK
echo.

:: Step 3: Pack asar
echo [3/4] Packing asar...
if exist "%DIST%\app.asar" del /f "%DIST%\app.asar"
if exist "%DIST%\app.asar.unpacked" rmdir /s /q "%DIST%\app.asar.unpacked"

cd /d "%ROOT%"
"%NODE%" -e "var a=require('./node_modules/.pnpm/node_modules/@electron/asar/lib/asar.js');a.createPackageWithOptions('dist/staging','dist/win-unpacked/resources/app.asar',{unpack:'**/*.node'}).then(function(){var s=require('fs').statSync('dist/win-unpacked/resources/app.asar');console.log('Created app.asar: '+s.size+' bytes')}).catch(function(e){console.error(e);process.exit(1)})"
if errorlevel 1 (
    echo ASAR PACK FAILED
    exit /b 1
)
echo OK
echo.

:: Step 4: Cleanup
echo [4/4] Cleaning up staging...
rmdir /s /q "%STAGING%"
echo OK
echo.

echo ============================================
echo  Build complete!
echo  EXE: %ROOT%dist\win-unpacked\Claw Master.exe
echo ============================================
echo.
set /p "LAUNCH=Start the exe now? (y/n): "
if /i "%LAUNCH%"=="y" start "" "%ROOT%dist\win-unpacked\Claw Master.exe"
if /i "%LAUNCH%"=="yes" start "" "%ROOT%dist\win-unpacked\Claw Master.exe"
