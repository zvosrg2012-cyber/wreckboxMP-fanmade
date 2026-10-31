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
      try { MR('Вселение: A/D — ходьба · W/S — лестницы и лифт · Shift — бег · Space — прыжок · E — выход'); } catch (_) {}
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
    keydown(e) {
      if (!this.active) return;
      const map = {
        ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right',
        ArrowUp:'up', KeyW:'up', ArrowDown:'down', KeyS:'down',
        ShiftLeft:'run', ShiftRight:'run', Space:'jump'
      };
      if (e.code === 'KeyE' || e.code === 'Escape') {
        e.preventDefault(); e.stopImmediatePropagation(); this.release(); return;
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
  // Game-styled quick button and quiet status tag.
  const mountUI = () => {
    if (document.getElementById('wzm-possession-status')) return;
    const style = document.createElement('style');
    style.textContent = `
      #wzm-possession-status{position:fixed;z-index:2147483000;right:12px;bottom:10px;padding:3px 7px;border-radius:4px;background:rgba(24,27,29,.52);border:1px solid rgba(180,190,195,.16);color:rgba(225,230,232,.55);font:10px/1.2 Arial,sans-serif;pointer-events:none}
      #wzm-possession-button{position:fixed;z-index:2147483001;right:12px;bottom:35px;display:flex;align-items:center;gap:8px;padding:9px 13px;min-width:128px;justify-content:center;border:1px solid rgba(210,220,225,.28);border-radius:6px;background:linear-gradient(180deg,rgba(65,72,77,.96),rgba(35,40,44,.97));color:#f0f1f2;font:600 13px Arial,sans-serif;letter-spacing:.2px;text-shadow:0 1px 2px #000;box-shadow:0 2px 7px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.09);cursor:pointer;user-select:none}
      #wzm-possession-button:hover{background:linear-gradient(180deg,rgba(82,92,98,.98),rgba(43,50,55,.98));border-color:rgba(225,235,240,.48)}
      #wzm-possession-button:active{transform:translateY(1px);background:rgba(25,30,34,.98)}
      #wzm-possession-button .wzm-icon{width:16px;height:16px;display:block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    `;
    document.head.appendChild(style);
    const status = document.createElement('div');
    status.id = 'wzm-possession-status';
    status.textContent = 'Мод на вселение активен';
    document.body.appendChild(status);
    const button = document.createElement('button');
    button.id = 'wzm-possession-button';
    button.type = 'button';
    button.innerHTML = '<svg class="wzm-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="3.4"/><path d="M5 21c.5-4.1 2.8-6.2 7-6.2s6.5 2.1 7 6.2"/></svg><span>Вселение</span>';
    button.addEventListener('click', () => {
      if (controller.active) controller.release();
      if (typeof window.__WRECKBOX_SELECT_POSSESSION__ === 'function') {
        window.__WRECKBOX_SELECT_POSSESSION__();
        status.textContent = 'Выберите NPC';
      } else {
        status.textContent = 'Мод загружается…';
      }
    });
    document.body.appendChild(button);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountUI, {once:true});
  else mountUI();
  window.addEventListener('load', mountUI, {once:true});

  window.addEventListener('keydown', e => controller.keydown(e), true);
  window.addEventListener('keyup', e => controller.keyup(e), true);
  window.addEventListener('blur', () => {
    Object.keys(controller.keys).forEach(k => controller.keys[k] = false);
  });
})();
