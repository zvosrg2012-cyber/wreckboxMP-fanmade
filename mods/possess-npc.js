/**
 * Wreckbox — possession and resident interactions.
 *
 * This module deliberately leaves resident physics/collision and AI implementation
 * to the game's native runtime. There is no noclip and no direct position fallback.
 * It requires a game bridge at window.wreckboxModAPI; see mods/README.md.
 */
(() => {
  'use strict';
  if (window.__wreckboxPossessNPC) return;
  window.__wreckboxPossessNPC = true;

  const S = {
    api: null, target: null, keys: new Set(), mode: 'interact',
    lastTime: 0, selectedDoor: null, doorPair: null, lastDoorTrigger: 0,
    hovered: null, hoverMarker: null, doorMarkers: [], unregisterElement: null,
    speed: 4.8, runSpeed: 8, jumpRequested: false
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
    const result = S.api.registerElemental({
      id: 'possession', label: 'Вселение', icon: '◉',
      onActivate: () => { S.mode = S.mode === 'possess' ? 'interact' : 'possess'; }
    });
    if (typeof result === 'function') S.unregisterElement = result;
  }
  function allNPCs() { try { return S.api?.getNPCs?.() || []; } catch { return []; } }
  function allItems() {
    try {
      return (S.api?.getInteractables?.() || []).filter(x =>
        x?.object && ['door', 'seat', 'work', 'prop'].includes(x.kind));
    } catch { return []; }
  }
  function rootMatch(object, list) {
    for (let o = object; o; o = o.parent) {
      const found = list.find(x => x.object === o);
      if (found) return found;
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

  // Small world-space ring marker instead of a full outline/tint. Its height is
  // derived from the actual object bounds, so door markers don't sit below doors.
  function makeMarker(item, color) {
    const T = THREE();
    if (!T?.Mesh || !T?.TorusGeometry || !T?.MeshBasicMaterial || !T?.Box3 || !T?.Vector3) {
      try { return S.api?.createOutline?.(item.object, color, { style: 'dot', radius: 0.16 }); } catch { return null; }
    }
    let marker;
    try {
      const bounds = new T.Box3().setFromObject(item.object);
      const center = bounds.getCenter(new T.Vector3());
      const height = Math.max(0.1, bounds.max.y - bounds.min.y);
      const radius = item.kind === 'door' ? 0.16 : 0.13;
      const geometry = new T.TorusGeometry(radius, 0.022, 8, 24);
      const material = new T.MeshBasicMaterial({
        color, transparent: true, opacity: 0.95, depthTest: false
      });
      marker = new T.Mesh(geometry, material);
      marker.position.copy(center);
      // Slightly above the object's vertical center to avoid the previous low marker.
      marker.position.y += Math.min(0.18, height * 0.08);
      marker.renderOrder = 999;
      marker.userData.wreckboxMarker = true;
      S.api.scene.add(marker);
      let disposed = false;
      const started = performance.now();
      return {
        object: marker,
        update(now) {
          if (disposed) return;
          const pulse = 1 + Math.sin((now - started) / 180) * 0.08;
          marker.scale.setScalar(pulse);
          material.opacity = 0.72 + (Math.sin((now - started) / 210) + 1) * 0.14;
        },
        fadeOut(duration = 180) {
          if (disposed) return;
          disposed = true;
          const start = performance.now();
          const step = now => {
            if (!marker) return;
            const t = Math.min(1, (now - start) / duration);
            material.opacity = 0.9 * (1 - t);
            marker.scale.setScalar(1 + t * 0.45);
            if (t < 1) requestAnimationFrame(step);
            else this.dispose();
          };
          requestAnimationFrame(step);
        },
        dispose() {
          if (marker) {
            S.api?.scene?.remove?.(marker);
            geometry.dispose(); material.dispose();
            marker = null;
          }
        }
      };
    } catch (e) {
      console.warn('[Possession] marker failed', e);
      try { return S.api?.createOutline?.(item.object, color, { style: 'dot', radius: 0.16 }); } catch { return null; }
    }
  }
  function clearHover(fade = false) {
    const old = S.hoverMarker;
    S.hoverMarker = null; S.hovered = null;
    try { fade ? old?.fadeOut?.(180) : old?.dispose?.(); } catch {}
  }
  function clearDoorPair(fade = true) {
    for (const m of S.doorMarkers) {
      try { fade ? m?.fadeOut?.(180) : m?.dispose?.(); } catch {}
    }
    S.doorMarkers = [];
    S.selectedDoor = null;
    S.doorPair = null;
  }
  function possess(npc) {
    if (!npc?.object) return;
    release();
    S.target = npc;
    try { npc.pauseAI?.(); } catch (e) { console.warn('[Possession] pause AI failed', e); }
    try { S.api.setCameraTarget(npc.object); } catch {}
    try { S.api.setElementalHUDVisible?.(false); } catch {}
  }
  function release() {
    if (!S.target) return;
    const old = S.target;
    try { S.api?.stopAnimation?.(old); } catch {}
    S.target = null; S.keys.clear(); S.jumpRequested = false;
    try { S.api?.setCameraTarget?.(null); } catch {}
    try { S.api?.setElementalHUDVisible?.(true); } catch {}
    try { old.resumeAI?.(); } catch (e) { console.warn('[Possession] resume AI failed', e); }
    clearHover(true); clearDoorPair(true);
  }
  function interact(item) {
    if (!S.target || !item) return;
    if (item.kind === 'door' && S.mode === 'door-link') {
      if (!S.selectedDoor) {
        S.selectedDoor = item;
        S.doorMarkers.push(makeMarker(item, 0x258dff));
        return;
      }
      if (S.selectedDoor === item) { clearDoorPair(); return; }
      const first = S.selectedDoor;
      S.doorMarkers.push(makeMarker(item, 0x258dff));
      S.doorPair = [first, item];
      try { S.api?.linkDoors?.(first, item); } catch (e) { console.warn('[Possession] link doors failed', e); }
      return;
    }
    try {
      if (typeof S.api?.interact === 'function') S.api.interact(S.target, item);
      else if (item.kind === 'seat') S.api?.playAnimation?.(S.target, item.animation || 'sit');
      else if (item.kind === 'work') S.api?.playAnimation?.(S.target, item.animation || 'work');
    } catch (e) { console.warn('[Possession] interaction failed', e); }
    clearHover(true);
  }
  function interactNearest() {
    if (!S.target) return;
    const T = THREE();
    if (!T?.Vector3) return;
    const pos = S.target.object.getWorldPosition(new T.Vector3());
    let best = null, bestD = Infinity;
    for (const item of allItems()) {
      try {
        const p = item.object.getWorldPosition(new T.Vector3());
        const d = pos.distanceTo(p);
        if (d < (item.useDistance || 2) && d < bestD) { best = item; bestD = d; }
      } catch {}
    }
    if (best) interact(best);
  }
  function handlePointerMove(e) {
    if (!S.target) return;
    const item = raycast(e, allItems());
    if (item === S.hovered) return;
    clearHover(true);
    if (item) {
      S.hovered = item;
      S.hoverMarker = makeMarker(item, item.kind === 'door' && S.mode === 'door-link' ? 0x258dff : 0xff463d);
    }
  }
  function handlePointerDown(e) {
    if (!S.api || e.button !== 0 || e.target !== S.api.canvas) return;
    if (!S.target) {
      if (S.mode !== 'possess') return;
      const npc = raycast(e, allNPCs());
      if (npc) { e.preventDefault(); e.stopImmediatePropagation(); possess(npc); }
      return;
    }
    const item = raycast(e, allItems());
    if (item) { e.preventDefault(); e.stopImmediatePropagation(); interact(item); }
  }
  function onKeyDown(e) {
    if (!S.target) return;
    const handled = ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','Escape','KeyE','KeyQ','KeyF'];
    if (handled.includes(e.code)) { e.preventDefault(); e.stopPropagation(); }
    S.keys.add(e.code);
    if (e.code === 'Escape') release();
    if (e.code === 'KeyE' && S.hovered) interact(S.hovered);
    if (e.code === 'KeyF') interactNearest();
    if (e.code === 'KeyQ') {
      S.mode = S.mode === 'door-link' ? 'interact' : 'door-link';
      clearDoorPair();
    }
    if (e.code === 'Space') S.jumpRequested = true;
  }
  function onKeyUp(e) { S.keys.delete(e.code); }

  function tick(now) {
    requestAnimationFrame(tick);
    for (const marker of [S.hoverMarker, ...S.doorMarkers]) {
      try { marker?.update?.(now); } catch {}
    }
    const dt = S.lastTime ? Math.min((now - S.lastTime) / 1000, 0.04) : 0;
    S.lastTime = now;
    if (!S.target || !S.api || dt <= 0) return;
    const T = THREE();
    if (!T?.Vector3) return;

    const obj = S.target.object;
    const forward = new T.Vector3();
    S.api.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq()) forward.normalize();
    const right = new T.Vector3(-forward.z, 0, forward.x);
    const move = new T.Vector3();
    if (S.keys.has('KeyW') || S.keys.has('ArrowUp')) move.add(forward);
    if (S.keys.has('KeyS') || S.keys.has('ArrowDown')) move.sub(forward);
    if (S.keys.has('KeyD') || S.keys.has('ArrowRight')) move.add(right);
    if (S.keys.has('KeyA') || S.keys.has('ArrowLeft')) move.sub(right);

    // IMPORTANT: use only native character movement/physics. Never assign position
    // directly; doing so let possessed residents clip through walls in the prototype.
    if (move.lengthSq() && typeof S.api.moveCharacter === 'function') {
      const direction = move.normalize();
      const speed = (S.keys.has('ShiftLeft') || S.keys.has('ShiftRight')) ? S.runSpeed : S.speed;
      try {
        S.api.moveCharacter(S.target, direction.multiplyScalar(speed * dt));
        obj.rotation.y = Math.atan2(direction.x, direction.z);
      } catch {}
    }
    if (S.jumpRequested) {
      try {
        if (typeof S.api.jumpCharacter === 'function') S.api.jumpCharacter(S.target);
        else if (typeof S.api.requestJump === 'function') S.api.requestJump(S.target);
      } catch {}
      S.jumpRequested = false;
    }

    // When the game reports a door crossing, clear both markers. If no crossing
    // callback exists, only trigger the bridge on entry and throttle repeated calls.
    if (S.doorPair?.length === 2) {
      const [a, b] = S.doorPair;
      const near = item => {
        try {
          const p = obj.getWorldPosition(new T.Vector3());
          return p.distanceTo(item.object.getWorldPosition(new T.Vector3())) < (item.radius || 1.0);
        } catch { return false; }
      };
      const nowMs = performance.now();
      if (nowMs - S.lastDoorTrigger > 900 && (near(a) || near(b))) {
        S.lastDoorTrigger = nowMs;
        try { S.api.teleportThroughDoor?.(S.target, a, b); } catch {}
        clearDoorPair(true);
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