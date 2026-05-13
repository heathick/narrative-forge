$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
Set-Location $Root

$ghCandidates = @(
  "C:\Program Files\GitHub CLI\gh.exe",
  (Get-Command gh -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)
) | Where-Object { $_ -and (Test-Path $_) }
$gh = if ($ghCandidates) { $ghCandidates[0] } else { "gh" }

$gitCandidates = @(
  "C:\Program Files\Git\bin\git.exe",
  (Get-Command git -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)
) | Where-Object { $_ -and (Test-Path $_) }
$git = if ($gitCandidates) { $gitCandidates[0] } else { "git" }

& $gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "GitHub CLI не авторизован. Выполни в PowerShell (один раз):" -ForegroundColor Yellow
  Write-Host ('  & "{0}" auth login -h github.com -p https -w' -f $gh)
  Write-Host "Откроется браузер или покажется код для https://github.com/login/device" -ForegroundColor Yellow
  exit 1
}

$hasOrigin = $false
& $git remote get-url origin 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { $hasOrigin = $true }

if (-not $hasOrigin) {
  & $gh repo create narrative-forge --public --source=. --remote=origin --push
} else {
  & $git push -u origin main
}
