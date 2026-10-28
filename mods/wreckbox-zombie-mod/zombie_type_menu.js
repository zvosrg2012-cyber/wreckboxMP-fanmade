/* WreckboxMP 1.9.2 zombie menu mod.
   Keeps the menu lightweight and constrains long text so it cannot stretch
   the game's existing options panel. Game-side NPC effects require a game hook. */
(() => {
  'use strict';
  if (window.__WRECKBOX_ZOMBIE_MOD_LOADED__) return;
  window.__WRECKBOX_ZOMBIE_MOD_LOADED__ = true;

  const types = [
    { id: 'standard', label: 'Обычный', note: 'Стандартный тип игры.' },
    { id: 'fast', label: 'Быстрый', note: 'Красный вид, кровавый эффект и синие светящиеся глаза в темноте; высокая скорость и враждебность к другим типам требуют подключения к игровому коду.' },
    { id: 'heavy', label: 'Тяжёлый', note: 'Тип пока не подключён к игровой логике.' },
    { id: 'hunter', label: 'Охотник', note: 'Тип пока не подключён к игровой логике.' }
  ];
  let selectedType = 'standard';
  let observer = null;
  let renderQueued = false;
  let initialized = false;

  // Config is exposed for the game's NPC logic to consume; declaring it alone
  // does not alter NPCs until a compatible game-side handler reads it.
  const typeConfig = {
    standard: { speedMultiplier: 1, bodyColor: null, eyeColor: null, bloody: false, glowEyesInDark: false, hostileToOtherZombieTypes: false },
    fast: { speedMultiplier: 1.75, bodyColor: '#b51f2b', eyeColor: '#278dff', bloody: true, glowEyesInDark: true, hostileToOtherZombieTypes: true },
    heavy: { speedMultiplier: 1, bodyColor: null, eyeColor: null, bloody: false, glowEyesInDark: false, hostileToOtherZombieTypes: false },
    hunter: { speedMultiplier: 1, bodyColor: null, eyeColor: null, bloody: false, glowEyesInDark: false, hostileToOtherZombieTypes: false }
  };
  window.__WRECKBOX_ZOMBIE_TYPE_CONFIG__ = typeConfig;
  window.__WRECKBOX_SELECTED_ZOMBIE_TYPE__ = selectedType;

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
