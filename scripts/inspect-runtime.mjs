import { readFile, writeFile } from 'node:fs/promises';
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const terms = [
  'mAtomgrad','mMapNext','mMapPrev','mapName','mMap.addEventListener',
  'const maps','const MAPS','mapIndex','mapId','function build','function generate',
  'function makeMap','function spawn','function explode','requestAnimationFrame',
  'const ctx','getContext("2d")','function draw','function physics','function step'
];
const out = ['# Existing game runtime inspection', '', 'Generated from the current index.html. Excerpts are from the actual game bundle.', ''];
for (const term of terms) {
  out.push('## '+term);
  let at=-1,count=0;
  while ((at=html.indexOf(term,at+1))>=0 && count<5) {
    const a=Math.max(0,at-260), b=Math.min(html.length,at+650);
    out.push('```js',html.slice(a,b).replace(/\r/g,' ').replace(/\n{3,}/g,'\n\n'),'```');
    count++;
  }
  if (!count) out.push('No match.');
  out.push('');
}
await writeFile(new URL('../runtime-api-report.md',import.meta.url),out.join('\n'),'utf8');
console.log('Wrote targeted runtime inspection.');

// Trigger inspection after workflow installation.
