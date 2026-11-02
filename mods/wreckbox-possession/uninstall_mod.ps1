$ErrorActionPreference = 'Stop'
$modDir = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$gameRoot = (Resolve-Path -LiteralPath (Join-Path $modDir '..\..')).Path
$indexPath = Join-Path $gameRoot 'index.html'
if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) { throw "Could not find index.html at '$gameRoot'." }
# Backup names carry a yyyyMMdd-HHmmss stamp, so sorting by name is newest-first. (LastWriteTime is not
# reliable here: Copy-Item keeps the source file's timestamp.) Only a backup that does NOT contain the
# mod is a valid original; older installer versions could leave a modified file as a "backup".
$backups = @(Get-ChildItem -LiteralPath $gameRoot -Filter 'index.html.possession-backup-*' -File | Sort-Object Name -Descending)
if ($backups.Count -eq 0) { throw 'No possession installer backup found. Nothing was changed.' }
$backup = $null
foreach ($candidate in $backups) {
  $text = [System.IO.File]::ReadAllText($candidate.FullName, [System.Text.Encoding]::UTF8)
  if (-not $text.Contains('__WRECKBOX_RUN_GAME_SOURCE__') -and -not $text.Contains('WRECKBOX POSSESSION MOD: BEGIN')) { $backup = $candidate; break }
}
if ($null -eq $backup) { throw 'Every backup already contains the mod, so none can be restored as the original. Nothing was changed.' }
Copy-Item -LiteralPath $backup.FullName -Destination $indexPath -Force
Write-Host "Restored index.html from: $($backup.Name)"
Write-Host 'The backup was kept in place.'
