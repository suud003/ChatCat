# ChatCat 一键安装脚本
# 经验总结：
# 1. Electron 需从 GitHub 下载 ~100MB 二进制，国内直连易超时/卡住
# 2. 使用 ELECTRON_MIRROR 指向 npmmirror 可大幅加速
# 3. npm install 有时会跳过 electron 的 postinstall，需手动执行 install.js
# 4. 若 node_modules 被占用 (EPERM)，需先关闭占用进程再安装

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Set-Location $ProjectRoot

# 已完整安装则跳过
$electronExe = Join-Path $ProjectRoot "node_modules\electron\dist\electron.exe"
if ((Test-Path "node_modules") -and (Test-Path $electronExe)) {
    Write-Host "[ChatCat] 依赖已就绪，跳过安装。" -ForegroundColor Green
    exit 0
}

Write-Host "[ChatCat] 开始安装依赖..." -ForegroundColor Cyan

# 使用国内镜像加速 Electron 下载
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"

# 执行 npm install
Write-Host "[ChatCat] 执行 npm install..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ChatCat] npm install 失败，退出码: $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

# 若 Electron 二进制缺失，手动执行安装脚本
if (-not (Test-Path $electronExe)) {
    Write-Host "[ChatCat] Electron 二进制未就绪，执行 install.js..." -ForegroundColor Cyan
    $installJs = Join-Path $ProjectRoot "node_modules\electron\install.js"
    if (Test-Path $installJs) {
        node $installJs
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ChatCat] Electron install.js 失败" -ForegroundColor Red
            exit $LASTEXITCODE
        }
    }
}

if (Test-Path $electronExe) {
    Write-Host "[ChatCat] 安装完成。" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[ChatCat] 安装异常：Electron 二进制仍缺失，请检查网络或手动执行: node node_modules/electron/install.js" -ForegroundColor Red
    exit 1
}
