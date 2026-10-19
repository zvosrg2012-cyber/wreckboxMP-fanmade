import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAP_DEFINITIONS,
  getMapDefinition,
  resolveMapSelection,
  createSelectedMap
} from '../src/map-registry.js';

test('Atomgrad is an explicit map choice and not the ordinary-map default', () => {
  assert.ok(MAP_DEFINITIONS.some(map => map.id === 'atomgrad' && map.label === 'Атомград'));
  assert.equal(resolveMapSelection('atomgrad').nuclearPlant, true);
  assert.equal(resolveMapSelection('default').nuclearPlant, false);
  assert.equal(resolveMapSelection('unknown-map').id, 'default');
  assert.equal(getMapDefinition('unknown-map'), null);
});

test('ordinary map selection never invokes the Atomgrad engine adapter', () => {
  const result = createSelectedMap('default', {});
  assert.deepEqual(result, { mapId: 'default', atomgrad: null });
});

test('Atomgrad requires an explicit engine context rather than silently faking objects', () => {
  assert.throws(() => createSelectedMap('atomgrad', {
    seed: 123,
    worldBounds: { x: 0, y: 0, width: 1200, height: 600 },
    engine: {}
  }), /Engine adapter missing method/);
});
