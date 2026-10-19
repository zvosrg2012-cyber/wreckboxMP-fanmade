/** Fan update 1.8 module entry point.
 *
 * Import ElectricityNetwork from this module for ordinary generated maps.
 * Import createAtomgradPlan/buildAtomgrad only when the selected map ID is
 * `atomgrad`. This separation prevents nuclear-plant structures from spawning
 * on other maps. The original extracted 1.7 runtime is packed and does not yet
 * expose an import point, so this module must be wired into a recovered engine
 * source before it can affect the shipped game.
 */

export { ElectricityNetwork } from './electricity.js';
export { MAP_DEFINITIONS, getMapDefinition, resolveMapSelection, createSelectedMap } from './map-registry.js';
export {
  ATOMGRAD_MAP_ID,
  ATOMGRAD_MATERIALS,
  ATOMGRAD_PLANT_LAYOUT,
  createAtomgradPlan,
  buildAtomgrad,
  ReactorAccident
} from './atomgrad.js';

export function createUpdate18Systems({ mapId, seed, worldBounds, engine }) {
  const electricity = new (requireElectricityNetwork())();
  if (mapId !== 'atomgrad') {
    return { mapId, electricity, atomgrad: null };
  }
  const { createAtomgradPlan, buildAtomgrad } = requireAtomgradApi();
  const plan = createAtomgradPlan(seed, worldBounds);
  const atomgrad = buildAtomgrad(plan, engine);
  return { mapId, electricity, atomgrad };
}

// Static ESM imports are intentionally used for exports above. The factory is
// provided in a separate adapter-friendly form to avoid assuming engine APIs.
import { ElectricityNetwork as Network } from './electricity.js';
import { createAtomgradPlan as makePlan, buildAtomgrad as buildMap } from './atomgrad.js';
function requireElectricityNetwork() { return Network; }
function requireAtomgradApi() { return { createAtomgradPlan: makePlan, buildAtomgrad: buildMap }; }

export { generateSelectedWorld, bindMapSelection } from './map-generator.js';
