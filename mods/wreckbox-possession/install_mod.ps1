$ErrorActionPreference = 'Stop'
$modDir = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$gameRoot = (Resolve-Path -LiteralPath (Join-Path $modDir '..\..')).Path
$indexPath = Join-Path $gameRoot 'index.html'
$scriptRelative = './mods/wreckbox-possession/possession.js'

if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
  throw "Could not find index.html at '$gameRoot'. Put this folder at <game>\mods\wreckbox-possession\."
}
$html = [System.IO.File]::ReadAllText($indexPath, [System.Text.Encoding]::UTF8)

# Remove any previous zombie/possession loader block before installing the new one.
$oldBlockPattern = '(?s)<!-- WRECKBOX (?:ZOMBIE|POSSESSION) MOD: BEGIN -->.*?<!-- WRECKBOX (?:ZOMBIE|POSSESSION) MOD: END -->\s*'
$html = [regex]::Replace($html, $oldBlockPattern, '')

$originalEvalCall = '(0,eval)(new TextDecoder().decode(u))'
$hookedEvalCall = 'window.__WRECKBOX_RUN_GAME_SOURCE__ ? window.__WRECKBOX_RUN_GAME_SOURCE__(new TextDecoder().decode(u)) : (0,eval)(new TextDecoder().decode(u))'
if ($html.Contains($originalEvalCall)) {
  $html = $html.Replace($originalEvalCall, $hookedEvalCall)
} elseif (-not $html.Contains('__WRECKBOX_RUN_GAME_SOURCE__(new TextDecoder().decode(u))')) {
  throw 'Could not find the game decryptor eval call. No files were changed.'
}
if ($html -notmatch '(?is)<script>\s*\(\(\)=>\{const k=\[') {
  throw 'Could not find the expected encrypted game script. No files were changed.'
}

$beginMarker = '<!-- WRECKBOX POSSESSION MOD: BEGIN -->'
$endMarker = '<!-- WRECKBOX POSSESSION MOD: END -->'
$nl = [Environment]::NewLine
$tag = $beginMarker + $nl + '<script src="' + $scriptRelative + '"></script>' + $nl + '<script src="./mods/wreckbox-possession/possession_hook.js"></script>' + $nl + $endMarker + $nl
$updated = [regex]::Replace(
  $html,
  '(?is)(<script>\s*\(\(\)=>\{const k=\[)',
  [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $tag + $m.Groups[1].Value },
  1
)
if ($updated -eq $html) { throw 'No insertion was made. No files were changed.' }

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupPath = "$indexPath.possession-backup-$stamp"
Copy-Item -LiteralPath $indexPath -Destination $backupPath
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($indexPath, $updated, $utf8NoBom)
Write-Host "Installed. Backup: $backupPath"
Write-Host "Game root: $gameRoot"
