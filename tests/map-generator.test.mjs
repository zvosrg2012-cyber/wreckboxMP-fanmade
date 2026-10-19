import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSelectedWorld, bindMapSelection } from '../src/map-generator.js';

function runtimeStub() {
  const calls = [];
  return {
    calls,
    generateCityChunk(options) { calls.push(['city', options]); return { generated: true }; },
    spawnStructure(object) { calls.push(['structure', object]); return { ...object, body: true }; },
    registerRadiationZone(zone) { calls.push(['radiation', zone]); },
    setPowerSource(source) { calls.push(['power', source]); }
  };
}

test('ordinary maps use the existing city generator without nuclear structures', () => {
  const runtime = runtimeStub();
  const result = generateSelectedWorld({ mapId: 'default', seed: 7, worldBounds: { x: 0, y: 0, width: 2000, height: 900 }, runtime });
  assert.equal(result.atomgrad, null);
  assert.equal(runtime.calls.filter(call => call[0] === 'structure').length, 0);
  assert.equal(runtime.calls.filter(call => call[0] === 'city').length, 1);
});

test('Atomgrad generates city and colored destructible plant objects through runtime adapter', () => {
  const runtime = runtimeStub();
  const result = generateSelectedWorld({ mapId: 'atomgrad', seed: 7, worldBounds: { x: 0, y: 0, width: 2000, height: 900 }, runtime });
  assert.equal(result.mapId, 'atomgrad');
  assert.ok(runtime.calls.some(call => call[0] === 'city'));
  const structures = runtime.calls.filter(call => call[0] === 'structure').map(call => call[1]);
  assert.ok(structures.length >= 25);
  assert.ok(structures.every(item => item.destructible === true));
  assert.ok(structures.some(item => item.color));
  assert.ok(runtime.calls.some(call => call[0] === 'power'));
  assert.ok(runtime.calls.some(call => call[0] === 'radiation'));
});

test('map-selection callback invokes the selected map generator', () => {
  const runtime = runtimeStub();
  const events = [];
  const callback = bindMapSelection(id => events.push(['select', id]), world => events.push(['generate', world.mapId]));
  callback({ mapId: 'atomgrad', seed: 8, worldBounds: { x: 0, y: 0, width: 1200, height: 600 }, runtime });
  assert.deepEqual(events, [['select', 'atomgrad'], ['generate', 'atomgrad']]);
});
