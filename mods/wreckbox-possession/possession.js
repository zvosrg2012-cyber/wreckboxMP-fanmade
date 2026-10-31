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
    enter(npc) {
      if (!npc || npc.gone || npc.dead || npc.rag || npc.zomb || npc.hidden || npc.sc) return false;
      if (this.active) this.release();
      this.npc = npc;
      this.active = true;
      Object.keys(this.keys).forEach(k => this.keys[k] = false);
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
      try { MR('Вселение: A/D — движение · W/S — лестницы и лифт · Shift — бег · Space — прыжок · Esc — выход · E — дверь (если доступно)'); } catch (_) {}
      return true;
    },
    release() {
      if (!this.active) return;
      const npc = this.npc;
      this.active = false;
      Object.keys(this.keys).forEach(k => this.keys[k] = false);
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
      if (key === 'jump') { if (!e.repeat) this.keys.jump = true; }
      else this.keys[key] = true;
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
      e.preventDefault(); e.stopImmediatePropagation();
      this.keys[key] = false;
    }
  };
  window.__WRECKBOX_POSSESSION__ = controller;
  // Separate possession button, using the game's native .tool toolbar styling.
  const mountUI = () => {
    const tools = document.getElementById('tools');
    if (!tools || document.getElementById('wzm-possession-button')) return;
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
    if (!document.getElementById('wzm-possession-button')) {
      const observer = new MutationObserver(mountUI);
      observer.observe(document.body, {childList:true,subtree:true});
      window.addEventListener('load', () => { mountUI(); observer.disconnect(); }, {once:true});
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchToolbar, {once:true});
  else watchToolbar();

  window.addEventListener('keydown', e => controller.keydown(e), true);
  window.addEventListener('keyup', e => controller.keyup(e), true);
  window.addEventListener('blur', () => {
    Object.keys(controller.keys).forEach(k => controller.keys[k] = false);
  });
  // Touch controls are shown only while possessing an NPC.
  const mountTouchControls = () => {
    if (document.getElementById('wzm-touch-controls')) return;
    const root = document.createElement('div');
    root.id = 'wzm-touch-controls';
    root.innerHTML = `
      <div class="wzm-pad">
        <button data-key="up" aria-label="Вверх">▲</button>
        <div><button data-key="left" aria-label="Влево">◀</button><button data-key="down" aria-label="Вниз">▼</button><button data-key="right" aria-label="Вправо">▶</button></div>
      </div>
      <div class="wzm-actions">
        <button data-key="run">БЕГ</button><button data-key="jump">ПРЫЖОК</button>
        <button data-action="interact">E · ДВЕРЬ</button><button data-action="exit">ВЫХОД</button>
      </div>`;
    const style = document.createElement('style');
    style.textContent = `
      #wzm-touch-controls{display:none;position:fixed;z-index:100000;left:0;right:0;bottom:max(14px,env(safe-area-inset-bottom));padding:10px 14px;box-sizing:border-box;justify-content:space-between;align-items:flex-end;gap:12px;pointer-events:none;touch-action:none;user-select:none}
      #wzm-touch-controls .wzm-pad,#wzm-touch-controls .wzm-actions{display:flex;flex-direction:column;gap:7px;pointer-events:auto}
      #wzm-touch-controls .wzm-pad>div{display:flex;gap:7px}
      #wzm-touch-controls .wzm-actions{display:grid;grid-template-columns:repeat(2,minmax(62px,1fr));max-width:210px}
      #wzm-touch-controls button{min-width:48px;min-height:48px;padding:8px;border:1px solid rgba(255,255,255,.4);border-radius:12px;background:rgba(20,24,28,.78);color:#fff;font:700 13px Arial,sans-serif;touch-action:none;-webkit-user-select:none;user-select:none}
      #wzm-touch-controls button:active{background:rgba(170,125,60,.95)}
      @media(pointer:coarse),(max-width:800px){#wzm-touch-controls{display:flex}}
    `;
    document.head.appendChild(style); document.body.appendChild(root);
    const clear = key => { if (controller.keys[key] !== undefined) controller.keys[key] = false; };
    root.querySelectorAll('[data-key]').forEach(btn => {
      const key=btn.dataset.key;
      const down=e=>{e.preventDefault();if(!controller.active)return;if(key==='jump')controller.keys.jump=true;else controller.keys[key]=true;try{btn.setPointerCapture(e.pointerId);}catch(_){}};
      const up=e=>{e.preventDefault();clear(key);};
      btn.addEventListener('pointerdown',down);['pointerup','pointercancel','lostpointercapture','pointerleave'].forEach(ev=>btn.addEventListener(ev,up));
    });
    root.querySelector('[data-action="interact"]').addEventListener('click',()=>controller.interact());
    root.querySelector('[data-action="exit"]').addEventListener('click',()=>controller.release());
    const refresh=()=>{root.style.display=controller.active?'flex':'none';};
    const timer=setInterval(()=>{refresh();if(!document.body.contains(root))clearInterval(timer);},180);
    window.addEventListener('wzm-possession-release',refresh);
    refresh();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountTouchControls,{once:true});else mountTouchControls();
})();
