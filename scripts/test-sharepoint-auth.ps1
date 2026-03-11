param(
  [Parameter(Mandatory = $true)]
  [string]$SharePointUser,

  [Parameter(Mandatory = $true)]
  [string]$SharePointPassword,

  [string]$SharePointBaseUrl = 'https://spi.intranet.bs.ch/bdm/Projekte',
  [string[]]$ListTitles = @(
    'Roadmap Projects',
    'Roadmap Categories',
    'Roadmap Settings',
    'Roadmap Team Members',
    'Roadmap Project Links',
    'Roadmap Field Types',
    'Roadmap Fields'
  ),
  [bool]$IncludeCurrentUserProbe = $true,
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
      $args += @('--negotiate', '--user', "${User}:$Password")
    } elseif ($Auth -eq 'ntlm') {
      $args += @('--ntlm', '--user', "${User}:$Password")
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

function New-SharePointListReadUrl {
  param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,

    [Parameter(Mandatory = $true)]
    [string]$Title
  )

  $encodedTitle = [System.Uri]::EscapeDataString($Title)
  "$BaseUrl/_api/web/lists/getByTitle('$encodedTitle')/items?`$select=Id&`$top=1"
}

Write-Host 'Running SharePoint auth probes...'
Write-Host "User: $SharePointUser"
Write-Host "SharePoint base: $SharePointBaseUrl"
Write-Host "Roadmap instance (ignored in kerberos-only mode): $RoadmapInstance"
Write-Host "Proxy base (ignored in kerberos-only mode): $ProxyBaseUrl"

$allResults = New-Object System.Collections.Generic.List[object]
$titlesToProbe = @(
  $ListTitles |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    ForEach-Object { $_.Trim() } |
    Select-Object -Unique
)

if ($titlesToProbe.Count -eq 0) {
  throw 'No list titles provided. Pass at least one title via -ListTitles.'
}

Write-Host "List titles: $($titlesToProbe -join ', ')"

foreach ($title in $titlesToProbe) {
  $spReadUrl = New-SharePointListReadUrl -BaseUrl $SharePointBaseUrl -Title $title
  $allResults.Add(
    (Invoke-CurlProbe -Name "Direct SharePoint (Kerberos/Negotiate) [List=$title]" -Url $spReadUrl -Auth negotiate -User $SharePointUser -Password $SharePointPassword -InsecureTls:$SkipTlsValidation)
  )
}

if ($IncludeCurrentUserProbe) {
  $currentUserUrl = "$SharePointBaseUrl/_api/web/currentuser?`$select=Id,Title,LoginName,IsSiteAdmin"
  $allResults.Add(
    (Invoke-CurlProbe -Name 'Direct SharePoint (Kerberos/Negotiate) [CurrentUser]' -Url $currentUserUrl -Auth negotiate -User $SharePointUser -Password $SharePointPassword -InsecureTls:$SkipTlsValidation)
  )
}

foreach ($result in $allResults) {
  Show-Result -Result $result
}

Write-Host ''
Write-Host ('=' * 90)
Write-Host 'Summary:'
foreach ($result in $allResults) {
  Write-Host ("{0}: {1}" -f $result.Name, $result.StatusCode)
}
