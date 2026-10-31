$ErrorActionPreference = 'Stop'
$modDir = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$gameRoot = (Resolve-Path -LiteralPath (Join-Path $modDir '..\..')).Path
$indexPath = Join-Path $gameRoot 'index.html'
if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) { throw "Could not find index.html at '$gameRoot'." }
$backups = @(Get-ChildItem -LiteralPath $gameRoot -Filter 'index.html.possession-backup-*' -File | Sort-Object LastWriteTime -Descending)
if ($backups.Count -eq 0) { throw 'No possession installer backup found. Nothing was changed.' }
$backup = $backups[0]
Copy-Item -LiteralPath $backup.FullName -Destination $indexPath -Force
Write-Host "Restored index.html from: $($backup.Name)"
Write-Host 'The backup was kept in place.'
