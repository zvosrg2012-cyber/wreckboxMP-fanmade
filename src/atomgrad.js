/**
 * Atomgrad is a separate map. Ordinary maps only use electricity.js;
 * they must not spawn any nuclear station structures.
 *
 * Engine adapter contract: generateCityChunk() must use the game's existing
 * procedural house generator, spawnStructure() must create destructible parts,
 * and registerRadiationZone()/setPowerSource() connect to real engine systems.
 */

export const ATOMGRAD_MAP_ID = 'atomgrad';

export const ATOMGRAD_MATERIALS = Object.freeze({
  reactorConcrete: { label: 'Защитный бетон', density: 3.2, category: 'building', radiationShield: 0.7 },
  structuralSteel: { label: 'Конструкционная сталь', density: 7.8, category: 'building', radiationShield: 0.15 },
  leadShield: { label: 'Свинцовая защита', density: 11.3, category: 'shield', radiationShield: 0.95 },
  radioactiveDebris: { label: 'Радиоактивные обломки', density: 4.0, category: 'hazard', radioactive: true },
  sealedShield: { label: 'Герметичная защитная панель', density: 5.0, category: 'shield', radiationShield: 0.9, requiresClosedShell: true },
  insulatedPipe: { label: 'Изолированная труба', density: 2.2, category: 'industrial' },
  cableInsulator: { label: 'Изолятор', density: 1.8, category: 'electrical' }
});

export const ATOMGRAD_PLANT_LAYOUT = Object.freeze([
  { id: 'reactor', kind: 'reactor-building', x: 0.56, y: 0.62, width: 0.19, height: 0.25, destructible: true, shielding: 'reactorConcrete' },
  { id: 'reactor-core', kind: 'reactor-core', parent: 'reactor', x: 0.65, y: 0.68, width: 0.045, height: 0.09, destructible: true, critical: true },
  { id: 'turbine-hall', kind: 'machine-hall', x: 0.12, y: 0.68, width: 0.31, height: 0.22, destructible: true },
  { id: 'generator', kind: 'generator', parent: 'turbine-hall', x: 0.29, y: 0.76, width: 0.07, height: 0.08, destructible: true, powerSource: true },
  { id: 'cooling-pumps', kind: 'cooling-pumps', x: 0.44, y: 0.79, width: 0.08, height: 0.09, destructible: true },
  { id: 'cooling-pipe-main', kind: 'cooling-pipe', x: 0.46, y: 0.87, width: 0.25, height: 0.025, destructible: true, fluidSystem: 'cooling' },
  { id: 'cooling-loop', kind: 'cooling-system', x: 0.48, y: 0.92, width: 0.21, height: 0.025, destructible: true, fluidSystem: 'cooling' },
  { id: 'striped-stack', kind: 'striped-stack', x: 0.41, y: 0.28, width: 0.035, height: 0.55, destructible: true },
  { id: 'cooling-tower-1', kind: 'cooling-tower', x: 0.79, y: 0.55, width: 0.12, height: 0.34, destructible: true, steam: true },
  { id: 'cooling-tower-2', kind: 'cooling-tower', x: 0.89, y: 0.57, width: 0.09, height: 0.32, destructible: true, steam: true },
  { id: 'plant-substation', kind: 'substation', x: 0.08, y: 0.82, width: 0.11, height: 0.12, destructible: true },
  { id: 'switchyard', kind: 'switchyard', x: 0.21, y: 0.49, width: 0.16, height: 0.08, destructible: true },
  { id: 'transmission-pole-1', kind: 'transmission-pole', x: 0.01, y: 0.45, width: 0.025, height: 0.36, destructible: true },
  { id: 'transmission-pole-2', kind: 'transmission-pole', x: 0.29, y: 0.43, width: 0.025, height: 0.38, destructible: true },
  { id: 'transmission-pole-3', kind: 'transmission-pole', x: 0.51, y: 0.44, width: 0.025, height: 0.37, destructible: true },
  { id: 'control-building', kind: 'control-building', x: 0.74, y: 0.78, width: 0.09, height: 0.12, destructible: true },
  { id: 'service-building', kind: 'service-building', x: 0.84, y: 0.82, width: 0.08, height: 0.1, destructible: true },
  { id: 'perimeter-fence-west', kind: 'fence-segment', x: 0.015, y: 0.34, width: 0.015, height: 0.55, destructible: true },
  { id: 'perimeter-fence-north', kind: 'fence-segment', x: 0.02, y: 0.33, width: 0.96, height: 0.015, destructible: true },
  { id: 'perimeter-fence-east', kind: 'fence-segment', x: 0.975, y: 0.34, width: 0.015, height: 0.55, destructible: true },
  { id: 'perimeter-fence-south', kind: 'fence-segment', x: 0.02, y: 0.89, width: 0.96, height: 0.015, destructible: true }
].map(item => Object.freeze(item)));

