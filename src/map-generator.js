import { createAtomgradPlan, buildAtomgrad, ATOMGRAD_MAP_ID } from './atomgrad.js';
import { ElectricityNetwork } from './electricity.js';

/**
 * Shared map-generation entry point for the game runtime.
 * The runtime passes its existing city generator and physics-backed spawn
 * function; Atomgrad is the only map that adds the plant layout.
 */
export function generateSelectedWorld({ mapId = 'default', seed, worldBounds, runtime, options = {} }) {
  if (!runtime || typeof runtime.generateCityChunk !== 'function') {
    throw new TypeError('Runtime adapter must provide the existing generateCityChunk()');
  }
  if (mapId !== ATOMGRAD_MAP_ID) {
    return {
      mapId: 'default',
      electricity: new ElectricityNetwork(),
      city: runtime.generateCityChunk({ ...worldBounds, seed, options }),
      atomgrad: null
    };
  }
  const required = ['spawnStructure', 'registerRadiationZone', 'setPowerSource'];
  for (const name of required) {
    if (typeof runtime[name] !== 'function') {
      throw new TypeError('Runtime adapter must provide physics-backed ' + name + '()');
    }
  }
  const plan = createAtomgradPlan(seed, worldBounds, options);
  const atomgrad = buildAtomgrad(plan, runtime);
  return { mapId: ATOMGRAD_MAP_ID, electricity: new ElectricityNetwork(), city: atomgrad.city, atomgrad };
}

/**
 * Call from the existing map-selection callback:
 * generateSelectedWorld({ mapId: selectedMapId, seed, worldBounds, runtime })
 */
export function bindMapSelection(selectMap, generateWorld) {
  if (typeof selectMap !== 'function' || typeof generateWorld !== 'function') {
    throw new TypeError('bindMapSelection needs the existing selection and generation callbacks');
  }
  return function onSelectedMap({ mapId, seed, worldBounds, runtime, options }) {
    selectMap(mapId);
    const world = generateSelectedWorld({ mapId, seed, worldBounds, runtime, options });
    generateWorld(world);
    return world;
  };
}
