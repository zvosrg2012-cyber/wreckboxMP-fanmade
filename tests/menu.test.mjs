import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const menu = await readFile(new URL('../menu.html', import.meta.url), 'utf8');

test('map launcher exposes both game modes', () => {
  assert.match(menu, /data-open="game"/);
  assert.match(menu, /data-open="atomgrad"/);
  assert.match(menu, /\.\/index\.html/);
  assert.match(menu, /\.\/atomgrad\.html/);
});

test('launcher supports switching modes without leaving its shell', () => {
  assert.match(menu, /id="game"/);
  assert.match(menu, /id="bar"/);
  assert.match(menu, /function open\(mode\)/);
  assert.match(menu, /frame\.src=routes\[mode\]/);
  assert.match(menu, /data-open="menu"/);
});
