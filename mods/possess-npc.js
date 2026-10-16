/**
 * Wreckbox — Possess NPC prototype
 * Branch: mod/possess-npc-prototype
 *
 * Prototype/integration adapter, not yet wired to the game's private runtime.
 * The extracted game has an obfuscated inline script, so the actual scene,
 * NPC controller, camera and HUD references must be connected by the game bridge.
 *
 * Expected bridge:
 * window.wreckboxModAPI = {
 *   canvas: HTMLCanvasElement,
 *   camera: THREE.Camera,
 *   scene: THREE.Scene,
 *   getNPCs(): Array<{ object: THREE.Object3D, pauseAI(): void, resumeAI(): void }>,
 *   setCameraTarget(object: THREE.Object3D|null): void,
 *   setElementalHUDVisible(visible: boolean): void
 * }
 *
 * Controls: click an NPC to possess it; WASD move; Space jump; Escape release.
 * Does not modify NPC routines, jobs, sleep, seats, doors, or teleport links.
 */
(() => {
  'use strict';

  if (window.__wreckboxPossessNPC) return;
  window.__wreckboxPossessNPC = true;

  const state = {
    api: null,
    target: null,
    keys: new Set(),
    verticalVelocity: 0,
    grounded: true,
    speed: 5,
    jumpSpeed: 7,
    lastTime: 0,
    status: 'Waiting for game bridge…'
  };

  const overlay = document.createElement('div');
  overlay.id = 'wreckbox-possess-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', left: '12px', bottom: '12px', zIndex: '2147483647',
    padding: '8px 11px', color: '#fff', background: 'rgba(0,0,0,.72)',
    border: '1px solid rgba(255,255,255,.25)', borderRadius: '8px',
    font: '12px/1.45 system-ui,sans-serif', pointerEvents: 'none',
    whiteSpace: 'pre-line', maxWidth: '320px'
  });
  overlay.textContent = 'Wreckbox Possess NPC\nWaiting for game bridge…';
  document.documentElement.appendChild(overlay);

  function setStatus(message) {
    state.status = message;
    overlay.textContent = 'Wreckbox Possess NPC\n' + message +
      (state.target ? '\nWASD move · Space jump · Esc release' : '\nClick an NPC to possess it');
  }

  function resolveAPI() {
    const api = window.wreckboxModAPI;
    if (!api || !api.canvas || !api.camera || !api.scene ||
        typeof api.getNPCs !== 'function' ||
        typeof api.setCameraTarget !== 'function') return false;
    state.api = api;
    setStatus('Ready — click an NPC');
    return true;
  }

  function getThree() {
    return window.THREE || state.api?.THREE || null;
  }

  function possess(npc) {
    if (!npc || !npc.object) return;
    release();
    state.target = npc;
    try { npc.pauseAI?.(); } catch (e) { console.warn('[Possess NPC] pauseAI failed', e); }
    try { state.api.setCameraTarget(npc.object); } catch (e) { console.warn(e); }
    try { state.api.setElementalHUDVisible?.(false); } catch (e) { console.warn(e); }
    state.verticalVelocity = 0;
    state.grounded = true;
    setStatus('Possessing NPC');
  }

  function release() {
    if (!state.target) return;
    const previous = state.target;
    state.target = null;
    state.keys.clear();
    state.verticalVelocity = 0;
    try { state.api?.setCameraTarget(null); } catch (e) { console.warn(e); }
    try { state.api?.setElementalHUDVisible?.(true); } catch (e) { console.warn(e); }
    try { previous.resumeAI?.(); } catch (e) { console.warn('[Possess NPC] resumeAI failed', e); }
    setStatus('Released — click an NPC');
  }

  function pickNPC(event) {
    if (!state.api || !resolveAPI()) return;
    const THREE = getThree();
    if (!THREE?.Raycaster || !THREE?.Vector2) {
      setStatus('Bridge ready, but THREE.Raycaster is unavailable');
      return;
    }
    const canvas = state.api.canvas;
    const rect = canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, state.api.camera);
    const npcs = state.api.getNPCs() || [];
    const roots = npcs.filter(n => n?.object).map(n => n.object);
    const hits = raycaster.intersectObjects(roots, true);
    if (!hits.length) return;

    let hitObject = hits[0].object;
    let match = null;
    while (hitObject && !match) {
      match = npcs.find(n => n.object === hitObject) || null;
      hitObject = hitObject.parent;
    }
    if (match) {
      event.preventDefault();
      event.stopPropagation();
      possess(match);
    }
  }

  function onKeyDown(event) {
    if (['KeyW','KeyA','KeyS','KeyD','Space','Escape'].includes(event.code) && state.target) {
      event.preventDefault();
      event.stopPropagation();
    }
    state.keys.add(event.code);
    if (event.code === 'Escape' && state.target) release();
  }
  function onKeyUp(event) { state.keys.delete(event.code); }

  function tick(time) {
    requestAnimationFrame(tick);
    const dt = state.lastTime ? Math.min((time - state.lastTime) / 1000, 0.05) : 0;
    state.lastTime = time;
    const target = state.target;
    const api = state.api;
    if (!target?.object || !api || dt <= 0) return;

    const THREE = getThree();
    const object = target.object;
    // Movement is relative to the camera's horizontal direction.
    const forward = new THREE.Vector3();
    api.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() > 0) forward.normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const move = new THREE.Vector3();
    if (state.keys.has('KeyW')) move.add(forward);
    if (state.keys.has('KeyS')) move.sub(forward);
    if (state.keys.has('KeyD')) move.add(right);
    if (state.keys.has('KeyA')) move.sub(right);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(state.speed * dt);
      object.position.add(move);
      object.rotation.y = Math.atan2(move.x, move.z);
    }

    if (state.keys.has('Space') && state.grounded) {
      state.verticalVelocity = state.jumpSpeed;
      state.grounded = false;
    }
    state.verticalVelocity -= 18 * dt;
    object.position.y += state.verticalVelocity * dt;
    // Temporary ground plane. Replace with the game's collision/grounding API.
    if (object.position.y <= 0) {
      object.position.y = 0;
      state.verticalVelocity = 0;
      state.grounded = true;
    }
  }

  // Use capture phase so controls are consumed only while possessing a character.
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keyup', onKeyUp, true);
  document.addEventListener('pointerdown', event => {
    if (state.target || !state.api) return;
    if (event.button === 0 && event.target === state.api.canvas) pickNPC(event);
  }, true);

  const bridgePoll = setInterval(() => {
    if (resolveAPI()) clearInterval(bridgePoll);
  }, 500);
  requestAnimationFrame(tick);
  setStatus('Waiting for game bridge…');
})();
