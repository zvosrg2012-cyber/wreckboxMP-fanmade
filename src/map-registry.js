/**
 * Update 1.8 map registry.
 *
 * This registry keeps Atomgrad opt-in: callers must select its ID explicitly.
 * It deliberately does not invent APIs for the packed 1.7 runtime. The game
 * menu/runtime must call getMapDefinition() and the selected definition's
 * create() adapter to make this registry live in the shipped game.
 */
import {
  ATOMGRAD_MAP_ID,
  createAtomgradPlan,
  buildAtomgrad
} from './atomgrad.js';

export const MAP_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'default',
    label: 'Обычная карта',
    kind: 'procedural-city',
    nuclearPlant: false,
    create: null
  }),
  Object.freeze({
    id: ATOMGRAD_MAP_ID,
    label: 'Атомград',
    kind: 'city-and-nuclear-plant',
    nuclearPlant: true,
    create({ seed, worldBounds, engine, options = {} }) {
      const plan = createAtomgradPlan(seed, worldBounds, options);
      return buildAtomgrad(plan, engine);
    }
  })
]);

export function getMapDefinition(mapId) {
  return MAP_DEFINITIONS.find(map => map.id === mapId) ?? null;
}

/** Resolve an unknown/empty selection safely without ever leaking the plant. */
export function resolveMapSelection(mapId) {
  const definition = getMapDefinition(mapId) ?? getMapDefinition('default');
  return Object.freeze({
    id: definition.id,
    label: definition.label,
    kind: definition.kind,
    nuclearPlant: definition.nuclearPlant
  });
}

/** Create only the explicitly selected special map; ordinary maps stay clean. */
export function createSelectedMap(mapId, context) {
  const definition = getMapDefinition(mapId);
  if (!definition) throw new Error('Unknown map ID: ' + mapId);
  if (!definition.create) return { mapId: definition.id, atomgrad: null };
  return { mapId: definition.id, atomgrad: definition.create(context) };
}
