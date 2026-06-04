param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$ErrorActionPreference = "Stop"

$Workspace = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$NodeRoot = Join-Path $Workspace ".tools\node"
$SystemNodeRoot = "C:\Program Files\nodejs"
$SystemNodeExe = Join-Path $SystemNodeRoot "node.exe"
$SystemNpm = Join-Path $SystemNodeRoot "npm.cmd"
$PortableNodeExe = Join-Path $NodeRoot "node.exe"
$PortableNpm = Join-Path $NodeRoot "npm.cmd"
$NodeExe = if (Test-Path $SystemNodeExe) { $SystemNodeExe } else { $PortableNodeExe }
$Npm = if (Test-Path $SystemNpm) { $SystemNpm } else { $PortableNpm }
$PlaywrightCli = Join-Path $Workspace "node_modules\@playwright\test\cli.js"

if (-not (Test-Path $Npm)) {
  throw "Portable Node is missing. Run test-artifacts\scripts\setup-playwright.ps1 first."
}

if (-not (Test-Path $PlaywrightCli)) {
  $env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
  Push-Location $Workspace
  try {
    & $Npm install
  }
  finally {
    Pop-Location
  }
}

Push-Location $Workspace
try {
  if (-not $Args -or $Args.Count -eq 0) {
    & $NodeExe $PlaywrightCli test --headed
    exit $LASTEXITCODE
  }
  else {
    & $NodeExe $PlaywrightCli @Args
    exit $LASTEXITCODE
  }
}
finally {
  Pop-Location
}
