/**
 * Wreckbox — Possession / resident interaction integration layer
 *
 * IMPORTANT: the game's main runtime in index.html is packed/obfuscated.
 * This module intentionally does not patch resident AI internals. It connects
 * through window.wreckboxModAPI when a compatible bridge is exposed by the game.
 *
 * Bridge contract (all methods except the first group are optional):
 * {
 *   canvas, camera, scene, THREE,
 *   getNPCs(): [{object, pauseAI(), resumeAI(), ...}],
 *   getInteractables(): [{object, kind:'door'|'seat'|'work'|'prop', ...}],
 *   setCameraTarget(object|null), setElementalHUDVisible(boolean),
 *   registerElemental({id,label,icon,onActivate}) -> unregister?,
 *   isGrounded(npc), isFalling(npc), moveCharacter(npc, displacement),
 *   setCharacterVelocity(npc, velocity), setCharacterPhysics(npc, enabled),
 *   setCharacterCollision(npc, enabled), setNoclip(npc, enabled),
 *   findGround(npc), playAnimation(npc, name), stopAnimation(npc),
 *   interact(npc, item), teleportThroughDoor(npc, fromDoor, toDoor),
 *   createOutline(object, color) -> {dispose()}, setCollisionDamageScale(npc, scale),
 *   setCameraInputEnabled(boolean), getCameraInputEnabled()
 * }
 */
