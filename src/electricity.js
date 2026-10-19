/**
 * Fan update 1.8: engine-independent hidden electricity graph.
 * Does not draw wires or debug lines. Integrate with the real engine API.
 */

const finite = Number.isFinite;

export class ElectricityNetwork {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.adjacency = new Map();
    this.powered = new Set();
    this.nextEdge = 1;
  }

  addNode(node) {
    if (!node || node.id == null || this.nodes.has(node.id)) throw new Error('Node needs a unique id');
    if (!finite(node.x) || !finite(node.y)) throw new Error('Node needs finite world coordinates');
    const value = { kind: 'consumer', active: true, destroyed: false, ...node };
    this.nodes.set(value.id, value);
    this.adjacency.set(value.id, new Set());
    return value;
  }

  addEdge(from, to, metadata = {}) {
    if (from === to || !this.nodes.has(from) || !this.nodes.has(to)) throw new Error('Invalid edge endpoints');
    const id = metadata.id ?? `wire-${this.nextEdge++}`;
    if (this.edges.has(id)) throw new Error('Duplicate edge id');
    const edge = { id, from, to, destroyed: false, ...metadata };
    this.edges.set(id, edge);
    this.adjacency.get(from).add(id);
    this.adjacency.get(to).add(id);
    return edge;
  }

  destroyNode(id) {
    const node = this.nodes.get(id);
    if (!node || node.destroyed) return false;
    node.destroyed = true;
    this.recomputePower();
    return true;
  }

  destroyEdge(id) {
    const edge = this.edges.get(id);
    if (!edge || edge.destroyed) return false;
    edge.destroyed = true;
    this.recomputePower();
    return true;
  }

  setSourceActive(id, active) {
    const node = this.nodes.get(id);
    if (!node || node.kind !== 'source' || node.destroyed) return false;
    node.active = Boolean(active);
    this.recomputePower();
    return true;
  }

  recomputePower() {
    const reached = new Set();
    const queue = [];
    for (const node of this.nodes.values()) {
      if (node.kind === 'source' && node.active && !node.destroyed) {
        reached.add(node.id);
        queue.push(node.id);
      }
    }
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      for (const edgeId of this.adjacency.get(id) || []) {
        const edge = this.edges.get(edgeId);
        if (!edge || edge.destroyed) continue;
        const otherId = edge.from === id ? edge.to : edge.from;
        const other = this.nodes.get(otherId);
        if (!other || other.destroyed || !other.active || reached.has(otherId)) continue;
        reached.add(otherId);
        queue.push(otherId);
      }
    }
    this.powered = reached;
    return new Set(reached);
  }

  isPowered(id) { return this.powered.has(id); }

  getConsumerStates() {
    return [...this.nodes.values()]
      .filter(node => node.kind === 'consumer')
      .map(node => ({ id: node.id, powered: this.isPowered(node.id) }));
  }

  /** Groups actual generated homes into districts of 2-4 homes. */
  static groupHomes(homes, requestedMax = 4) {
    const max = Math.max(2, Math.min(4, Math.floor(requestedMax) || 4));
    const remaining = (homes || []).filter(h => h && h.id != null && finite(h.x) && finite(h.y));
    const groups = [];
    while (remaining.length) {
      const seed = remaining.shift();
      const group = [seed];
      while (group.length < max && remaining.length) {
        let best = 0;
        let bestDistance = Infinity;
        for (let i = 0; i < remaining.length; i++) {
          const dx = seed.x - remaining[i].x;
          const dy = seed.y - remaining[i].y;
          const distance = dx * dx + dy * dy;
          if (distance < bestDistance) { best = i; bestDistance = distance; }
        }
        group.push(remaining.splice(best, 1)[0]);
      }
      groups.push(group);
    }
    return groups;
  }

  /** Call with the game's collision/terrain test; never guess placement validity. */
  static findTransformerSite(group, isPlacementClear, radius = 24, attempts = 16) {
    if (!group?.length || typeof isPlacementClear !== 'function') return null;
    const center = group.reduce((p, h) => ({ x: p.x + h.x / group.length, y: p.y + h.y / group.length }), { x: 0, y: 0 });
    for (let i = 0; i < attempts; i++) {
      const angle = 2 * Math.PI * i / attempts;
      const point = { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
      if (isPlacementClear(point, group)) return point;
    }
    return null;
  }
}
