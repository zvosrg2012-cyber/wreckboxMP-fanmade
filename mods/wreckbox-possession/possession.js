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

})();
