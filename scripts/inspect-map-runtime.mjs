import { readFile, writeFile } from 'node:fs/promises';
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const terms = [
  'mMapNext','mMapPrev','mapIndex','mapName','MAPS','maps=','mapList',
  'generateMap','generateWorld','Matter.Bodies','Bodies.rectangle','World.add',
  'function createMap','function genMap','function buildMap','function drawMap',
  'mapSelector','selectMap','worldGen','newWorld'
];
const out = ['# Existing game map implementation excerpts','','Source: index.html from fan-update-1.8. Excerpts are taken from the original game bundle.',''];
for (const term of terms) {
 out.push('## '+term); let at=-1,n=0;
 while((at=html.indexOf(term,at+1))>=0&&n<4){
  const a=Math.max(0,at-400),b=Math.min(html.length,at+1000);
  out.push('```js',html.slice(a,b).replace(/\r/g,' ').replace(/\n{3,}/g,'\n\n'),'```');n++;
 }
 if(!n)out.push('No match.');out.push('');
}
await writeFile(new URL('../runtime-map-excerpts.md',import.meta.url),out.join('\n'),'utf8');
console.log('Generated existing map source excerpts.');

// Re-run inspection after workflow installation.
