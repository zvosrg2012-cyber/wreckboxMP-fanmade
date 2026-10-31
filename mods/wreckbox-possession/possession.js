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
  // Always-visible status and direct tool-selection button.
  const mountUI = () => {
    if (document.getElementById('wzm-possession-status')) return;
    const style = document.createElement('style');
    style.textContent = '#wzm-possession-status{position:fixed;z-index:2147483000;left:50%;bottom:12px;transform:translateX(-50%);padding:7px 13px;border-radius:8px;background:rgba(12,22,30,.88);border:1px solid #55c9ed;color:#bcefff;font:600 13px/1.25 Arial,sans-serif;pointer-events:none;text-shadow:0 1px 2px #000}#wzm-possession-button{position:fixed;z-index:2147483001;right:14px;bottom:12px;padding:10px 16px;border:1px solid #55c9ed;border-radius:9px;background:#173b4b;color:#e6faff;font:700 14px Arial,sans-serif;cursor:pointer;box-shadow:0 2px 12px #0008}#wzm-possession-button:hover{background:#20576b}';
    document.head.appendChild(style);
    const status = document.createElement('div');
    status.id = 'wzm-possession-status';
    status.textContent = 'Мод на вселение активен';
    document.body.appendChild(status);
    const button = document.createElement('button');
    button.id = 'wzm-possession-button';
    button.type = 'button';
    button.textContent = 'Вселение';
    button.addEventListener('click', () => {
      if (controller.active) controller.release();
      else if (typeof window.__WRECKBOX_SELECT_POSSESSION__ === 'function') {
        window.__WRECKBOX_SELECT_POSSESSION__();
        status.textContent = 'Вселение: выберите NPC';
      } else {
        status.textContent = 'Мод на вселение активен · перезагрузите игру';
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
