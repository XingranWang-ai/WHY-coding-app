$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$toolchain = Join-Path $projectRoot '.toolchain'
$javaHome = Join-Path $toolchain 'jdk-21.0.11+10'
$androidSdk = Join-Path $toolchain 'android-sdk'
$gradle = Join-Path $toolchain 'gradle-8.14.3\bin\gradle.bat'
$androidProject = Join-Path $projectRoot 'android'
$builtApk = Join-Path $androidProject 'app\build\outputs\apk\debug\app-debug.apk'
$outputApk = Join-Path $projectRoot 'Why-v1.5-debug.apk'

foreach ($requiredPath in @(
    (Join-Path $javaHome 'bin\java.exe'),
    (Join-Path $androidSdk 'platforms\android-36'),
    $gradle
  )) {
  if (-not (Test-Path $requiredPath)) {
    throw "Missing local Android toolchain component: $requiredPath"
  }
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidSdk
$env:ANDROID_SDK_ROOT = $androidSdk
$env:GRADLE_USER_HOME = Join-Path $toolchain 'gradle-home'

Push-Location $projectRoot
try {
  npm.cmd run android:sync
  Push-Location $androidProject
  try {
    & $gradle assembleDebug --no-daemon --max-workers=1
    if ($LASTEXITCODE -ne 0) {
      throw "Android build failed with exit code $LASTEXITCODE"
    }
  }
  finally {
    Pop-Location
  }

  Copy-Item -LiteralPath $builtApk -Destination $outputApk -Force
  Write-Output "APK: $outputApk"
}
finally {
  Pop-Location
}
