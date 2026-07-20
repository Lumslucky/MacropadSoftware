param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^\d+\.\d+\.\d+$')]
    [string]$Version,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^https://')]
    [string]$PackageUrl,

    [string]$Notes = 'MacroPad firmware update',
    [string]$FirmwareProject = (Join-Path $PSScriptRoot '..\firmware'),
    [string]$OutputDirectory = 'release\firmware'
)

$ErrorActionPreference = 'Stop'

if (-not $env:TAURI_SIGNING_PRIVATE_KEY -and -not $env:TAURI_SIGNING_PRIVATE_KEY_PATH) {
    throw 'Set TAURI_SIGNING_PRIVATE_KEY or TAURI_SIGNING_PRIVATE_KEY_PATH before publishing.'
}

$firmwareRoot = (Resolve-Path -LiteralPath $FirmwareProject).Path
$versionParts = $Version.Split('.')
$firmwareSource = Get-Content -Raw -LiteralPath (Join-Path $firmwareRoot 'src\main.cpp')
$versionNames = 'Major', 'Minor', 'Patch'
for ($index = 0; $index -lt 3; $index++) {
    $pattern = "kFirmwareVersion$($versionNames[$index])\s*=\s*$($versionParts[$index])\s*;"
    if ($firmwareSource -notmatch $pattern) {
        throw "Firmware source version does not match $Version. Update kFirmwareVersion$($versionNames[$index])."
    }
}
$platformio = Get-Command pio -ErrorAction SilentlyContinue
if (-not $platformio) {
    $platformio = Get-Command platformio -ErrorAction SilentlyContinue
}
$platformioExecutable = if ($platformio) {
    $platformio.Source
} else {
    Join-Path ([Environment]::GetFolderPath('UserProfile')) '.platformio\penv\Scripts\platformio.exe'
}
if (-not (Test-Path -LiteralPath $platformioExecutable)) {
    throw 'PlatformIO was not found. Install PlatformIO Core before publishing firmware.'
}

& $platformioExecutable run --project-dir $firmwareRoot
if ($LASTEXITCODE -ne 0) { throw 'Firmware build failed.' }

$buildDirectory = Join-Path $firmwareRoot '.pio\build\esp32-s3-devkitm-1'
$platformioHome = if ($env:PLATFORMIO_CORE_DIR) {
    $env:PLATFORMIO_CORE_DIR
} else {
    Join-Path ([Environment]::GetFolderPath('UserProfile')) '.platformio'
}
$bootApp = Join-Path $platformioHome 'packages\framework-arduinoespressif32\tools\partitions\boot_app0.bin'
$requiredFiles = @{
    'bootloader.bin' = Join-Path $buildDirectory 'bootloader.bin'
    'partitions.bin' = Join-Path $buildDirectory 'partitions.bin'
    'boot_app0.bin' = $bootApp
    'firmware.bin' = Join-Path $buildDirectory 'firmware.bin'
}
foreach ($source in $requiredFiles.Values) {
    if (-not (Test-Path -LiteralPath $source)) { throw "Missing firmware artifact: $source" }
}

$releaseRoot = Join-Path (Get-Location) $OutputDirectory
$releaseDirectory = Join-Path $releaseRoot $Version
New-Item -ItemType Directory -Force -Path $releaseDirectory | Out-Null
$stagingDirectory = Join-Path ([IO.Path]::GetTempPath()) ("macropad-firmware-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stagingDirectory | Out-Null

try {
    foreach ($entry in $requiredFiles.GetEnumerator()) {
        Copy-Item -LiteralPath $entry.Value -Destination (Join-Path $stagingDirectory $entry.Key)
    }
    [IO.File]::WriteAllText((Join-Path $stagingDirectory 'version.txt'), $Version, [Text.UTF8Encoding]::new($false))

    $packagePath = Join-Path $releaseDirectory "macropad-firmware-$Version.zip"
    Compress-Archive -Path (Join-Path $stagingDirectory '*') -DestinationPath $packagePath -Force
    $npm = if ([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT) { 'npm.cmd' } else { 'npm' }
    & $npm run tauri -- signer sign $packagePath
    if ($LASTEXITCODE -ne 0) { throw 'Firmware signing failed.' }

    $signaturePath = "$packagePath.sig"
    if (-not (Test-Path -LiteralPath $signaturePath)) { throw "Missing signature: $signaturePath" }
    $package = Get-Item -LiteralPath $packagePath
    $manifest = [ordered]@{
        version = $Version
        notes = $Notes
        publishedAt = [DateTime]::UtcNow.ToString('o')
        chip = 'esp32s3'
        board = 'esp32-s3-devkitc-1'
        url = $PackageUrl
        signature = (Get-Content -Raw -LiteralPath $signaturePath).Trim()
        sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $packagePath).Hash.ToLowerInvariant()
        size = $package.Length
    }
    $manifestPath = Join-Path $releaseDirectory 'firmware-latest.json'
    $manifestJson = $manifest | ConvertTo-Json -Depth 4
    [IO.File]::WriteAllText($manifestPath, $manifestJson, [Text.UTF8Encoding]::new($false))
    Write-Host "Signed firmware release written to $releaseDirectory"
}
finally {
    $resolvedTemp = [IO.Path]::GetFullPath($stagingDirectory)
    $systemTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if ($resolvedTemp.StartsWith($systemTemp, [StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
    }
}
