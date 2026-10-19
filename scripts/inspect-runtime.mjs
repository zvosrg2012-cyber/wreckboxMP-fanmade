import { readFile, writeFile } from 'node:fs/promises';
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const terms = [
  'mAtomgrad','mMapNext','mMapPrev','mapName','mMap.addEventListener',
  'const maps','const MAPS','mapIndex','mapId','function build','function generate',
  'function makeMap','function spawn','function explode','requestAnimationFrame',
  'const ctx','function draw','function physics','function step'
];
const out = ['# Existing game runtime inspection', '', 'Excerpts from the actual game bundle on fan-update-1.8.', ''];
for (const term of terms) {
  out.push('## '+term);
  let at=-1,count=0;
  while ((at=html.indexOf(term,at+1))>=0 && count<8) {
    const a=Math.max(0,at-220), b=Math.min(html.length,at+720);
    out.push('```js',html.slice(a,b).replace(/\r/g,' ').replace(/\n{3,}/g,'\n\n'),'```');
    count++;
  }
  if (!count) out.push('No match.');
  out.push('');
}
await writeFile(new URL('../runtime-api-report.md',import.meta.url),out.join('\n'),'utf8');
console.log('Wrote targeted runtime inspection.');
