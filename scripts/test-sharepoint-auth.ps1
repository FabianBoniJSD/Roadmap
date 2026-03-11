param(
  [Parameter(Mandatory = $true)]
  [string]$SharePointUser,

  [Parameter(Mandatory = $true)]
  [string]$SharePointPassword,

  [string]$SharePointBaseUrl = 'https://spi.intranet.bs.ch/bdm/Projekte',
  [string]$ListTitle = 'RoadmapProjects',
  [string]$RoadmapInstance = 'bdm-projekte',
  [string]$ProxyBaseUrl = 'http://localhost:3000',
  [switch]$SkipTlsValidation
)

$ErrorActionPreference = 'Stop'

function Get-CurlPath {
  $cmd = Get-Command curl -CommandType Application -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  $cmdExe = Get-Command curl.exe -CommandType Application -ErrorAction SilentlyContinue
  if ($cmdExe) {
    return $cmdExe.Source
  }

  throw 'curl executable not found. Please install curl first.'
}

function Invoke-CurlProbe {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [string]$Url,

    [ValidateSet('negotiate', 'ntlm', 'none')]
    [string]$Auth = 'none',

    [string]$User,
    [string]$Password,
    [switch]$InsecureTls
  )

  $headersFile = [System.IO.Path]::GetTempFileName()
  $bodyFile = [System.IO.Path]::GetTempFileName()

  try {
    $args = @(
      '-sS',
      '-D', $headersFile,
      '-o', $bodyFile,
      '-w', 'HTTP:%{http_code}',
      '--noproxy', '*',
      '-H', 'Accept: application/json;odata=nometadata'
    )

    if ($InsecureTls) {
      $args += '-k'
    }

    if ($Auth -eq 'negotiate') {
      $args += @('--negotiate', '--user', "$User:$Password")
    } elseif ($Auth -eq 'ntlm') {
      $args += @('--ntlm', '--user', "$User:$Password")
    }

    $args += $Url

    $curlPath = Get-CurlPath
    $curlOut = & $curlPath @args 2>&1
    $curlText = ($curlOut | Out-String)
    $statusCode = 0
    $m = [regex]::Match($curlText, 'HTTP:(\d{3})')
    if ($m.Success) {
      $statusCode = [int]$m.Groups[1].Value
    }

    $headers = @()
    if (Test-Path $headersFile) {
      $headers = Get-Content -LiteralPath $headersFile
    }

    $body = ''
    if (Test-Path $bodyFile) {
      $body = Get-Content -LiteralPath $bodyFile -Raw
    }

    $bodyPreview = if ($body.Length -gt 400) { $body.Substring(0, 400) } else { $body }

    [PSCustomObject]@{
      Name = $Name
      Url = $Url
      StatusCode = $statusCode
      Headers = $headers
      BodyPreview = $bodyPreview
      CurlOutput = $curlText.Trim()
    }
  } finally {
    if (Test-Path $headersFile) { Remove-Item -LiteralPath $headersFile -Force -ErrorAction SilentlyContinue }
    if (Test-Path $bodyFile) { Remove-Item -LiteralPath $bodyFile -Force -ErrorAction SilentlyContinue }
  }
}

function Show-Result {
  param(
    [Parameter(Mandatory = $true)]
    $Result
  )

  Write-Host ''
  Write-Host ('=' * 90)
  Write-Host ("Test: {0}" -f $Result.Name)
  Write-Host ("URL : {0}" -f $Result.Url)
  Write-Host ("HTTP: {0}" -f $Result.StatusCode)

  Write-Host 'Headers (first 20 lines):'
  if ($Result.Headers -and $Result.Headers.Count -gt 0) {
    $Result.Headers | Select-Object -First 20 | ForEach-Object { Write-Host $_ }
  } else {
    Write-Host '<no headers>'
  }

  Write-Host 'Body preview (max 400 chars):'
  if ([string]::IsNullOrWhiteSpace($Result.BodyPreview)) {
    Write-Host '<empty>'
  } else {
    Write-Host $Result.BodyPreview
  }
}

$spReadUrl = "$SharePointBaseUrl/_api/web/lists/getByTitle('$ListTitle')/items?`$select=Id&`$top=1"
$spReadNoAuthUrl = $spReadUrl
$proxyReadUrl = "$ProxyBaseUrl/api/sharepoint/_api/web/lists/getByTitle('$ListTitle')/items?%24select=Id&%24top=1&roadmapInstance=$RoadmapInstance"

Write-Host 'Running SharePoint auth probes...'
Write-Host "User: $SharePointUser"
Write-Host "SharePoint base: $SharePointBaseUrl"
Write-Host "List title: $ListTitle"
Write-Host "Roadmap instance: $RoadmapInstance"
Write-Host "Proxy base: $ProxyBaseUrl"

$directNegotiate = Invoke-CurlProbe -Name 'Direct SharePoint (Negotiate)' -Url $spReadUrl -Auth negotiate -User $SharePointUser -Password $SharePointPassword -InsecureTls:$SkipTlsValidation
$directNtlm = Invoke-CurlProbe -Name 'Direct SharePoint (NTLM)' -Url $spReadUrl -Auth ntlm -User $SharePointUser -Password $SharePointPassword -InsecureTls:$SkipTlsValidation
$directNoAuth = Invoke-CurlProbe -Name 'Direct SharePoint (No Auth)' -Url $spReadNoAuthUrl -Auth none -InsecureTls:$SkipTlsValidation
$proxyCall = Invoke-CurlProbe -Name 'Roadmap Proxy (Local)' -Url $proxyReadUrl -Auth none -InsecureTls:$SkipTlsValidation

Show-Result -Result $directNegotiate
Show-Result -Result $directNtlm
Show-Result -Result $directNoAuth
Show-Result -Result $proxyCall

Write-Host ''
Write-Host ('=' * 90)
Write-Host 'Summary:'
Write-Host ("Negotiate: {0}" -f $directNegotiate.StatusCode)
Write-Host ("NTLM     : {0}" -f $directNtlm.StatusCode)
Write-Host ("No Auth  : {0}" -f $directNoAuth.StatusCode)
Write-Host ("Proxy    : {0}" -f $proxyCall.StatusCode)

$proxyHeaders = $proxyCall.Headers | Where-Object { $_ -match '^(x-sp-curl-auth|x-sp-proxy-mode)\s*:' }
if ($proxyHeaders.Count -gt 0) {
  Write-Host 'Proxy auth headers:'
  $proxyHeaders | ForEach-Object { Write-Host $_ }
}
