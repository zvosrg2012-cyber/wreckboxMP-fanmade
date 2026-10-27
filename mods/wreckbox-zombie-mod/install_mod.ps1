$ErrorActionPreference = 'Stop'
$modDir = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$gameRoot = (Resolve-Path -LiteralPath (Join-Path $modDir '..\..')).Path
$indexPath = Join-Path $gameRoot 'index.html'
$beginMarker = '<!-- WRECKBOX ZOMBIE MOD: BEGIN -->'
$endMarker = '<!-- WRECKBOX ZOMBIE MOD: END -->'
$scriptRelative = './mods/wreckbox-zombie-mod/zombie_type_menu.js'

if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
  throw "Could not find index.html at '$gameRoot'. Put this folder at <game>\mods\wreckbox-zombie-mod\."
}
$html = [System.IO.File]::ReadAllText($indexPath, [System.Text.Encoding]::UTF8)
if ($html.Contains($beginMarker) -and $html.Contains($endMarker)) {
  Write-Host 'The mod loader tag is already installed; no changes made.'
  exit 0
}
if ($html -notmatch '(?i)</body\s*>') {
  throw 'Could not find the closing </body> tag. No files were changed.'
}
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupPath = "$indexPath.mod-backup-$stamp"
Copy-Item -LiteralPath $indexPath -Destination $backupPath
$nl = [Environment]::NewLine
$tag = $beginMarker + $nl + '<script src="' + $scriptRelative + '"></script>' + $nl + $endMarker + $nl
$updated = [regex]::Replace($html, '(?i)</body\s*>', [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $tag + $m.Value }, 1)
if ($updated -eq $html) {
  Remove-Item -LiteralPath $backupPath -ErrorAction SilentlyContinue
  throw 'No insertion was made. No changes were applied.'
}
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($indexPath, $updated, $utf8NoBom)
Write-Host "Installed. Backup: $backupPath"
Write-Host "Game root: $gameRoot"