export function createAtomgradPlan(seed, worldBounds, options = {}) {
  if (!Number.isInteger(seed)) throw new TypeError('Atomgrad needs a deterministic integer seed');
  if (!worldBounds || !Number.isFinite(worldBounds.width) || worldBounds.width < 100) {
    throw new TypeError('Atomgrad needs valid world bounds');
  }
  const cityWidth = Math.floor(worldBounds.width * 0.62);
  const plantWidth = worldBounds.width - cityWidth;
  return {
    id: ATOMGRAD_MAP_ID,
    seed,
    bounds: { ...worldBounds },
    regions: {
      city: { x: worldBounds.x || 0, width: cityWidth, generator: 'existing-procedural-city', reuseExistingCityGenerator: true },
      plant: { x: (worldBounds.x || 0) + cityWidth, width: plantWidth, generator: 'atomgrad-industrial-layout' }
    },
    plantStructures: ATOMGRAD_PLANT_LAYOUT.map(item => ({ ...item, x: (worldBounds.x || 0) + cityWidth + item.x * plantWidth, y: (worldBounds.y || 0) + item.y * worldBounds.height, width: item.width * plantWidth, height: item.height * worldBounds.height })),
    cityOptions: { ...(options.cityOptions || {}) },
    rules: {
      ordinaryMapsSpawnPlant: false,
      plantOnlyOnAtomgrad: true,
      electricityGraphVisible: false,
      homesMustComeFromActualCityGeneration: true,
      transformerHomesMin: 2,
      transformerHomesMax: 4
    }
  };
}

/**
 * Engine-facing orchestration, with all engine calls injected explicitly.
 * This avoids pretending to know unavailable game APIs. The host must provide
 * the real destructible physics, map generation, lights and radiation systems.
 */
export function buildAtomgrad(plan, engine) {
  const required = ['generateCityChunk', 'spawnStructure', 'registerRadiationZone', 'setPowerSource'];
  for (const name of required) {
    if (typeof engine?.[name] !== 'function') throw new Error('Engine adapter missing method: ' + name);
  }
  const city = engine.generateCityChunk({ ...plan.regions.city, seed: plan.seed, options: plan.cityOptions });
  const plantObjects = plan.plantStructures.map(structure => engine.spawnStructure({
    ...structure,
    region: plan.regions.plant,
    destructible: true
  }));
  engine.setPowerSource({ id: 'atomgrad-generator', active: true, objects: plantObjects });
  engine.registerRadiationZone({ id: 'atomgrad-reactor-zone', sourceId: 'reactor-core', enabled: false, radius: 0 });
  return { city, plantObjects, plan };
}

/** Simple staged fictional accident state machine, driven by game damage events. */
export class ReactorAccident {
  constructor(onStage = () => {}) {
    this.stage = 'stable';
    this.coolingDamaged = false;
    this.coreExposed = false;
    this.onStage = onStage;
  }
  damageCooling() {
    this.coolingDamaged = true;
    this.advance(this.coreExposed ? 'critical' : 'warning');
  }
  exposeCore() {
    this.coreExposed = true;
    this.advance(this.coolingDamaged ? 'critical' : 'containment-breach');
  }
  advance(next) {
    const rank = ['stable', 'warning', 'containment-breach', 'critical', 'catastrophe'];
    if (rank.indexOf(next) > rank.indexOf(this.stage)) {
      this.stage = next;
      this.onStage(next);
    }
  }
  triggerCatastrophe() {
    if (this.coreExposed && this.coolingDamaged) this.advance('catastrophe');
    return this.stage;
  }
}
