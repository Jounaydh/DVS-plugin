param(
  [string]$Version = "0.4.0"
)

$ErrorActionPreference = "Stop"
$installerRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $installerRoot
$vsixPath = Join-Path $projectRoot "dvs-visualizer-$Version.vsix"
$outputPath = Join-Path $projectRoot "DVS-Visualizer-VSCode-Setup-$Version.exe"
$compiler = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

if (-not (Test-Path -LiteralPath $vsixPath)) {
  throw "VSIX not found: $vsixPath"
}
if (-not (Test-Path -LiteralPath $compiler)) {
  throw "C# compiler not found: $compiler"
}

& $compiler /nologo /target:winexe /optimize+ `
  /reference:System.dll `
  /reference:System.Core.dll `
  /reference:System.Drawing.dll `
  /reference:System.Windows.Forms.dll `
  "/resource:$vsixPath,DVS.Visualizer.vsix" `
  "/out:$outputPath" `
  (Join-Path $installerRoot "DvsVsCodeInstaller.cs")

if ($LASTEXITCODE -ne 0) {
  throw "Installer compilation failed with exit code $LASTEXITCODE."
}

Write-Output $outputPath
