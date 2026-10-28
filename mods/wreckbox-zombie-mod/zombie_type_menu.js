/* WreckboxMP 1.9.2 zombie menu mod.
   Installs a guarded hook before the game's encrypted script and applies the
   selected speed multiplier when the game converts a person into a zombie. */
(() => {
  'use strict';
  if (window.__WRECKBOX_ZOMBIE_MOD_LOADED__) return;
  window.__WRECKBOX_ZOMBIE_MOD_LOADED__ = true;

  // The installer routes the game's decrypted source through this function
  // explicitly. This avoids relying on replacement of the global eval binding.
  if (!window.__WRECKBOX_RUN_GAME_SOURCE__) {
    const originalEval = window.eval;
    window.__WRECKBOX_RUN_GAME_SOURCE__ = function (source) {
      // Patch the actual infection/turning function in the decrypted game code.
      // This is the path used both when a person is bitten and when a person
      // is manually infected with the zombie tool.
      const conversionMarker = 't.zomb={goal:void 0===e.goal?null:e.goal,t0:$t},t.role="zombie"';
      const speedMarker = 't.spd=B(9,13),t.runSpd=B(28,38),t.panic=0';
      const visualMarker = 't.hp=Math.max(t.hp,70),t.blood=Math.max(t.blood,60),t.bleed=Math.min(t.bleed,.15),t.look.helmet=t.look.helmet&&Math.random()<.5,yT.n++';
      if (typeof source === 'string' && source.includes(conversionMarker) &&
          source.includes(speedMarker) && source.includes(visualMarker)) {
        const cfg = '((window.__WRECKBOX_SELECTED_ZOMBIE_CONFIG__&&window.__WRECKBOX_SELECTED_ZOMBIE_CONFIG__)||{})';
        source = source.replace(speedMarker,
          't.spd=B(9,13)*(' + cfg + '.speedMultiplier||1),t.runSpd=B(28,38)*(' + cfg + '.speedMultiplier||1),t.panic=0');
        source = source.replace(visualMarker,
          't.hp=Math.max(t.hp,70),t.blood=Math.max(t.blood,60),t.bleed=Math.min(t.bleed,.15),t.look.helmet=t.look.helmet&&Math.random()<.5,(function(z){const c=' + cfg + ';if(c.hpMultiplier)z.hp=Math.max(70,z.hp)*c.hpMultiplier;if(c.bodyColor){z.look.shirt=c.bodyColor;z.look.pants=c.pantsColor||c.bodyColor;z.look.skin=c.skinColor||z.look.skin;z.look.hair=c.hairColor||z.look.hair;z.look.helmet=!!c.helmet;z.look.helmCol=c.helmetColor||c.bodyColor;}})(t),yT.n++');
        window.__WRECKBOX_ZOMBIE_SPEED_HOOK_ACTIVE__ = true;
      } else {
        window.__WRECKBOX_ZOMBIE_SPEED_HOOK_ACTIVE__ = false;
      }
      return originalEval(source);
    };
  }

  const types = [
    { id: 'standard', label: 'Обычный', note: 'Стандартный тип игры.' },
    { id: 'fast', label: 'Быстрый', note: 'Красная одежда, скорость ×1,75; заражённые, превращённые после выбора, будут быстрее.' },
    { id: 'heavy', label: 'Тяжёлый', note: 'Медленный, крепкий и в тёмно-серой одежде; здоровье ×3,4.' },
    { id: 'hunter', label: 'Охотник', note: 'Быстрый преследователь в тёмной одежде; здоровье немного ниже обычного.' }
  ];
  let selectedType = 'standard';
  let observer = null;
  let renderQueued = false;
  let initialized = false;

  // Config is exposed for the game's NPC logic to consume; declaring it alone
  // does not alter NPCs until a compatible game-side handler reads it.
  const typeConfig = {
    standard: { speedMultiplier: 1, bodyColor: null, eyeColor: null, bloody: false, glowEyesInDark: false, hostileToOtherZombieTypes: false },
    fast: { speedMultiplier: 1.75, bodyColor: '#b51f2b', pantsColor: '#3d1519', skinColor: '#a85d60', hairColor: '#211719', hpMultiplier: 1, helmet: false, bloody: true, glowEyesInDark: true, hostileToOtherZombieTypes: true },
    heavy: { speedMultiplier: 0.58, bodyColor: '#41464b', pantsColor: '#24282d', skinColor: '#777d80', hairColor: '#303336', hpMultiplier: 3.4, helmet: true, helmetColor: '#292e33', bloody: false, glowEyesInDark: false, hostileToOtherZombieTypes: false },
    hunter: { speedMultiplier: 1.45, bodyColor: '#292b42', pantsColor: '#171824', skinColor: '#6d737d', hairColor: '#171820', hpMultiplier: 0.82, helmet: false, bloody: true, glowEyesInDark: true, hostileToOtherZombieTypes: false }
  };
  window.__WRECKBOX_ZOMBIE_TYPE_CONFIG__ = typeConfig;
  window.__WRECKBOX_SELECTED_ZOMBIE_TYPE__ = selectedType;
  window.__WRECKBOX_SELECTED_ZOMBIE_CONFIG__ = typeConfig.standard;

  const style = document.createElement('style');
  style.textContent = [
    '#wzmStatus{position:fixed;z-index:2147483000;right:10px;top:50%;transform:translateY(-50%);writing-mode:vertical-rl;max-height:80vh;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;padding:12px 7px;border:1px solid #59c783;border-radius:8px;background:rgba(13,35,24,.94);color:#b8ffd0;box-shadow:0 4px 18px rgba(0,0,0,.35);font:800 11px/1.2 system-ui,sans-serif;letter-spacing:.08em;pointer-events:none;box-sizing:border-box}',
    '#wzmPanel{position:fixed;left:12px;top:50%;transform:translateY(-50%);z-index:2147483000;box-sizing:border-box;width:min(210px,calc(100vw - 24px));max-width:calc(100vw - 24px);min-width:0;max-height:78vh;overflow-x:hidden;overflow-y:auto;margin:0;padding:10px;background:linear-gradient(var(--room,#171a1f),var(--room2,#101216));border:1px solid var(--line,rgba(255,255,255,.12));color:var(--ink,#f3f0e7)}',
    '#wzmPanel *,#wzmPanel *::before,#wzmPanel *::after{box-sizing:border-box;min-width:0}',
    '#wzmPanel .wzm-head{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;max-width:100%;margin-bottom:8px;color:var(--ink-dim,#a9aaa6);font:700 12px/1.2 var(--font-ui,system-ui);letter-spacing:.1em;text-transform:uppercase}',
    '#wzmPanel .wzm-head span{display:block;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '#wzmPanel .wzm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;width:100%;min-width:0}',
    '#wzmPanel button{display:block;width:100%;min-width:0;max-width:100%;min-height:36px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:7px 9px;border:1px solid var(--line,#454950);background:rgba(255,255,255,.035);color:var(--ink,#f3f0e7);text-align:left;font:600 13px/1.2 var(--font-ui,system-ui);cursor:pointer}',
    '#wzmPanel button[data-zombie-type="fast"]{border-color:rgba(220,48,61,.6)}',
    '#wzmPanel button[data-zombie-type="fast"][aria-pressed="true"]{border-color:#f04452;background:rgba(181,31,43,.24);color:#ff7b85}',
    '#wzmPanel button[aria-pressed=true]:not([data-zombie-type="fast"]){border-color:var(--accent,#ffc21a);background:rgba(255,194,26,.13);color:var(--accent,#ffc21a)}',
    '#wzmPanel .wzm-note{display:-webkit-box;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;max-height:2.8em;margin:8px 0 0;color:var(--ink-faint,#a4a4a4);font-size:11px;line-height:1.4;overflow-wrap:anywhere}',
    '@media(max-width:520px){#wzmStatus{right:3px;font-size:9px;padding:9px 5px}#wzmPanel{left:6px;width:min(180px,calc(100vw - 12px));max-width:calc(100vw - 12px);padding:8px}#wzmPanel button{min-height:32px;padding:6px;font-size:12px}}'
  ].join('');
  document.head.appendChild(style);

  const status = document.createElement('div');
  status.id = 'wzmStatus';
  status.textContent = 'МОД АКТИВЕН';
  status.setAttribute('aria-label', 'Мод Wreckbox Zombie Menu активен');
  document.body.appendChild(status);

  function findZombieTool(tools) {
    const buttons = Array.from(tools.querySelectorAll('.tool'));
    return buttons.find(button =>
      /зомби|zombie/i.test(button.textContent || '') ||
      /zombie/i.test(button.getAttribute('data-tool') || '')
    ) || null;
  }

  function updateSelection(panel) {
    panel.querySelectorAll('[data-zombie-type]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.zombieType === selectedType));
    });
    const type = types.find(item => item.id === selectedType) || types[0];
    const note = panel.querySelector('.wzm-note');
    if (note) note.textContent = type.note;
    window.__WRECKBOX_SELECTED_ZOMBIE_TYPE__ = selectedType;
    window.__WRECKBOX_SELECTED_ZOMBIE_CONFIG__ = typeConfig[selectedType] || typeConfig.standard;
  }

  function render() {
    const options = document.getElementById('optExtra');
    const tools = document.getElementById('tools');
    if (!options || !tools) {
      status.title = 'Скрипт загружен, но элементы меню игры не найдены.';
      return;
    }
    const zombieTool = findZombieTool(tools);
    const zombieActive = !!zombieTool && zombieTool.classList.contains('on');
    let panel = document.getElementById('wzmPanel');
    if (!zombieActive) {
      if (panel) panel.remove();
      status.title = zombieTool
        ? 'Мод активен. Выберите существующий элемент зомби, чтобы открыть меню.'
        : 'Мод загружен, но кнопка зомби не найдена среди инструментов.';
      return;
    }
    status.title = 'Мод активен; меню выбора зомби подключено.';
    if (!panel || panel.parentElement !== document.body) {
      if (panel) panel.remove();
      panel = document.createElement('section');
      panel.id = 'wzmPanel';
      panel.setAttribute('aria-label', 'Выбор вида зомби');
      panel.innerHTML = '<div class="wzm-head"><span>Вид зомби</span><span>МОД</span></div><div class="wzm-grid" role="group" aria-label="Виды зомби"></div><p class="wzm-note" aria-live="polite"></p>';
      const grid = panel.querySelector('.wzm-grid');
      types.forEach(type => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.zombieType = type.id;
        button.textContent = type.label;
        button.title = type.label;
        button.addEventListener('click', () => {
          selectedType = type.id;
          updateSelection(panel);
          // Do not dispatch into the game's event system from this prototype:
          // third-party listeners may synchronously mutate game state or hang the UI.
          // Selection remains available through window.__WRECKBOX_SELECTED_ZOMBIE_TYPE__
          // and window.__WRECKBOX_SELECTED_ZOMBIE_CONFIG__.
        });
        grid.appendChild(button);
      });
      document.body.appendChild(panel);
    }
    updateSelection(panel);
  }

  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    const run = () => {
      renderQueued = false;
      render();
    };
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(run);
    } else {
      window.setTimeout(run, 0);
    }
  }

  function init() {
    const options = document.getElementById('optExtra');
    const tools = document.getElementById('tools');
    if (!options || !tools) return false;
    if (initialized) {
      scheduleRender();
      return true;
    }
    initialized = true;
    render();
    observer = new MutationObserver(records => {
      const panel = document.getElementById('wzmPanel');
      const externalChange = records.some(record =>
        !panel || (record.target !== panel && !panel.contains(record.target))
      );
      if (externalChange) scheduleRender();
    });
    observer.observe(options, { childList: true, subtree: true });
    observer.observe(tools, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-tool'] });
    return true;
  }

  if (!init()) {
    document.addEventListener('DOMContentLoaded', init, { once: true });
    window.addEventListener('load', init, { once: true });
  }
})();
