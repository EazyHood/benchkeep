$ErrorActionPreference = 'Stop'
$taskProjectRoot = Split-Path -Parent $PSScriptRoot
$taskNinjaDir = Join-Path $taskProjectRoot 'android/tools/ninja-1.13.1'
$taskNinjaZip = Join-Path $taskNinjaDir 'ninja-win.zip'
$taskExpectedHash = '26a40fa8595694dec2fad4911e62d29e10525d2133c9a4230b66397774ae25bf'

if (-not (Test-Path -LiteralPath (Join-Path $taskProjectRoot 'android/app/build.gradle'))) {
    throw 'Run Expo Android prebuild first.'
}
New-Item -ItemType Directory -Path $taskNinjaDir -Force | Out-Null
if (-not (Test-Path -LiteralPath $taskNinjaZip)) {
    Invoke-WebRequest -Uri 'https://github.com/ninja-build/ninja/releases/download/v1.13.1/ninja-win.zip' -OutFile $taskNinjaZip
}
if ((Get-FileHash -LiteralPath $taskNinjaZip -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskExpectedHash) {
    throw 'Ninja archive hash differs from the official GitHub release asset digest.'
}
Expand-Archive -LiteralPath $taskNinjaZip -DestinationPath $taskNinjaDir -Force
$env:BENCHKEEP_NINJA = Join-Path $taskNinjaDir 'ninja.exe'
& $env:BENCHKEEP_NINJA --version
if ($LASTEXITCODE -ne 0) { throw 'Local Ninja executable did not start.' }
Write-Output 'Ninja is ready in the generated Android project; the installed Android SDK was not modified.'
