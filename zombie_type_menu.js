/* WreckboxMP zombie menu — guarded and throttled version. */
(() => {
  'use strict';
  if (window.__WRECKBOX_ZOMBIE_MOD_LOADED__) return;
  window.__WRECKBOX_ZOMBIE_MOD_LOADED__ = true;

  const types = [
    { id: 'standard', label: 'Обычный', note: 'Стандартный тип игры.' },
    { id: 'fast', label: 'Быстрый', note: 'Скорость пока не меняется.' },
    { id: 'heavy', label: 'Тяжёлый', note: 'Прочность пока не меняется.' },
    { id: 'hunter', label: 'Охотник', note: 'Поведение пока не меняется.' }
  ];
  let selected = 'standard';
  let observer;
  let bootObserver;
  let queued = false;
  let status;

  const nextFrame = window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : fn => window.setTimeout(fn, 0);

  function ensureUi() {
    if (!document.getElementById('wzmStyle')) {
      const style = document.createElement('style');
      style.id = 'wzmStyle';
      style.textContent = '#wzmStatus{position:fixed;z-index:2147483000;right:10px;top:50%;transform:translateY(-50%);writing-mode:vertical-rl;padding:10px 7px;border:1px solid #59c783;border-radius:8px;background:rgba(13,35,24,.94);color:#b8ffd0;font:800 11px/1.2 system-ui,sans-serif;pointer-events:none}#wzmPanel{margin-top:10px;padding:10px;background:var(--room,#171a1f);border:1px solid var(--line,rgba(255,255,255,.12));color:var(--ink,#f3f0e7)}#wzmPanel .wzm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}#wzmPanel button{min-height:34px;padding:7px;border:1px solid var(--line,#454950);background:rgba(255,255,255,.035);color:var(--ink,#f3f0e7);text-align:left;cursor:pointer}#wzmPanel button[aria-pressed=true]{border-color:var(--accent,#ffc21a);color:var(--accent,#ffc21a)}#wzmPanel .wzm-note{font-size:11px;line-height:1.4}';
      (document.head || document.documentElement).appendChild(style);
    }
    status = document.getElementById('wzmStatus');
    if (!status && document.body) {
      status = document.createElement('div');
      status.id = 'wzmStatus';
      status.textContent = 'МОД АКТИВЕН';
      status.title = 'Скрипт загружен; проверяется интерфейс игры.';
      document.body.appendChild(status);
    }
  }

  function findZombieTool(tools) {
    const exact = tools.querySelector('[data-tool="zombie"]');
    if (exact) return exact;
    for (const el of tools.querySelectorAll('button,[role="button"],.tool')) {
      if (/зомби|zombie/i.test(el.textContent || '') ||
          /zombie/i.test(el.getAttribute('data-tool') || '')) return el;
    }
    return null;
  }

  function active(el) {
    return !!el && (el.classList.contains('on') ||
      el.getAttribute('aria-pressed') === 'true' ||
      el.getAttribute('aria-selected') === 'true');
  }

  function render() {
    queued = false;
    try {
      const options = document.getElementById('optExtra');
      const tools = document.getElementById('tools');
      if (!options || !tools) return;
      const tool = findZombieTool(tools);
      let panel = document.getElementById('wzmPanel');
      if (!active(tool)) {
        if (panel) panel.remove();
        if (status) status.title = tool
          ? 'Мод загружен. Выберите элемент зомби, чтобы открыть меню.'
          : 'Мод загружен, но элемент зомби не найден.';
        return;
      }
      if (panel && panel.parentElement !== options) {
        panel.remove();
        panel = null;
      }
      if (!panel) {
        panel = document.createElement('section');
        panel.id = 'wzmPanel';
        panel.innerHTML = '<b>Вид зомби</b><div class="wzm-grid"></div><p class="wzm-note"></p>';
        const grid = panel.querySelector('.wzm-grid');
        for (const type of types) {
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.zombieType = type.id;
          button.textContent = type.label;
          button.setAttribute('aria-pressed', String(type.id === selected));
          button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            selected = type.id;
            refreshSelection(panel);
          });
          grid.appendChild(button);
        }
        options.appendChild(panel);
      }
      if (status) status.title = 'Скрипт загружен; меню выбора подключено.';
      refreshSelection(panel);
    } catch (error) {
      console.error('[Wreckbox Zombie Mod]', error);
      if (status) status.title = 'Ошибка мода — подробности в консоли.';
    }
  }

  function refreshSelection(panel) {
    for (const button of panel.querySelectorAll('[data-zombie-type]')) {
      const value = String(button.dataset.zombieType === selected);
      if (button.getAttribute('aria-pressed') !== value) button.setAttribute('aria-pressed', value);
    }
    const type = types.find(item => item.id === selected) || types[0];
    const note = selected === 'standard'
      ? type.note
      : type.note + ' Игровой эффект пока не подключён.';
    const noteEl = panel.querySelector('.wzm-note');
    if (noteEl && noteEl.textContent !== note) noteEl.textContent = note;
    window.__WRECKBOX_SELECTED_ZOMBIE_TYPE__ = selected;
  }

  function schedule() {
    if (queued) return;
    queued = true;
    nextFrame(render);
  }

  function init() {
    ensureUi();
    if (!document.getElementById('tools') || !document.getElementById('optExtra')) {
      if (!bootObserver && document.documentElement) {
        bootObserver = new MutationObserver(() => {
          if (document.getElementById('tools') && document.getElementById('optExtra')) {
            bootObserver.disconnect();
            bootObserver = null;
            init();
          }
        });
        bootObserver.observe(document.documentElement, { childList: true, subtree: true });
      }
      return;
    }
    if (bootObserver) {
      bootObserver.disconnect();
      bootObserver = null;
    }
    if (observer) return;
    observer = new MutationObserver(schedule);
    observer.observe(document.getElementById('tools'), {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['class', 'data-tool', 'aria-pressed', 'aria-selected']
    });
    observer.observe(document.getElementById('optExtra'), { childList: true });
    schedule();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
