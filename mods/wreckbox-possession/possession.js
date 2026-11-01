/* WreckboxMP 1.9.2 — Вселение */
(() => {
  'use strict';
  if (window.__WRECKBOX_POSSESSION_MOD_LOADED__) return;
  window.__WRECKBOX_POSSESSION_MOD_LOADED__ = true;

  const controller = {
    active: false,
    npc: null,
    camera: null,
    keys: { left:false, right:false, up:false, down:false, run:false, jump:false },
    verticalReleaseTimers: { up:null, down:null },
    jumpTimer: null,
    aim: { on:false, wx:0, wy:0 },
    isTyping(e) {
      const t = e && e.target;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable === true);
    },
    setKey(key, pressed) {
      if (key === 'jump') {
        // A jump is a one-shot request. Releasing the key does not cancel it (a quick tap must
        // still reach the game loop), but it expires on its own so that a press made in the air
        // or on stairs cannot fire later, on landing.
        if (!pressed) return;
        clearTimeout(this.jumpTimer);
        this.keys.jump = true;
        this.jumpTimer = setTimeout(() => { this.keys.jump = false; this.jumpTimer = null; }, 150);
        return;
      }
      if (pressed) {
        if (key === 'up' || key === 'down') {
          clearTimeout(this.verticalReleaseTimers[key]);
          this.verticalReleaseTimers[key] = null;
        }
        this.keys[key] = true;
        return;
      }
      // A short W/S tap must survive long enough for the game loop to start a stair route.
      if ((key === 'up' || key === 'down') && this.keys[key]) {
        clearTimeout(this.verticalReleaseTimers[key]);
        this.verticalReleaseTimers[key] = setTimeout(() => {
          this.keys[key] = false;
          this.verticalReleaseTimers[key] = null;
        }, 120);
      } else {
        this.keys[key] = false;
      }
    },
    clearKeys() {
      clearTimeout(this.jumpTimer);
      this.jumpTimer = null;
      Object.keys(this.verticalReleaseTimers).forEach(k => {
        clearTimeout(this.verticalReleaseTimers[k]);
        this.verticalReleaseTimers[k] = null;
      });
      Object.keys(this.keys).forEach(k => { this.keys[k] = false; });
    },
    enter(npc) {
      if (!npc || npc.gone || npc.dead || npc.rag || npc.zomb || npc.hidden || npc.sc) return false;
      if (this.active) this.release();
      this.npc = npc;
      this.active = true;
      if (this.dbg) this.dbg.enterAt = performance.now();
      this.clearKeys();
      npc.__wzmPossessed = true;
      npc.__wzmMoveDir = '';
      npc.act = null;
      npc.nav = null;
      npc.pose = '';
      npc.state = 'idle';
      npc.lstate = 'idle';
      npc.t = 999;
      npc.vx = 0;
      npc.vy = 0;
      npc.blocked = 0;
      try { MR('Вселение: A/D или ←/→ — ходьба · W/S или ↑/↓ — лестницы и лифт · Shift — бег · E — дверь · Esc — выход'); } catch (_) {}
      return true;
    },
    release() {
      if (!this.active) return;
      this.aim.on = false;
      const npc = this.npc;
      this.active = false;
      this.clearKeys();
      if (npc) {
        npc.__wzmMoveDir = '';
        if (npc.sc) {
          npc.__wzmReleaseAfterSc = true;
        } else {
          npc.__wzmPossessed = false;
          npc.nav = null; npc.act = null;
          npc.state = 'idle'; npc.lstate = 'idle'; npc.t = .2;
        }
      }
      this.npc = null;
      window.dispatchEvent(new Event('wzm-possession-release'));
      try { MR('Вы вышли из вселения.'); } catch (_) {}
    },
    interact() {
      if (!this.active || !this.npc) return;
      window.dispatchEvent(new Event('wzm-possession-door'));
    },
    keydown(e) {
      if (!this.active) return;
      // Do not swallow letters, digits or Space while the player types into a field.
      if (this.isTyping(e)) return;
      const map = {
        ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right',
        ArrowUp:'up', KeyW:'up', ArrowDown:'down', KeyS:'down',
        ShiftLeft:'run', ShiftRight:'run', Space:'jump'
      };
      if (e.code === 'Escape') {
        e.preventDefault(); e.stopImmediatePropagation(); this.release(); return;
      }
      if (e.code === 'KeyE') {
        e.preventDefault(); e.stopImmediatePropagation(); this.interact(); return;
      }
      const key = map[e.code];
      if (!key) return;
      e.preventDefault(); e.stopImmediatePropagation();
      // Holding Space must not auto-repeat jumps.
      if (key === 'jump' && e.repeat) return;
      this.setKey(key, true);
    },
    keyup(e) {
      if (!this.active) return;
      const map = {
        ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right',
        ArrowUp:'up', KeyW:'up', ArrowDown:'down', KeyS:'down',
        ShiftLeft:'run', ShiftRight:'run', Space:'jump'
      };
      const key = map[e.code];
      if (!key) return;
      // Space is swallowed on keyup too: on a focused toolbar button it would otherwise "click" it.
      e.preventDefault(); e.stopImmediatePropagation();
      this.setKey(key, false);
    }
  };
  window.__WRECKBOX_POSSESSION__ = controller;

  // Elevator panel styling. It reuses the game's own look (the .panel frame, hazard stripe, --accent,
  // --room gradients, display font, square corners) through the game's CSS variables, so it follows
  // the game's theme instead of hard-coded colours. The panel DOM is built in possession_hook.js.
  const mountLiftStyle = () => {
    if (document.getElementById('wzm-lift-style')) return;
    const style = document.createElement('style');
    style.id = 'wzm-lift-style';
    style.textContent = `
      .wzm-lift{position:fixed;z-index:5;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 96px);width:188px;padding:12px 12px 11px;border-top-width:6px;font-family:var(--font-ui);color:var(--ink);pointer-events:auto;user-select:none}
      .wzm-lift::before{content:'';position:absolute;left:-6px;right:-6px;top:-6px;height:6px;background:var(--hazard)}
      .wzm-lift__head{display:flex;align-items:center;gap:10px;margin:0 0 10px;font:700 12px/1 var(--font-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
      .wzm-lift__head::after{content:'';order:1;flex:1;height:1px;background:var(--line)}
      .wzm-lift__head b{order:2;font:700 22px/1 var(--font-display);font-variant-numeric:tabular-nums;letter-spacing:.01em;color:var(--ink)}
      .wzm-lift__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}
      .wzm-lift__btn{--lamp:#54575b;height:46px;border-radius:0;cursor:pointer;color:var(--ink);font:700 18px/1 var(--font-display);font-variant-numeric:tabular-nums;
        background:linear-gradient(var(--lamp),var(--lamp)) 50% 0 / 16px 3px no-repeat,linear-gradient(rgba(0,0,0,.45),transparent 9px),linear-gradient(var(--room),var(--room2))}
      .wzm-lift__btn:hover:not(:disabled){--lamp:#fff3c4;
        background:linear-gradient(var(--lamp),var(--lamp)) 50% 0 / 16px 3px no-repeat,radial-gradient(ellipse 90% 110% at 50% 0,rgba(255,209,110,.36),rgba(255,190,80,.08) 70%,transparent),linear-gradient(var(--room),var(--room2))}
      .wzm-lift__btn:active:not(:disabled){transform:translateY(1px)}
      .wzm-lift__btn[aria-current='true']{--lamp:#fff6d0;cursor:default;color:var(--accent-ink);
        background:linear-gradient(var(--lamp),var(--lamp)) 50% 0 / 16px 3px no-repeat,radial-gradient(ellipse 110% 150% at 50% 0,#ffe596,var(--accent) 58%,#dc9f00)}
      .wzm-lift__foot{margin-top:10px;text-align:center;font:600 10.5px/1 var(--font-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-dim)}
      #wzm-debug{position:fixed;z-index:7;left:12px;top:calc(env(safe-area-inset-top,0px) + 84px);margin:0;padding:8px 10px;max-width:min(92vw,560px);font:11px/1.45 var(--font-mono);color:var(--ink);white-space:pre-wrap;pointer-events:none}
      /* Touch: bottom corners belong to the pad and action buttons, so the panel sits under the HUD. */
      body.touch .wzm-lift{top:calc(env(safe-area-inset-top,0px) + 76px);bottom:auto;right:10px;width:168px}
      body.touch .wzm-lift__btn{height:44px}
      @media (orientation:landscape) and (max-height:560px){body.touch .wzm-lift{top:calc(env(safe-area-inset-top,0px) + 64px);right:78px}}
    `;
    (document.head || document.documentElement).appendChild(style);
  };
  mountLiftStyle();

  // Separate possession button, using the game's native .tool toolbar styling.
  // The hook registers "possession" in the game's own tool lists, so the game normally draws a
  // native button. This extra button is only a fallback: it is mounted when the patch was applied
  // (window.__WRECKBOX_POSSESSION_READY__) and no native "Вселение" button exists in #tools.
  const nativeButton = () => Array.from(document.querySelectorAll('#tools .tool'))
    .find(b => b.id !== 'wzm-possession-button' && (b.textContent || '').indexOf('Вселение') !== -1);
  const mountUI = () => {
    const tools = document.getElementById('tools');
    if (!tools) return;
    const existing = document.getElementById('wzm-possession-button');
    if (window.__WRECKBOX_POSSESSION_READY__ !== true || nativeButton()) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;
    const button = document.createElement('button');
    button.id = 'wzm-possession-button';
    button.type = 'button';
    button.className = 'tool';
    button.setAttribute('aria-label', 'Вселение');
    button.innerHTML = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="3.4"/><path d="M5 21c.5-4.1 2.8-6.2 7-6.2s6.5 2.1 7 6.2"/></svg><span>Вселение</span>';
    button.addEventListener('click', () => {
      if (typeof window.__WRECKBOX_SELECT_POSSESSION__ === 'function') {
        if (controller.active) controller.release();
        window.__WRECKBOX_SELECT_POSSESSION__();
      } else {
        try { MR('Инструмент «Вселение» ещё не готов.'); } catch (_) {}
      }
    });
    tools.appendChild(button);
  };
  const watchToolbar = () => {
    mountUI();
    const tools = document.getElementById('tools');
    if (tools) {
      // Stays connected: the game may rebuild the tool list when the mode (elements/building) changes.
      // mountUI is idempotent, so reacting to our own insert/remove settles after one pass.
      new MutationObserver(mountUI).observe(tools, {childList:true});
      return;
    }
    const waiter = new MutationObserver(() => {
      if (document.getElementById('tools')) { waiter.disconnect(); watchToolbar(); }
    });
    waiter.observe(document.documentElement, {childList:true, subtree:true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchToolbar, {once:true});
  else watchToolbar();

  window.addEventListener('keydown', e => controller.keydown(e), true);
  window.addEventListener('keyup', e => controller.keyup(e), true);
  window.addEventListener('blur', () => {
    controller.clearKeys();
  });
  // Minimal touch pad, enabled only on touch-sized/coarse-pointer devices.
  const mountTouchControls = () => {
    if(document.getElementById('wzm-touch-controls'))return;
    const root=document.createElement('div');root.id='wzm-touch-controls';
    root.innerHTML='<div class="wzm-pad"><button data-key="up">▲</button><div><button data-key="left">◀</button><button data-key="down">▼</button><button data-key="right">▶</button></div></div><div class="wzm-actions"><button data-key="jump" aria-label="Прыжок">⤒</button><button data-key="run" aria-label="Бег">⇧</button><button data-action="interact" aria-label="Дверь">E</button><button data-action="exit" aria-label="Выйти из вселения">✕</button></div>';
    const style=document.createElement('style');
    style.textContent=`
      #wzm-touch-controls{display:none;position:fixed;z-index:100000;left:0;right:0;bottom:max(12px,env(safe-area-inset-bottom));padding:8px 12px;box-sizing:border-box;justify-content:space-between;align-items:flex-end;pointer-events:none;touch-action:none;user-select:none}
      #wzm-touch-controls .wzm-pad{display:flex;flex-direction:column;gap:6px;pointer-events:auto}
      #wzm-touch-controls .wzm-pad>div{display:flex;gap:6px}
      #wzm-touch-controls button{width:54px;height:54px;padding:0;border:1px solid rgba(255,255,255,.45);border-radius:9px;background:rgba(18,22,26,.68);color:#fff;font:700 21px Arial,sans-serif;touch-action:none;user-select:none}
      #wzm-touch-controls .wzm-actions{display:grid;grid-template-columns:repeat(2,48px);gap:6px;pointer-events:auto}
      #wzm-touch-controls .wzm-actions button{width:48px;height:48px;font-size:17px}
      /* Landscape phones: the game parks its tool dock as a 60px column on the right edge. */
      @media (orientation:landscape) and (max-height:560px){body.touch #wzm-touch-controls{padding-right:84px}}
    `;
    document.head.appendChild(style);document.body.appendChild(root);
    const touchDevice=()=>window.matchMedia('(pointer:coarse)').matches;
    root.querySelectorAll('[data-key]').forEach(btn=>{
      const key=btn.dataset.key;
      const down=e=>{e.preventDefault();if(!controller.active)return;controller.setKey(key,true);try{btn.setPointerCapture(e.pointerId);}catch(_){}};
      const up=e=>{e.preventDefault();controller.setKey(key,false);};
      btn.addEventListener('pointerdown',down);
      ['pointerup','pointercancel','lostpointercapture','pointerleave'].forEach(ev=>btn.addEventListener(ev,up));
    });
    root.querySelector('[data-action="interact"]').addEventListener('pointerdown',e=>{e.preventDefault();controller.interact();});
    root.querySelector('[data-action="exit"]').addEventListener('pointerdown',e=>{e.preventDefault();controller.release();});
    const refresh=()=>{root.style.display=controller.active&&touchDevice()?'flex':'none';};
    window.addEventListener('resize',refresh);window.addEventListener('wzm-possession-release',refresh);
    setInterval(refresh,300);refresh();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountTouchControls,{once:true});else mountTouchControls();

  // Diagnostics overlay, toggled with F8. The hook publishes NPC/camera values from inside the game
  // (independently of the game loop) and counts calls of update() and of the possessed-NPC movement
  // branch; this overlay only displays them. It exists to find out why the camera stops following the
  // NPC on stairs and in elevators: which transition (sc) is active, how far the camera lags behind,
  // and whether update()/movement keep running during the transition.

  // ---------------------------------------------------------------------------------------------------------
  // Aiming and vision. Hold the right mouse button: the NPC takes a guard stance, a ring on the floor follows
  // the cursor and a translucent view cone grows from the head. The vision itself is always on: NPCs outside the
  // cone, or behind walls, are not drawn (glass and glass blocks do not block the view).
  // Needs window.__WZM_GAME__ and window.__wzmDraw, which the patch in possession_hook.js provides.
  // ---------------------------------------------------------------------------------------------------------
  const GLASS = { 5: true, 17: true };           // material ids "Стекло" and "Стеклоблоки"
  const VIEW = {
    walk: { half: 60 * Math.PI / 180, range: 440 },   // normal look: wide and short
    aim:  { half: 34 * Math.PI / 180, range: 680 }    // aiming: narrow and long, like focusing
  };
  const eyeOf = q => ({ x: q.x, y: q.y - 23 });
  const opaqueAt = (g, x, y) => {
    const cx = Math.floor(x / 6), cy = Math.floor(y / 6);
    if (cx < 0 || cx >= g.gw) return true;
    if (cy < 0) return false;
    if (cy >= g.rows) return true;
    const i = cy * g.gw + cx, m = g.gt[i];
    return m !== 0 && !(g.vt[i] & g.mt) && !GLASS[m];
  };
  const solidAt = (g, x, y) => {
    const cx = Math.floor(x / 6), cy = Math.floor(y / 6);
    if (cx < 0 || cx >= g.gw) return true;
    if (cy < 0) return false;
    if (cy >= g.rows) return true;
    const i = cy * g.gw + cx;
    return g.gt[i] !== 0 && !(g.vt[i] & g.mt);
  };
  const grid = () => {
    const g = window.__WZM_GAME__;
    if (!g || !g.gt || !g.vt || !g.gw) return null;
    return { gt: g.gt, vt: g.vt, mt: g.mt, gw: g.gw, rows: Math.floor(g.gt.length / g.gw), cam: g.cam, mm: g.mm };
  };
  // Length of free sight from (x,y) in direction ang, up to maxLen.
  const rayLen = (g, x, y, ang, maxLen) => {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    for (let d = 3; d <= maxLen; d += 3) if (opaqueAt(g, x + dx * d, y + dy * d)) return d - 3;
    return maxLen;
  };
  const clearLine = (g, x0, y0, x1, y1) => {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(len / 3));
    for (let i = 1; i < n; i++) if (opaqueAt(g, x0 + dx * i / n, y0 + dy * i / n)) return false;
    return true;
  };
  const worldFromClient = (cx, cy) => {
    const g = window.__WZM_GAME__, cv = document.getElementById('game') || document.querySelector('canvas');
    if (!g || !g.cam || !cv) return null;
    const r = cv.getBoundingClientRect();
    return { x: (cx - r.left - r.width / 2) / g.cam.zoom + g.cam.x, y: (cy - r.top - r.height / 2) / g.cam.zoom + g.cam.y };
  };
  const updateAim = e => {
    controller.aim.cx = e.clientX; controller.aim.cy = e.clientY;
    const w = worldFromClient(e.clientX, e.clientY);
    if (w) { controller.aim.wx = w.x; controller.aim.wy = w.y; }
  };
  const onCanvas = e => { const t = e.target; return !!t && (t.id === 'game' || t.tagName === 'CANVAS'); };
  window.addEventListener('pointerdown', e => {
    if (!controller.active || e.button !== 2 || !onCanvas(e)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    controller.aim.on = true; updateAim(e);
  }, true);
  window.addEventListener('pointermove', e => {
    if (!controller.aim.on) return;
    if (!(e.buttons & 2)) { controller.aim.on = false; return; }
    updateAim(e);
  }, true);
  window.addEventListener('pointerup', e => {
    if (e.button !== 2 || !controller.aim.on) return;
    e.preventDefault(); e.stopImmediatePropagation();
    controller.aim.on = false;
  }, true);
  window.addEventListener('contextmenu', e => { if (controller.active) e.preventDefault(); }, true);
  window.addEventListener('blur', () => { controller.aim.on = false; });

  // Direction of the view: toward the ring while aiming, otherwise the way the NPC faces.
  const viewState = (q, g) => {
    const eye = eyeOf(q), aiming = controller.aim.on;
    const prof = aiming ? VIEW.aim : VIEW.walk;
    let ang = q.dir >= 0 ? 0 : Math.PI;
    let ring = null;
    if (aiming) {
      const maxR = prof.range - 40;
      let tx = Math.max(q.x - maxR, Math.min(q.x + maxR, controller.aim.wx));
      // the ring lies on the floor and stops in front of the first wall
      const step = tx >= q.x ? 3 : -3;
      let x = q.x;
      while (Math.abs(x - tx) > 3 && !solidAt(g, x + step, q.y - 6)) x += step;
      ring = { x: x, y: q.y };
      ang = Math.atan2(ring.y - eye.y, ring.x - eye.x);
      if (Math.abs(ring.x - q.x) < 6) ang = q.dir >= 0 ? 0 : Math.PI;
    }
    return { eye, ang, half: prof.half, range: prof.range, ring, aiming };
  };
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
  const posOf = r => {
    if (r.rag && r.rag.x && r.rag.y && r.rag.x.length) {
      let sx = 0, sy = 0; const n = r.rag.x.length;
      for (let i = 0; i < n; i++) { sx += r.rag.x[i]; sy += r.rag.y[i]; }
      return { x: sx / n, y: sy / n };
    }
    return { x: r.x, y: r.y - 12 };
  };
  const canSee = (g, v, r) => {
    const p = posOf(r), tries = r.rag ? [p] : [p, { x: p.x, y: p.y - 10 }, { x: p.x, y: p.y + 8 }];
    for (const pt of tries) {
      const dx = pt.x - v.eye.x, dy = pt.y - v.eye.y, d = Math.hypot(dx, dy);
      if (d > v.range) continue;
      if (d > 14 && angDiff(Math.atan2(dy, dx), v.ang) > v.half) continue;
      if (clearLine(g, v.eye.x, v.eye.y, pt.x, pt.y)) return true;
    }
    return false;
  };
  let flagged = false;
  const clearFlags = g => {
    if (!flagged) return;
    for (const r of g.mm) r.__wzmUnseen = false;
    flagged = false;
  };
  controller.vision = { seen: 0, hidden: 0 };
  controller.visionApi = { viewState, canSee, grid, rayLen, opaqueAt };
  window.__wzmDraw = ctx => {
    const g = grid();
    if (!g) return;
    const q = controller.active && controller.npc;
    if (!q || q.gone || q.dead) { clearFlags(g); return; }
    const v = viewState(q, g);
    let seen = 0, hid = 0;
    for (const r of g.mm) {
      if (r === q) { r.__wzmUnseen = false; continue; }
      const ok = canSee(g, v, r);
      r.__wzmUnseen = !ok; ok ? seen++ : hid++;
    }
    flagged = true; controller.vision.seen = seen; controller.vision.hidden = hid;
    controller.vision.view = { ang: v.ang, half: v.half, range: v.range, ring: v.ring };
    if (!v.aiming) return;
    // --- view cone (only while the right mouse button is held)
    const zoom = g.cam.zoom, N = 72, pts = [];
    for (let i = 0; i <= N; i++) {
      const a = v.ang - v.half + (2 * v.half) * i / N;
      const len = rayLen(g, v.eye.x, v.eye.y, a, v.range);
      pts.push({ x: v.eye.x + Math.cos(a) * len, y: v.eye.y + Math.sin(a) * len });
    }
    ctx.save();
    ctx.beginPath(); ctx.moveTo(v.eye.x, v.eye.y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    const grad = ctx.createRadialGradient(v.eye.x, v.eye.y, 8, v.eye.x, v.eye.y, v.range);
    grad.addColorStop(0, 'rgba(255,246,214,0.42)'); grad.addColorStop(1, 'rgba(255,246,214,0.10)');
    ctx.fillStyle = grad; ctx.fill();
    ctx.lineWidth = Math.max(1, 1.4 / zoom); ctx.strokeStyle = 'rgba(255,236,170,0.55)'; ctx.stroke();
    // --- ring on the floor (a flat ellipse in this side view)
    if (v.ring) {
      const k = Math.max(1, 1 / zoom), rx = 15 * k, ry = 5.2 * k;
      ctx.beginPath(); ctx.ellipse(v.ring.x, v.ring.y + 1, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fill();
      ctx.lineWidth = 1.8 * k; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(v.ring.x, v.ring.y + 1, rx * 0.34, ry * 0.34, 0, 0, Math.PI * 2);
      ctx.lineWidth = 1.4 * k; ctx.strokeStyle = 'rgba(255,205,80,0.95)'; ctx.stroke();
    }
    ctx.restore();
  };

  controller.debug = false;
  controller.dbg = { upd:0, move:0, lastUpd:0, lastMove:0, moveDt:0, snap:null, lossFrom:0, lossCtx:'', lossMax:0, losses:[] };
  let debugEl = null, debugPrev = null;
  const renderDebug = () => {
    if (!controller.debug) return;
    if (!debugEl) {
      debugEl = document.createElement('pre');
      debugEl.id = 'wzm-debug';
      debugEl.className = 'panel';
      document.body.appendChild(debugEl);
    }
    const d = controller.dbg, now = performance.now();
    const perSec = (a, b, dt) => (dt > 0 ? Math.round((a - b) * 1000 / dt) : 0);
    let updRate = 0, moveRate = 0;
    if (debugPrev) {
      const dt = now - debugPrev.t;
      updRate = perSec(d.upd, debugPrev.upd, dt);
      moveRate = perSec(d.move, debugPrev.move, dt);
    }
    debugPrev = { t: now, upd: d.upd, move: d.move };
    const ago = t => (t ? Math.round(now - t) + ' мс назад' : 'ещё не было');
    const s = d.snap, lines = ['ДИАГНОСТИКА ВСЕЛЕНИЯ · F8 — скрыть'];
    if (!controller.active || !s) {
      lines.push('вселение не активно');
    } else {
      lines.push('NPC: x=' + Math.round(s.x) + ' y=' + Math.round(s.y) + ' state=' + s.state + ' sc=' + (s.sc || '-') + ' nav=' + (s.nav ? 'да' : 'нет') + ' на земле=' + (s.ground ? 'да' : 'нет'));
      lines.push('камера: x=' + Math.round(s.camX) + ' y=' + Math.round(s.camY) + ' отставание=' + s.err.toFixed(1) + ' px' + (s.err > 40 ? '  <-- КАМЕРА ПОТЕРЯНА' : ''));
    }
    lines.push('update() инструмента: ' + updRate + '/с, последний ' + ago(d.lastUpd));
    lines.push('ветка движения NPC: ' + moveRate + '/с, последняя ' + ago(d.lastMove));
    if (d.lossFrom) lines.push('камера потеряна уже ' + Math.round(now - d.lossFrom) + ' мс (' + d.lossCtx + ')');
    d.losses.forEach(l => lines.push('была потеря: ' + l));
    debugEl.textContent = lines.join('\n');
  };
  const toggleDebug = () => {
    controller.debug = !controller.debug;
    if (!controller.debug && debugEl) { debugEl.remove(); debugEl = null; debugPrev = null; }
    renderDebug();
  };
  window.addEventListener('keydown', e => {
    if (e.code !== 'F8' || e.repeat) return;
    e.preventDefault();
    toggleDebug();
  }, true);
  setInterval(renderDebug, 250);

})();
