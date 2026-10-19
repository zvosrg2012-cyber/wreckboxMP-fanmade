import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATOMGRAD_MAP_ID,
  ATOMGRAD_MATERIALS,
  ATOMGRAD_PLANT_LAYOUT,
  createAtomgradPlan,
  buildAtomgrad,
  ReactorAccident
} from '../src/atomgrad.js';

test('Atomgrad is a separate deterministic map with city and plant regions', () => {
  const plan = createAtomgradPlan(1234, { x: 0, y: 0, width: 5000, height: 1200 });
  assert.equal(plan.id, ATOMGRAD_MAP_ID);
  assert.equal(plan.rules.ordinaryMapsSpawnPlant, false);
  assert.ok(plan.regions.city.width > plan.regions.plant.width);
  assert.equal(plan.regions.city.width + plan.regions.plant.width, 5000);
  assert.ok(plan.plantStructures.some(item => item.id === 'reactor-core' && item.critical));
  assert.ok(plan.plantStructures.every(item => item.destructible));
  assert.ok(plan.plantStructures.length >= 18);
  assert.ok(plan.regions.city.width / 5000 <= 0.56, 'keep city on the left and reserve the right for the plant');
  assert.ok(plan.interiorFixtures.some(item => item.kind === 'monitor-bank'));
  assert.ok(plan.interiorFixtures.some(item => item.kind === 'workbench'));
  assert.ok(new Set(plan.plantStructures.map(item => item.x)).size > 10, 'plant structures need distinct world positions');
});

test('Atomgrad refuses to build without real engine adapter methods', () => {
  const plan = createAtomgradPlan(2, { x: 0, y: 0, width: 3000, height: 900 });
  assert.throws(() => buildAtomgrad(plan, {}), /generateCityChunk/);
});

test('Atomgrad delegates city generation, destructible structures and radiation to adapter', () => {
  const calls = [];
  const engine = {
    generateCityChunk(options) { calls.push(['city', options]); return { houses: 40 }; },
    spawnStructure(options) { calls.push(['structure', options.id]); return { id: options.id, destructible: options.destructible }; },
    registerRadiationZone(options) { calls.push(['radiation', options]); },
    setPowerSource(options) { calls.push(['power', options]); }
  };
  const plan = createAtomgradPlan(7, { x: 0, y: 0, width: 4000, height: 1000 });
  const result = buildAtomgrad(plan, engine);
  assert.equal(result.city.houses, 40);
  assert.equal(result.plantObjects.length, ATOMGRAD_PLANT_LAYOUT.length);
  assert.ok(calls.some(([kind]) => kind === 'radiation'));
  assert.ok(calls.some(([kind]) => kind === 'power'));
  assert.ok(result.plantObjects.length > ATOMGRAD_PLANT_LAYOUT.length, 'interior fixtures must also be destructible game objects');
  assert.ok(calls.some(([kind, id]) => kind === 'structure' && id === 'control-screens'));
});

test('radiation shielding materials are declared and reactor accident advances only on damage events', () => {
  assert.ok(ATOMGRAD_MATERIALS.leadShield.radiationShield > ATOMGRAD_MATERIALS.structuralSteel.radiationShield);
  const stages = [];
  const accident = new ReactorAccident(stage => stages.push(stage));
  assert.equal(accident.stage, 'stable');
  assert.equal(accident.triggerCatastrophe(), 'stable');
  accident.damageCooling();
  assert.equal(accident.stage, 'warning');
  accident.exposeCore();
  assert.equal(accident.stage, 'critical');
  assert.equal(accident.triggerCatastrophe(), 'catastrophe');
  assert.deepEqual(stages, ['warning', 'critical', 'catastrophe']);
});
