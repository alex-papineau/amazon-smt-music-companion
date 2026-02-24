# Build script for SMT IV: Amazon Edition
# Creates dist/chrome and dist/firefox directories with appropriate manifests

$ErrorActionPreference = "Stop"

# Define source and destination
$rootDir = Get-Location
$chromeDist = Join-Path $rootDir "dist\chrome"
$firefoxDist = Join-Path $rootDir "dist\firefox"

# Clean previous builds
if (Test-Path $chromeDist) { Remove-Item $chromeDist -Recurse -Force }
if (Test-Path $firefoxDist) { Remove-Item $firefoxDist -Recurse -Force }

# Create directories
New-Item -ItemType Directory -Force -Path $chromeDist | Out-Null
New-Item -ItemType Directory -Force -Path $firefoxDist | Out-Null

# Common files to copy
$commonFiles = @(
    "assets",
    "offscreen",
    "popup",
    "config.js",
    "background.js",
    "content.css",
    "content.js",
    "README.md"
)

# Function to copy common files
function Copy-CommonFiles($destination) {
    foreach ($file in $commonFiles) {
        if (Test-Path "$rootDir\$file") {
            Copy-Item -Path "$rootDir\$file" -Destination $destination -Recurse
        }
    }
}

Write-Host "Building Chrome extension..."
Copy-CommonFiles $chromeDist
# Transform manifest for Chrome (MV3 Service Worker)
if (Test-Path "$rootDir\manifest.json") {
    $manifest = Get-Content "$rootDir\manifest.json" -Raw | ConvertFrom-Json
    
    # Chrome MV3 uses service_worker instead of scripts array
    # We combine config.js and background.js logic by importing
    $manifest.background = @{
        service_worker = "background-chrome.js"
    }
    
    $manifest | ConvertTo-Json -Depth 10 | Out-File "$chromeDist\manifest.json" -Encoding utf8
    
    # Create the specialized Chrome background script that imports config
    "importScripts('config.js');`n" + (Get-Content "$rootDir\background.js" -Raw) | Out-File "$chromeDist\background-chrome.js" -Encoding utf8
    Remove-Item "$chromeDist\background.js" -Force
}

Write-Host "Building Firefox extension..."
Copy-CommonFiles $firefoxDist
# Copy Firefox manifest
# First check if we have an explicit firefox manifest
if (Test-Path "$rootDir\manifest.firefox.json") {
    Copy-Item -Path "$rootDir\manifest.firefox.json" -Destination "$firefoxDist\manifest.json"
}
elseif (Test-Path "$rootDir\manifest.json") {
    # If explicit firefox manifest missing, assume current manifest.json is Firefox (per current state)
    # But ideally we rename it to manifest.firefox.json to be safe next time
    Copy-Item -Path "$rootDir\manifest.json" -Destination "$firefoxDist\manifest.json"
}

Write-Host "Build complete!"
Write-Host "Chrome: $chromeDist"
Write-Host "Firefox: $firefoxDist"
Write-Host "Load these directories as unpacked extensions in their respective browsers."
