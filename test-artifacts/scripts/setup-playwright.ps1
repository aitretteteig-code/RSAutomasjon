$ErrorActionPreference = "Stop"

$Workspace = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$ToolsDir = Join-Path $Workspace ".tools"
$NodeRoot = Join-Path $ToolsDir "node"
$NodeExe = Join-Path $NodeRoot "node.exe"
$Npm = Join-Path $NodeRoot "npm.cmd"

New-Item -ItemType Directory -Force -Path $ToolsDir | Out-Null

if (-not (Test-Path $NodeExe)) {
  $listing = (Invoke-WebRequest -UseBasicParsing -Uri "https://nodejs.org/dist/latest-v24.x/").Content
  $zipName = [regex]::Match($listing, 'node-v24[^"<>]*-win-x64\.zip').Value
  if (-not $zipName) {
    throw "Could not find Node win-x64 zip in latest-v24.x listing."
  }

  $zipUrl = "https://nodejs.org/dist/latest-v24.x/$zipName"
  $zipPath = Join-Path $ToolsDir $zipName
  $extractDir = Join-Path $ToolsDir "node-extract"

  Invoke-WebRequest -UseBasicParsing -Uri $zipUrl -OutFile $zipPath
  Remove-Item -LiteralPath $extractDir -Recurse -Force -ErrorAction SilentlyContinue
  Expand-Archive -LiteralPath $zipPath -DestinationPath $extractDir -Force

  $expanded = Get-ChildItem -LiteralPath $extractDir -Directory | Select-Object -First 1
  Remove-Item -LiteralPath $NodeRoot -Recurse -Force -ErrorAction SilentlyContinue
  Move-Item -LiteralPath $expanded.FullName -Destination $NodeRoot
  Remove-Item -LiteralPath $extractDir -Recurse -Force
}

$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
Push-Location $Workspace
try {
  & $NodeExe --version
  & $Npm --version
  & $Npm install
}
finally {
  Pop-Location
}