(() => {
  'use strict';
  if (window.__wreckboxPossessNPC) return;
  window.__wreckboxPossessNPC = true;

  const S = {
    api: null, target: null, keys: new Set(), mode: 'possess',
    noclip: false, verticalVelocity: 0, lastTime: 0, lastGroundY: null,
    selectedDoor: null, hovered: null, hoverOutline: null, doorOutlines: [],
    interaction: null, unregisterElement: null,
    speed: 4.8, runSpeed: 8.0, jumpSpeed: 6.5, gravity: 19,
    interactables: [], pointer: null, disposed: false
  };
  const THREE = () => S.api?.THREE || window.THREE || null;

  function apiReady() {
    const a = window.wreckboxModAPI;
    if (!a?.canvas || !a?.camera || !a?.scene ||
        typeof a.getNPCs !== 'function' || typeof a.setCameraTarget !== 'function') return false;
    S.api = a;
    registerElement();
    return true;
  }
  function registerElement() {
    if (S.unregisterElement || typeof S.api?.registerElemental !== 'function') return;
    // The game owns placement and styling: this is an elemental slot, not an overlay.
    const result = S.api.registerElemental({
      id: 'possession', label: 'Вселяние', icon: '◉',
      onActivate: () => { S.mode = S.mode === 'possess' ? 'interact' : 'possess'; }
    });
    if (typeof result === 'function') S.unregisterElement = result;
  }
  function allNPCs() { try { return S.api?.getNPCs?.() || []; } catch { return []; } }
  function allItems() {
    try {
      const items = S.api?.getInteractables?.() || [];
      return items.filter(x => x?.object && ['door','seat','work','prop'].includes(x.kind));
    } catch { return []; }
  }
  function rootMatch(object, list) {
    let o = object;
    while (o) {
      const found = list.find(x => x.object === o);
      if (found) return found;
      o = o.parent;
    }
    return null;
  }
  function raycast(event, objects) {
    const T = THREE();
    if (!T?.Raycaster || !T?.Vector2 || !objects.length) return null;
    const rect = S.api.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const p = new T.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray = new T.Raycaster();
    ray.setFromCamera(p, S.api.camera);
    const hits = ray.intersectObjects(objects.map(x => x.object), true);
    return hits.length ? rootMatch(hits[0].object, objects) : null;
  }
  function outline(item, color) {
    try {
      if (typeof S.api?.createOutline === 'function') return S.api.createOutline(item.object, color);
    } catch (e) { console.warn('[Possession] outline failed', e); }
    // Fallback: non-destructive emissive tint on meshes, with original material values restored.
    const saved = [];
    item.object.traverse?.(o => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m.color) continue;
        saved.push({m, color: m.color.clone(), emissive: m.emissive?.clone?.(), intensity: m.emissiveIntensity});
        try { m.emissive?.set?.(color); m.emissiveIntensity = 0.45; } catch {}
      }
    });
    return { dispose() { for (const x of saved) {
      try { x.m.color.copy(x.color); if (x.emissive) x.m.emissive.copy(x.emissive); x.m.emissiveIntensity = x.intensity; } catch {}
    } } };
  }
  function clearHover() {
    try { S.hoverOutline?.dispose?.(); } catch {}
    S.hoverOutline = null; S.hovered = null;
  }
  function clearDoorPair() {
    for (const o of S.doorOutlines) try { o?.dispose?.(); } catch {}
    S.doorOutlines = []; S.selectedDoor = null;
  }
  function fadeOutline(outlineObject) {
    if (!outlineObject) return;
    // Native bridge outlines may animate their own fade-out.
    try {
      if (typeof outlineObject.fadeOut === 'function') outlineObject.fadeOut(220);
      else outlineObject.dispose?.();
    } catch {}
  }
  function possess(npc) {
    if (!npc?.object) return;
    release();
    S.target = npc; S.verticalVelocity = 0; S.lastGroundY = null;
    try { npc.pauseAI?.(); } catch (e) { console.warn('[Possession] pause AI failed', e); }
    try { S.api.setCameraTarget(npc.object); } catch {}
    try { S.api.setElementalHUDVisible?.(false); } catch {}
  }
  function release() {
    if (!S.target) return;
    const old = S.target;
    try { if (S.noclip) toggleNoclip(false); } catch {}
    try { S.api?.stopAnimation?.(old); } catch {}
    S.target = null; S.keys.clear(); S.verticalVelocity = 0; S.noclip = false;
    try { S.api?.setCameraTarget?.(null); } catch {}
    try { S.api?.setElementalHUDVisible?.(true); } catch {}
    try { old.resumeAI?.(); } catch (e) { console.warn('[Possession] resume AI failed', e); }
    clearHover(); clearDoorPair();
  }
  function toggleNoclip(force) {
    if (!S.target) return;
    S.noclip = typeof force === 'boolean' ? force : !S.noclip;
    const enabled = S.noclip;
    // Explicitly disable BOTH physics and collision while noclip is active.
    try { S.api?.setNoclip?.(S.target, enabled); } catch {}
    try { S.api?.setCharacterPhysics?.(S.target, !enabled); } catch {}
    try { S.api?.setCharacterCollision?.(S.target, !enabled); } catch {}
    S.verticalVelocity = 0;
  }
  function interact(item) {
    if (!S.target || !item) return;
    if (item.kind === 'door' && S.mode === 'door-link') {
      if (!S.selectedDoor) {
        S.selectedDoor = item;
        S.doorOutlines.push(outline(item, 0x258dff));
        return;
      }
      if (S.selectedDoor === item) { clearDoorPair(); return; }
      const first = S.selectedDoor;
      S.doorOutlines.push(outline(item, 0x258dff));
      try { S.api?.linkDoors?.(first, item); } catch {}
      // Store a pair for crossing detection. Clear highlights after crossing.
      S.doorPair = [first, item];
      return;
    }
    if (item.kind === 'door') {
      try { S.api?.interact?.(S.target, item); } catch {}
      fadeOutline(S.hoverOutline); S.hoverOutline = null; S.hovered = null;
      return;
    }
    // The game's native interaction owns the actual animation and prop logic.
    try {
      if (typeof S.api?.interact === 'function') S.api.interact(S.target, item);
      else if (item.kind === 'seat') S.api?.playAnimation?.(S.target, item.animation || 'sit');
      else if (item.kind === 'work') S.api?.playAnimation?.(S.target, item.animation || 'work');
    } catch (e) { console.warn('[Possession] interaction failed', e); }
    fadeOutline(S.hoverOutline); S.hoverOutline = null; S.hovered = null;
  }
  function interactNearestSeatOrWork() {
    if (!S.target) return;
    const T = THREE();
    if (!T?.Vector3) return;
    const pos = S.target.object.getWorldPosition(new T.Vector3());
    let best = null, bestD = Infinity;
    for (const item of allItems()) {
      if (!['seat','work','prop'].includes(item.kind)) continue;
      try {
        const p = item.object.getWorldPosition(new T.Vector3());
        const d = pos.distanceTo(p);
        if (d < (item.useDistance || 2.0) && d < bestD) { best = item; bestD = d; }
      } catch {}
    }
    if (best) interact(best);
  }
  function handlePointerMove(e) {
    if (!S.target || S.noclip) return;
    const item = raycast(e, allItems());
    if (item === S.hovered) return;
    clearHover();
    if (item) { S.hovered = item; S.hoverOutline = outline(item, 0xff463d); }
  }
  function handlePointerDown(e) {
    if (!S.api || e.button !== 0 || e.target !== S.api.canvas) return;
    if (!S.target) {
      const npc = raycast(e, allNPCs());
      if (npc) { e.preventDefault(); e.stopImmediatePropagation(); possess(npc); }
      return;
    }
    const item = raycast(e, allItems());
    if (item) { e.preventDefault(); e.stopImmediatePropagation(); interact(item); }
  }
  function onKeyDown(e) {
    if (!S.target) return;
    const movementKeys = ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
    if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','Escape','KeyN','KeyE','KeyQ'].includes(e.code)) {
      e.preventDefault(); e.stopPropagation();
    }
    S.keys.add(e.code);
    if (e.code === 'Escape') release();
    if (e.code === 'KeyN') toggleNoclip();
    if (e.code === 'KeyE' && S.hovered) interact(S.hovered);
    if (e.code === 'KeyF') interactNearestSeatOrWork();
    if (e.code === 'KeyQ') {
      S.mode = S.mode === 'door-link' ? 'interact' : 'door-link';
      clearDoorPair();
    }
  }
  function onKeyUp(e) { S.keys.delete(e.code); }
  function isFalling() {
    try {
      if (typeof S.api?.isFalling === 'function') return !!S.api.isFalling(S.target);
      const grounded = typeof S.api?.isGrounded === 'function' ? !!S.api.isGrounded(S.target) : null;
      return grounded === false && S.verticalVelocity < -0.15;
    } catch { return S.verticalVelocity < -0.15; }
  }
  function moveObject(displacement) {
    if (typeof S.api?.moveCharacter === 'function') {
      S.api.moveCharacter(S.target, displacement); return;
    }
    S.target.object.position.add(displacement);
  }
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = S.lastTime ? Math.min((now - S.lastTime) / 1000, 0.04) : 0;
    S.lastTime = now;
    if (!S.target || !S.api || dt <= 0) return;
    const T = THREE(); if (!T?.Vector3) return;
    const obj = S.target.object;
    const forward = new T.Vector3(); S.api.camera.getWorldDirection(forward); forward.y = 0;
    if (forward.lengthSq()) forward.normalize();
    const right = new T.Vector3(-forward.z, 0, forward.x);
    const move = new T.Vector3();
    if (S.keys.has('KeyW') || S.keys.has('ArrowUp')) move.add(forward);
    if (S.keys.has('KeyS') || S.keys.has('ArrowDown')) move.sub(forward);
    if (S.keys.has('KeyD') || S.keys.has('ArrowRight')) move.add(right);
    if (S.keys.has('KeyA') || S.keys.has('ArrowLeft')) move.sub(right);

    if (S.noclip) {
      const fly = new T.Vector3();
      if (S.keys.has('KeyW')) fly.add(forward);
      if (S.keys.has('KeyS')) fly.sub(forward);
      if (S.keys.has('KeyD')) fly.add(right);
      if (S.keys.has('KeyA')) fly.sub(right);
      if (S.keys.has('Space')) fly.y += 1;
      if (S.keys.has('ShiftLeft') || S.keys.has('ShiftRight')) fly.y -= 1;
      if (fly.lengthSq()) moveObject(fly.normalize().multiplyScalar((S.keys.has('ShiftLeft') ? S.runSpeed : S.speed) * dt));
      return;
    }

    if (move.lengthSq()) {
      move.normalize().multiplyScalar((S.keys.has('ShiftLeft') || S.keys.has('ShiftRight') ? S.runSpeed : S.speed) * dt);
      moveObject(move);
      // Face the actual movement direction, not the camera's original heading.
      obj.rotation.y = Math.atan2(move.x, move.z);
    }

    const grounded = (() => {
      try {
        if (typeof S.api.isGrounded === 'function') return !!S.api.isGrounded(S.target);
        if (typeof S.api.findGround === 'function') {
          const ground = S.api.findGround(S.target);
          if (typeof ground === 'boolean') return ground;
          if (typeof ground === 'number') return obj.position.y <= ground + 0.08;
          if (ground && typeof ground.y === 'number') return obj.position.y <= ground.y + 0.08;
        }
      } catch {}
      return false;
    })();
    if (S.keys.has('Space') && grounded) { S.verticalVelocity = S.jumpSpeed; S.keys.delete('Space'); }
    if (!grounded || S.verticalVelocity > 0) S.verticalVelocity -= S.gravity * dt;
    if (grounded && S.verticalVelocity < 0) S.verticalVelocity = 0;
    const dy = S.verticalVelocity * dt;
    if (typeof S.api.setCharacterVelocity === 'function') {
      try { S.api.setCharacterVelocity(S.target, new T.Vector3(0, S.verticalVelocity, 0)); } catch {}
    } else if (typeof S.api.moveCharacter === 'function') {
      try { S.api.moveCharacter(S.target, new T.Vector3(0, dy, 0)); } catch {}
    } else {
      obj.position.y += dy;
    }

    // Crossing a linked door clears both blue highlights.
    if (S.doorPair?.length === 2) {
      const [a, b] = S.doorPair;
      const near = item => {
        try { return obj.position.distanceTo(item.object.getWorldPosition(new T.Vector3())) < (item.radius || 1.4); } catch { return false; }
      };
      if (near(a) || near(b)) {
        try { S.api.teleportThroughDoor?.(S.target, a, b); } catch {}
        clearDoorPair();
      }
    }
  }
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keyup', onKeyUp, true);
  document.addEventListener('pointermove', handlePointerMove, true);
  document.addEventListener('pointerdown', handlePointerDown, true);
  window.addEventListener('blur', () => S.keys.clear());
  const poll = setInterval(() => { if (apiReady()) clearInterval(poll); }, 400);
  requestAnimationFrame(tick);
})();
