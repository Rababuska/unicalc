$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http

$allowedHosts = @(
    'happygifts.ru',
    'artegifts.by',
    'oasiscatalog.com',
    'gifts.ru',
    'portobello.ru',
    'ucontay.kz',
    's.a-5.ru',
    'insales-shop.ru'
)
$maxResponseBytes = 12582912
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://127.0.0.1:8767/')
$listener.Start()
$handler = New-Object System.Net.Http.HttpClientHandler
$handler.AllowAutoRedirect = $false
$handler.UseCookies = $false
$handler.AutomaticDecompression = [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate
$client = New-Object System.Net.Http.HttpClient($handler)
$client.Timeout = [TimeSpan]::FromSeconds(20)

function Test-AllowedUri($uri) {
    if ($uri.Scheme -ne 'https') { return $false }
    foreach ($allowedHost in $allowedHosts) {
        if ($uri.Host -eq $allowedHost -or $uri.Host.EndsWith('.' + $allowedHost, [StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
    }
    return $false
}

function Write-Response($context, $statusCode, $contentType, [byte[]]$body) {
    $context.Response.StatusCode = $statusCode
    $context.Response.ContentType = $contentType
    $context.Response.ContentLength64 = $body.Length
    if ($body.Length -gt 0) {
        $context.Response.OutputStream.Write($body, 0, $body.Length)
    }
    $context.Response.Close()
}

Write-Host 'Souvenir import bridge listening at http://127.0.0.1:8767/'
Write-Host 'Keep this terminal open while importing products. Press Ctrl+C to stop.'

while ($listener.IsListening) {
    $context = $null
    try {
        $context = $listener.GetContext()
        $context.Response.Headers['Access-Control-Allow-Origin'] = '*'
        $context.Response.Headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        $context.Response.Headers['Access-Control-Allow-Headers'] = 'Content-Type'
        $context.Response.Headers['Access-Control-Allow-Private-Network'] = 'true'
        $context.Response.Headers['Cache-Control'] = 'no-store'

        if ($context.Request.HttpMethod -eq 'OPTIONS') {
            Write-Response $context 204 'text/plain; charset=utf-8' ([byte[]]@())
            continue
        }

        if ($context.Request.HttpMethod -ne 'GET') {
            throw 'Only GET requests are supported.'
        }

        if ($context.Request.Url.AbsolutePath -eq '/health') {
            $healthBody = [System.Text.Encoding]::UTF8.GetBytes('ok')
            Write-Response $context 200 'text/plain; charset=utf-8' $healthBody
            continue
        }

        if ($context.Request.Url.AbsolutePath -ne '/proxy') {
            throw 'Unknown endpoint.'
        }

        $targetText = $context.Request.QueryString['url']
        $target = $null
        if (-not [Uri]::TryCreate($targetText, [UriKind]::Absolute, [ref]$target) -or -not (Test-AllowedUri $target)) {
            throw 'The URL is not in the import allowlist.'
        }

        $remoteResponse = $null
        for ($redirect = 0; $redirect -le 5; $redirect++) {
            $remoteRequest = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Get, $target)
            $remoteRequest.Headers.UserAgent.ParseAdd('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36')
            $remoteRequest.Headers.Accept.ParseAdd('*/*')
            $remoteResponse = $client.SendAsync($remoteRequest).GetAwaiter().GetResult()
            $status = [int]$remoteResponse.StatusCode
            if ($status -notin @(301, 302, 303, 307, 308)) { break }
            if ($redirect -eq 5 -or -not $remoteResponse.Headers.Location) {
                throw 'Too many redirects.'
            }
            $nextTarget = [Uri]::new($target, $remoteResponse.Headers.Location)
            $remoteResponse.Dispose()
            if (-not (Test-AllowedUri $nextTarget)) {
                throw 'The redirect target is not in the import allowlist.'
            }
            $target = $nextTarget
        }

        if (-not $remoteResponse.IsSuccessStatusCode) {
            throw ('The catalog returned HTTP ' + [int]$remoteResponse.StatusCode + '.')
        }
        if ($remoteResponse.Content.Headers.ContentLength -gt $maxResponseBytes) {
            throw 'The catalog response is larger than 12 MB.'
        }

        $bytes = $remoteResponse.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
        if ($bytes.Length -gt $maxResponseBytes) {
            throw 'The catalog response is larger than 12 MB.'
        }
        $contentType = 'application/octet-stream'
        if ($remoteResponse.Content.Headers.ContentType) {
            $contentType = $remoteResponse.Content.Headers.ContentType.ToString()
        }
        Write-Response $context 200 $contentType $bytes
        $remoteResponse.Dispose()
    } catch {
        if ($context -and $context.Response -and $context.Response.OutputStream.CanWrite) {
            $errorBody = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -Compress @{ error = $_.Exception.Message }))
            try { Write-Response $context 502 'application/json; charset=utf-8' $errorBody } catch { $context.Response.Abort() }
        }
    }
}