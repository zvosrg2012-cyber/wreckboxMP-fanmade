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
  { id: 'reactor', kind: 'reactor-building', side: 'right', scale: 'huge', destructible: true, shielding: 'reactorConcrete' },
  { id: 'reactor-core', kind: 'reactor-core', parent: 'reactor', destructible: true, critical: true },
  { id: 'turbine-hall', kind: 'machine-hall', side: 'right', scale: 'huge', destructible: true },
  { id: 'generator', kind: 'generator', parent: 'turbine-hall', destructible: true, powerSource: true },
  { id: 'cooling-loop', kind: 'cooling-system', destructible: true },
  { id: 'striped-stack', kind: 'striped-stack', side: 'right', scale: 'tall', destructible: true },
  { id: 'cooling-tower-1', kind: 'cooling-tower', side: 'right', scale: 'huge', destructible: true, steam: true },
  { id: 'cooling-tower-2', kind: 'cooling-tower', side: 'right', scale: 'huge', destructible: true, steam: true },
  { id: 'plant-substation', kind: 'substation', side: 'between-city-and-plant', destructible: true },
  { id: 'transmission-line', kind: 'transmission-line', side: 'between-city-and-plant', destructible: true }
]);

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
    plantStructures: ATOMGRAD_PLANT_LAYOUT.map(item => ({ ...item })),
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
    x: plan.regions.plant.x,
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
