import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../index.html', import.meta.url);
const reportFile = new URL('../runtime-api-report.md', import.meta.url);
const marker = '<!-- data-wreckbox-update18-menu';
let html = await readFile(file, 'utf8');
const start = html.indexOf(marker);

if (start >= 0) {
  const scriptEnd = html.indexOf('</script>', start);
  if (scriptEnd < 0) throw new Error('Injected menu script end not found');
  let end = scriptEnd + '</script>'.length;
  if (html[end] === '\\n') end++;
  html = html.slice(0, start) + html.slice(end);
  console.log('Removed the incorrect duplicate map chooser from index.html.');
} else {
  console.log('No injected duplicate map chooser found.');
}
await writeFile(file, html, 'utf8');

// The original game is packed into one large HTML file. Report real menu and
// physics symbols from that source so the map can be added to the existing UI.
const patterns = [
  ['Map / level selection', /map|level|карта|уровен|stage|worldselect/ig],
  ['Game menu / new game', /new game|start game|play game|играть|новая игра|выбор карты|select map/ig],
  ['Physics engine', /Matter\\.World|Matter\\.Bodies|Engine\\.update|Bodies\\.rectangle|World\\.add/ig],
  ['Destructible / damage', /destruct|breakable|damage|health|разруш|урон/ig],
  ['World generation', /generateWorld|generateMap|createWorld|generateCity|terrain|building/ig]
];
const lines = ['# Runtime API discovery report', '', 'Generated from the checked-out original index.html by GitHub Actions.', 'Only short source excerpts are included; this is for locating the existing map menu and engine APIs.', ''];
for (const [label, regex] of patterns) {
  lines.push('## ' + label);
  const seen = new Set();
  let match;
  while ((match = regex.exec(html)) && seen.size < 18) {
    const from = Math.max(0, match.index - 100);
    const to = Math.min(html.length, match.index + match[0].length + 160);
    const excerpt = html.slice(from, to).replace(/\\s+/g, ' ').trim();
    if (!seen.has(excerpt)) { seen.add(excerpt); lines.push('- `' + excerpt.replace(/`/g, "'") + '`'); }
  }
  if (!seen.size) lines.push('- No matches found.');
  lines.push('');
}
await writeFile(reportFile, lines.join('\\n'), 'utf8');
console.log('Wrote runtime-api-report.md for integrating the map into the existing menu.');
