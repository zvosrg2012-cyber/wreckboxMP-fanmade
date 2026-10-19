import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const packed = html.match(/const k=\[([^\]]+)\],s=atob\("([^"]+)"\)/);
assert.ok(packed, 'the packed game runtime must be present');
const key = packed[1].split(',').map(Number);
const encrypted = Buffer.from(packed[2], 'base64');
const clear = Buffer.alloc(encrypted.length);
for (let i = 0; i < encrypted.length; i++) {
  clear[i] = encrypted[i] ^ key[i % key.length] ^ ((i * 31 + (i >> 8)) & 255);
}
const runtime = clear.toString('utf8');

test('Atomgrad is an option in the original map selector, not a separate launcher', () => {
  assert.match(runtime, /atomgrad:r\("Атомград"\)/);
  assert.match(runtime, /Object\.keys\(ec\)/);
  assert.doesNotMatch(html, /id="mAtomgrad"|atomgradMenuBridge|atomgrad\.html/);
});

test('Atomgrad uses the original destructible terrain and building generator', () => {
  assert.match(runtime, /"atomgrad"===tc\?function\(\)/);
  assert.match(runtime, /Math\.floor\(u\*\.61\)/);
  assert.match(runtime, /lc\(a18city,a18cityEnd,null\)/);
  assert.match(runtime, /name="turbine-hall"/);
  assert.match(runtime, /name="reactor"/);
  assert.match(runtime, /name:"cooling-tower"/);
  assert.match(runtime, /name:"transmission-lines"/);
});

test('the packed game JavaScript remains syntactically valid', () => {
  assert.doesNotThrow(() => new vm.Script(runtime));
});

test('destroying the Atomgrad generator cuts power to district networks', () => {
  assert.match(runtime, /function eAtomgradSourceActive\(\)/);
  assert.match(runtime, /const powered=!tr\.destroyed&&eAtomgradSourceActive\(\)/);
});
