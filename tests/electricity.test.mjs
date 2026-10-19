import test from 'node:test';
import assert from 'node:assert/strict';
import { ElectricityNetwork } from '../src/electricity.js';

test('a transformer hut powers its district until the hut is destroyed', () => {
  const grid = new ElectricityNetwork();
  grid.addNode({ id: 'generator', kind: 'source', x: 0, y: 0 });
  grid.addNode({ id: 'hut', kind: 'transformer', x: 10, y: 0 });
  grid.addNode({ id: 'house-a', kind: 'consumer', x: 20, y: 0 });
  grid.addNode({ id: 'house-b', kind: 'consumer', x: 21, y: 0 });
  grid.addEdge('generator', 'hut');
  grid.addEdge('hut', 'house-a');
  grid.addEdge('hut', 'house-b');
  grid.recomputePower();
  assert.equal(grid.isPowered('house-a'), true);
  assert.equal(grid.isPowered('house-b'), true);
  grid.destroyNode('hut');
  assert.equal(grid.isPowered('house-a'), false);
  assert.equal(grid.isPowered('house-b'), false);
});

test('breaking a feeder disconnects only consumers downstream of that edge', () => {
  const grid = new ElectricityNetwork();
  for (const node of [
    { id: 'source', kind: 'source', x: 0, y: 0 },
    { id: 'district-a', kind: 'transformer', x: 1, y: 0 },
    { id: 'district-b', kind: 'transformer', x: 2, y: 0 },
    { id: 'home-a', kind: 'consumer', x: 3, y: 0 },
    { id: 'home-b', kind: 'consumer', x: 4, y: 0 }
  ]) grid.addNode(node);
  grid.addEdge('source', 'district-a', { id: 'feeder-a' });
  grid.addEdge('source', 'district-b', { id: 'feeder-b' });
  grid.addEdge('district-a', 'home-a');
  grid.addEdge('district-b', 'home-b');
  grid.recomputePower();
  grid.destroyEdge('feeder-a');
  assert.equal(grid.isPowered('home-a'), false);
  assert.equal(grid.isPowered('home-b'), true);
});

test('home grouping uses generated house objects, not hard-coded coordinates', () => {
  const homes = Array.from({ length: 11 }, (_, i) => ({ id: 'h' + i, x: i * 7, y: 0 }));
  const groups = ElectricityNetwork.groupHomes(homes, 4);
  assert.equal(groups.flat().length, homes.length);
  assert.equal(new Set(groups.flat().map(h => h.id)).size, homes.length);
  assert.ok(groups.every(group => group.length >= 1 && group.length <= 4));
});
