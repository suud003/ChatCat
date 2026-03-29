# ChatCat one-click install script
# Notes:
# 1. Electron downloads large binaries from GitHub; direct access may timeout.
# 2. ELECTRON_MIRROR -> npmmirror can speed up downloads in CN network.
# 3. npm install may skip electron postinstall; run install.js manually if needed.
# 4. If node_modules is locked (EPERM), close locking processes then retry.

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Set-Location $ProjectRoot

# Skip when dependencies are already installed.
$electronExe = Join-Path $ProjectRoot "node_modules\electron\dist\electron.exe"
if ((Test-Path "node_modules") -and (Test-Path $electronExe)) {
    Write-Host "[ChatCat] Dependencies ready. Skip install." -ForegroundColor Green
    exit 0
}

Write-Host "[ChatCat] Starting dependency installation..." -ForegroundColor Cyan

# Use mirror to speed up Electron download.
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"

# Run npm install.
Write-Host "[ChatCat] Running npm install..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ChatCat] npm install failed. Exit code: $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

# If Electron binary is missing, run install.js manually.
if (-not (Test-Path $electronExe)) {
    Write-Host "[ChatCat] Electron binary missing. Running install.js..." -ForegroundColor Cyan
    $installJs = Join-Path $ProjectRoot "node_modules\electron\install.js"
    if (Test-Path $installJs) {
        node $installJs
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ChatCat] Electron install.js failed." -ForegroundColor Red
            exit $LASTEXITCODE
        }
    }
}

if (Test-Path $electronExe) {
    Write-Host "[ChatCat] Installation completed." -ForegroundColor Green
    exit 0
} else {
    Write-Host "[ChatCat] Install incomplete: Electron binary still missing. Check network or run: node node_modules/electron/install.js" -ForegroundColor Red
    exit 1
}
