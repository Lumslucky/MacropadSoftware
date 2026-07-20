param(
    [string]$Notes = 'MacroPad Studio update',
    [switch]$SkipTests,
    [switch]$ReuseApplicationBundle
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$repository = 'Lumslucky/MacropadSoftware'
$publicKeyPath = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.tauri\macropad.key.pub'
$privateKeyPath = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.tauri\macropad.key'

foreach ($path in $publicKeyPath, $privateKeyPath) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing updater signing file: $path"
    }
}

$package = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'package.json') | ConvertFrom-Json
$tauri = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'src-tauri\tauri.conf.json') | ConvertFrom-Json
$cargoVersion = (Select-String -LiteralPath (Join-Path $projectRoot 'src-tauri\Cargo.toml') -Pattern '^version = "([^"]+)"' | Select-Object -First 1).Matches[0].Groups[1].Value
$version = $package.version
if ($version -ne $tauri.version -or $version -ne $cargoVersion) {
    throw "Application versions differ: package=$version, Tauri=$($tauri.version), Cargo=$cargoVersion"
}

$firmwareSource = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'firmware\src\main.cpp')
$firmwareParts = foreach ($name in 'Major', 'Minor', 'Patch') {
    $match = [regex]::Match($firmwareSource, "kFirmwareVersion$name\s*=\s*(\d+)\s*;")
    if (-not $match.Success) { throw "Missing firmware $name version constant" }
    $match.Groups[1].Value
}
$firmwareVersion = $firmwareParts -join '.'
$tag = "v$version"
$releaseDirectory = Join-Path $projectRoot "release\github\$tag"
New-Item -ItemType Directory -Force -Path $releaseDirectory | Out-Null

$toolingRoot = Join-Path $projectRoot '.tooling'
if (Test-Path -LiteralPath (Join-Path $toolingRoot 'cargo\bin\cargo.exe')) {
    $env:CARGO_HOME = Join-Path $toolingRoot 'cargo'
    $env:RUSTUP_HOME = Join-Path $toolingRoot 'rustup'
    $env:PATH = "$(Join-Path $toolingRoot 'cargo\bin');$env:PATH"
}

$env:MACROPAD_UPDATE_PUBLIC_KEY = (Get-Content -Raw -LiteralPath $publicKeyPath).Trim()
$env:MACROPAD_APP_UPDATE_ENDPOINT = "https://github.com/$repository/releases/latest/download/latest.json"
$env:MACROPAD_FIRMWARE_MANIFEST_URL = "https://github.com/$repository/releases/latest/download/firmware-latest.json"
$env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content -Raw -LiteralPath $privateKeyPath).Trim()
$passwordWasPrompted = -not $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD

if ($passwordWasPrompted) {
    $securePassword = Read-Host 'Updater signing-key password' -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    try {
        $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
}

Push-Location $projectRoot
try {
    if (-not $SkipTests) {
        & npm.cmd test -- --run
        if ($LASTEXITCODE -ne 0) { throw 'Frontend tests failed.' }
        & cargo test --manifest-path 'src-tauri\Cargo.toml'
        if ($LASTEXITCODE -ne 0) { throw 'Rust tests failed.' }
    }

    if (-not $ReuseApplicationBundle) {
        & npm.cmd run tauri -- build --bundles nsis
        if ($LASTEXITCODE -ne 0) { throw 'Windows application build failed.' }
    }

    $firmwarePackageUrl = "https://github.com/$repository/releases/download/$tag/macropad-firmware-$firmwareVersion.zip"
    & (Join-Path $PSScriptRoot 'Build-FirmwareRelease.ps1') `
        -Version $firmwareVersion `
        -PackageUrl $firmwarePackageUrl `
        -Notes "MacroPad USB firmware $firmwareVersion"

    $bundleDirectory = Join-Path $projectRoot 'src-tauri\target\release\bundle\nsis'
    $installer = Get-ChildItem -LiteralPath $bundleDirectory -Filter '*.exe' | Select-Object -First 1
    $updaterArchive = Get-ChildItem -LiteralPath $bundleDirectory -Filter '*.nsis.zip' | Select-Object -First 1
    if (-not $updaterArchive -and $installer -and (Test-Path -LiteralPath "$($installer.FullName).sig")) {
        $updaterArchive = $installer
    }
    if (-not $installer -or -not $updaterArchive) {
        throw "Could not find a signed NSIS installer or updater archive in $bundleDirectory"
    }
    $updaterSignature = Get-Item -LiteralPath "$($updaterArchive.FullName).sig"

    $applicationArtifacts = $installer, $updaterArchive, $updaterSignature |
        Sort-Object -Property FullName -Unique
    foreach ($artifact in $applicationArtifacts) {
        Copy-Item -LiteralPath $artifact.FullName -Destination $releaseDirectory -Force
    }

    $firmwareReleaseDirectory = Join-Path $projectRoot "release\firmware\$firmwareVersion"
    Get-ChildItem -LiteralPath $firmwareReleaseDirectory -File | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $releaseDirectory -Force
    }

    $latest = [ordered]@{
        version = $version
        notes = $Notes
        pub_date = [DateTime]::UtcNow.ToString('o')
        platforms = [ordered]@{
            'windows-x86_64' = [ordered]@{
                signature = (Get-Content -Raw -LiteralPath $updaterSignature.FullName).Trim()
                url = "https://github.com/$repository/releases/download/$tag/$([Uri]::EscapeDataString($updaterArchive.Name))"
            }
        }
    }
    $latestJson = $latest | ConvertTo-Json -Depth 5
    [IO.File]::WriteAllText((Join-Path $releaseDirectory 'latest.json'), $latestJson, [Text.UTF8Encoding]::new($false))

    Write-Host ''
    Write-Host "Local signed release is ready: $releaseDirectory"
    Write-Host "Create GitHub release $tag and upload every file from that directory."
} finally {
    Pop-Location
    if ($passwordWasPrompted) {
        Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD -ErrorAction SilentlyContinue
    }
    Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY -ErrorAction SilentlyContinue
}
