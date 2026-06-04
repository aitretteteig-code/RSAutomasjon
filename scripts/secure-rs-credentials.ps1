param(
  [ValidateSet('Save', 'SaveMeny', 'Get', 'GetMeny', 'Delete', 'Status')]
  [string]$Action = 'Get',
  [string]$UserName = '',
  [switch]$PasswordFromStdin,
  [switch]$FromStdinJson
)

$ErrorActionPreference = 'Stop'

$secretDir = Join-Path $env:APPDATA 'RetailSuiteLocalTestRunner'
$secretPath = Join-Path $secretDir 'rs-credentials.dpapi.json'

function ConvertFrom-LocalSecureString {
  param([Security.SecureString]$SecureString)

  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
  try {
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    if ($ptr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
  }
}

function Read-SecretFile {
  if (-not (Test-Path -LiteralPath $secretPath)) {
    throw "RetailSuite credentials are not saved. Run scripts\secure-rs-credentials.ps1 -Action Save first."
  }

  Get-Content -LiteralPath $secretPath -Raw | ConvertFrom-Json
}

function Read-SecretFileOrEmpty {
  if (Test-Path -LiteralPath $secretPath) {
    return Get-Content -LiteralPath $secretPath -Raw | ConvertFrom-Json
  }

  [pscustomobject]@{}
}

function Set-JsonProperty {
  param(
    [Parameter(Mandatory=$true)]$Target,
    [Parameter(Mandatory=$true)][string]$Name,
    $Value
  )

  if ($Target.PSObject.Properties[$Name]) {
    $Target.$Name = $Value
  } else {
    $Target | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
  }
}

function Protect-PlainText {
  param([string]$PlainText)

  if ([string]::IsNullOrWhiteSpace($PlainText)) {
    return ''
  }

  $secureValue = ConvertTo-SecureString $PlainText -AsPlainText -Force
  ConvertFrom-SecureString $secureValue
}

function Unprotect-PlainText {
  param([string]$ProtectedText)

  if (-not $ProtectedText) {
    return ''
  }

  $secureValue = ConvertTo-SecureString $ProtectedText
  ConvertFrom-LocalSecureString $secureValue
}

function Get-ConfigValue {
  param(
    $Config,
    [string]$Name,
    [string]$DefaultValue = ''
  )

  if ($Config.PSObject.Properties[$Name] -and $null -ne $Config.$Name) {
    return [string]$Config.$Name
  }

  $DefaultValue
}

function Mask-Value {
  param(
    [string]$Value,
    [int]$VisibleSuffix = 2
  )

  if (-not $Value) {
    return ''
  }

  $normalized = $Value.Trim()
  if ($normalized.Length -le $VisibleSuffix) {
    return ('*' * $normalized.Length)
  }

  ('*' * ($normalized.Length - $VisibleSuffix)) + $normalized.Substring($normalized.Length - $VisibleSuffix)
}

if ($Action -eq 'Save') {
  if (-not $UserName.Trim()) {
    throw 'UserName is required when saving credentials.'
  }

  New-Item -ItemType Directory -Path $secretDir -Force | Out-Null

  if ($PasswordFromStdin) {
    $plainPassword = [Console]::In.ReadToEnd().TrimEnd("`r", "`n")
    $securePassword = ConvertTo-SecureString $plainPassword -AsPlainText -Force
  } else {
    $securePassword = Read-Host 'RetailSuite password' -AsSecureString
  }

  $payload = Read-SecretFileOrEmpty
  Set-JsonProperty -Target $payload -Name 'username' -Value $UserName
  Set-JsonProperty -Target $payload -Name 'passwordProtected' -Value (ConvertFrom-SecureString $securePassword)
  Set-JsonProperty -Target $payload -Name 'protectedBy' -Value 'Windows DPAPI CurrentUser'
  Set-JsonProperty -Target $payload -Name 'path' -Value $secretPath
  Set-JsonProperty -Target $payload -Name 'updatedAt' -Value ((Get-Date).ToUniversalTime().ToString('o'))

  $payload | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $secretPath -Encoding UTF8
  Write-Output (@{
    status = 'saved'
    username = $UserName
    path = $secretPath
    protectedBy = 'Windows DPAPI CurrentUser'
  } | ConvertTo-Json -Compress)
  exit 0
}

if ($Action -eq 'SaveMeny') {
  New-Item -ItemType Directory -Path $secretDir -Force | Out-Null

  if (-not $FromStdinJson) {
    throw 'SaveMeny requires -FromStdinJson with a JSON payload on stdin.'
  }

  $rawConfig = [Console]::In.ReadToEnd()
  if (-not $rawConfig.Trim()) {
    throw 'SaveMeny received an empty JSON payload.'
  }

  $config = $rawConfig | ConvertFrom-Json
  $payload = Read-SecretFileOrEmpty
  $menyPayload = [ordered]@{
    preprodUrl = Get-ConfigValue -Config $config -Name 'preprodUrl' -DefaultValue 'https://menyweb.trumffrontend.systest.trumf.cloud/'
    phoneProtected = Protect-PlainText (Get-ConfigValue -Config $config -Name 'phone')
    passwordProtected = Protect-PlainText (Get-ConfigValue -Config $config -Name 'password')
    otpCodeProtected = Protect-PlainText (Get-ConfigValue -Config $config -Name 'otpCode')
    cardProtected = Protect-PlainText (Get-ConfigValue -Config $config -Name 'card')
    expiryProtected = Protect-PlainText (Get-ConfigValue -Config $config -Name 'expiry')
    cvcProtected = Protect-PlainText (Get-ConfigValue -Config $config -Name 'cvc')
    protectedBy = 'Windows DPAPI CurrentUser'
    updatedAt = (Get-Date).ToUniversalTime().ToString('o')
  }

  Set-JsonProperty -Target $payload -Name 'menyPreprod' -Value $menyPayload
  Set-JsonProperty -Target $payload -Name 'protectedBy' -Value 'Windows DPAPI CurrentUser'
  Set-JsonProperty -Target $payload -Name 'path' -Value $secretPath

  $payload | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $secretPath -Encoding UTF8
  Write-Output (@{
    status = 'saved'
    preprodUrl = [string]$menyPayload.preprodUrl
    phone = Mask-Value (Get-ConfigValue -Config $config -Name 'phone')
    card = Mask-Value -Value ((Get-ConfigValue -Config $config -Name 'card') -replace '\s+', '') -VisibleSuffix 4
    path = $secretPath
    protectedBy = 'Windows DPAPI CurrentUser'
  } | ConvertTo-Json -Compress)
  exit 0
}

if ($Action -eq 'Get') {
  $payload = Read-SecretFile
  if (-not $payload.PSObject.Properties['username'] -or -not $payload.PSObject.Properties['passwordProtected']) {
    throw "RetailSuite credentials are not saved. Run scripts\secure-rs-credentials.ps1 -Action Save first."
  }
  $securePassword = ConvertTo-SecureString $payload.passwordProtected
  $password = ConvertFrom-LocalSecureString $securePassword
  Write-Output (@{
    username = [string]$payload.username
    password = $password
    protectedBy = [string]$payload.protectedBy
    path = $secretPath
  } | ConvertTo-Json -Compress)
  exit 0
}

if ($Action -eq 'GetMeny') {
  $payload = Read-SecretFile
  if (-not $payload.PSObject.Properties['menyPreprod']) {
    throw "Meny Preprod credentials are not saved. Run scripts\secure-rs-credentials.ps1 -Action SaveMeny first."
  }

  $menyPayload = $payload.menyPreprod
  Write-Output (@{
    preprodUrl = [string]$menyPayload.preprodUrl
    phone = Unprotect-PlainText ([string]$menyPayload.phoneProtected)
    password = Unprotect-PlainText ([string]$menyPayload.passwordProtected)
    otpCode = Unprotect-PlainText ([string]$menyPayload.otpCodeProtected)
    card = Unprotect-PlainText ([string]$menyPayload.cardProtected)
    expiry = Unprotect-PlainText ([string]$menyPayload.expiryProtected)
    cvc = Unprotect-PlainText ([string]$menyPayload.cvcProtected)
    protectedBy = [string]$menyPayload.protectedBy
    path = $secretPath
  } | ConvertTo-Json -Compress)
  exit 0
}

if ($Action -eq 'Status') {
  if (Test-Path -LiteralPath $secretPath) {
    $payload = Read-SecretFile
    $menyStatus = 'missing'
    $menyUrl = ''
    $menyUpdatedAt = ''
    if ($payload.PSObject.Properties['menyPreprod']) {
      $menyStatus = 'saved'
      $menyUrl = [string]$payload.menyPreprod.preprodUrl
      $menyUpdatedAt = [string]$payload.menyPreprod.updatedAt
    }

    Write-Output (@{
      status = 'saved'
      username = [string]$payload.username
      menyPreprod = $menyStatus
      menyPreprodUrl = $menyUrl
      path = $secretPath
      protectedBy = [string]$payload.protectedBy
      updatedAt = [string]$payload.updatedAt
      menyUpdatedAt = $menyUpdatedAt
    } | ConvertTo-Json -Compress)
  } else {
    Write-Output (@{ status = 'missing'; path = $secretPath } | ConvertTo-Json -Compress)
  }
  exit 0
}

if ($Action -eq 'Delete') {
  Remove-Item -LiteralPath $secretPath -Force -ErrorAction SilentlyContinue
  Write-Output (@{ status = 'deleted'; path = $secretPath } | ConvertTo-Json -Compress)
  exit 0
}
