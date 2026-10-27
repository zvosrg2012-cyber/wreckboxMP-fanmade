/* WreckboxMP 1.9.2 mod prototype.
   Standard is the only type with implemented game behavior.
   Fast, Heavy, and Hunter are selectable UI placeholders for now. */
(() => {
  'use strict';
  if (window.__WRECKBOX_ZOMBIE_MOD_LOADED__) return;
  window.__WRECKBOX_ZOMBIE_MOD_LOADED__ = true;

  const types = [
    { id: 'standard', label: 'Обычный', note: 'Стандартный тип игры.' },
    { id: 'fast', label: 'Быстрый', note: 'Заготовка меню: скорость пока не меняется.' },
    { id: 'heavy', label: 'Тяжёлый', note: 'Заготовка меню: прочность пока не меняется.' },
    { id: 'hunter', label: 'Охотник', note: 'Заготовка меню: поведение пока не меняется.' }
  ];
  let selectedType = 'standard';
  let observer = null;

  const style = document.createElement('style');
  style.textContent = [
    '#wzmStatus{position:fixed;z-index:2147483000;right:10px;top:50%;transform:translateY(-50%);writing-mode:vertical-rl;padding:12px 7px;border:1px solid #59c783;border-radius:8px;background:rgba(13,35,24,.94);color:#b8ffd0;box-shadow:0 4px 18px rgba(0,0,0,.35);font:800 11px/1.2 system-ui,sans-serif;letter-spacing:.08em;pointer-events:none}',
    '#wzmPanel{margin-top:10px;padding:10px;background:linear-gradient(var(--room,#171a1f),var(--room2,#101216));border:1px solid var(--line,rgba(255,255,255,.12));color:var(--ink,#f3f0e7)}',
    '#wzmPanel .wzm-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;color:var(--ink-dim,#a9aaa6);font:700 12px/1.2 var(--font-ui,system-ui);letter-spacing:.1em;text-transform:uppercase}',
    '#wzmPanel .wzm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}',
    '#wzmPanel button{min-height:36px;padding:7px 9px;border:1px solid var(--line,#454950);background:rgba(255,255,255,.035);color:var(--ink,#f3f0e7);text-align:left;font:600 13px/1.2 var(--font-ui,system-ui);cursor:pointer}',
    '#wzmPanel button[aria-pressed=true]{border-color:var(--accent,#ffc21a);background:rgba(255,194,26,.13);color:var(--accent,#ffc21a)}',
    '#wzmPanel .wzm-note{margin:8px 0 0;color:var(--ink-faint,#a4a4a4);font-size:11px;line-height:1.4}',
    '@media(max-width:520px){#wzmStatus{right:3px;font-size:9px;padding:9px 5px}#wzmPanel{padding:8px}#wzmPanel button{min-height:32px;padding:6px;font-size:12px}}'
  ].join('');
  document.head.appendChild(style);

  const status = document.createElement('div');
  status.id = 'wzmStatus';
  status.textContent = 'МОД АКТИВЕН';
  status.setAttribute('aria-label', 'Мод Wreckbox Zombie Menu активен');
  document.body.appendChild(status);

  function findZombieTool(tools) {
    const buttons = Array.from(tools.querySelectorAll('.tool'));
    return buttons.find(button => /зомби|zombie/i.test(button.textContent || '') ||
      /zombie/i.test(button.getAttribute('data-tool') || '')) || null;
  }

  function updateSelection(panel) {
    panel.querySelectorAll('[data-zombie-type]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.zombieType === selectedType));
    });
    const type = types.find(item => item.id === selectedType) || types[0];
    const note = panel.querySelector('.wzm-note');
    if (note) note.textContent = selectedType === 'standard'
      ? type.note
      : type.note + ' Выбор пока действует только в интерфейсе; игровой эффект не подключён.';
    window.__WRECKBOX_SELECTED_ZOMBIE_TYPE__ = selectedType;
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
    if (!panel || panel.parentElement !== options) {
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
        button.addEventListener('click', () => {
          selectedType = type.id;
          window.__WRECKBOX_SELECTED_ZOMBIE_TYPE__ = type.id;
          updateSelection(panel);
        });
        grid.appendChild(button);
      });
      options.appendChild(panel);
    }
    updateSelection(panel);
  }

  function init() {
    render();
    const options = document.getElementById('optExtra');
    const tools = document.getElementById('tools');
    if (!options || !tools) return false;
    if (observer) observer.disconnect();
    observer = new MutationObserver(render);
    observer.observe(options, { childList: true, subtree: true });
    observer.observe(tools, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-tool'] });
    return true;
  }

  if (!init()) {
    document.addEventListener('DOMContentLoaded', init, { once: true });
    window.addEventListener('load', init, { once: true });
  }
})();
