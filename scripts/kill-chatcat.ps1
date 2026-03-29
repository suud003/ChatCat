$ErrorActionPreference = "Stop"

$workspace = Split-Path -Parent $PSScriptRoot
$escapedWorkspace = [Regex]::Escape($workspace)

$targets = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -ieq "electron.exe" -and
  $_.CommandLine -and
  $_.CommandLine -match $escapedWorkspace
}

foreach ($proc in $targets) {
  try {
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
    Write-Host "[ChatCat] Killed process PID=$($proc.ProcessId)" -ForegroundColor Yellow
  } catch {
    Write-Host "[ChatCat] Skip process PID=$($proc.ProcessId): $($_.Exception.Message)" -ForegroundColor DarkYellow
  }
}

if (-not $targets) {
  Write-Host "[ChatCat] No existing ChatCat Electron process." -ForegroundColor DarkGray
}
