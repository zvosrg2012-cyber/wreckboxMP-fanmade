/* Integrated Wreckbox zombie-type panel.
   Uses the existing Zombie tool and #optExtra panel; no separate game loop. */
(() => {
  "use strict";
  if (window.__WRECKBOX_ROOT_ZOMBIE_MENU_LOADED__) return;
  window.__WRECKBOX_ROOT_ZOMBIE_MENU_LOADED__ = true;

  const types = [
    { id: "standard", label: "Обычный", note: "Стандартный тип игры." },
    { id: "fast", label: "Быстрый", note: "Красный вид, кровавый эффект и синие светящиеся глаза в темноте; скорость и враждебность требуют подключения к игровой логике." },
    { id: "heavy", label: "Тяжёлый", note: "Тип пока не подключён к игровой логике." },
    { id: "hunter", label: "Охотник", note: "Тип пока не подключён к игровой логике." }
  ];
  const configs = {
    standard: { speedMultiplier: 1, bodyColor: null, eyeColor: null, bloody: false, glowEyesInDark: false, hostileToOtherZombieTypes: false },
    fast: { speedMultiplier: 1.75, bodyColor: "#b51f2b", eyeColor: "#278dff", bloody: true, glowEyesInDark: true, hostileToOtherZombieTypes: true },
    heavy: { speedMultiplier: 1, bodyColor: null, eyeColor: null, bloody: false, glowEyesInDark: false, hostileToOtherZombieTypes: false },
    hunter: { speedMultiplier: 1, bodyColor: null, eyeColor: null, bloody: false, glowEyesInDark: false, hostileToOtherZombieTypes: false }
  };
  let selected = "standard";
  let observer = null;
  let initialized = false;
  let renderQueued = false;

  window.__WRECKBOX_ZOMBIE_TYPE_CONFIG__ = configs;
  window.__WRECKBOX_SELECTED_ZOMBIE_TYPE__ = selected;

  const style = document.createElement("style");
  style.textContent = `
    #zombieTypeMenu {
      box-sizing: border-box;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow: hidden;
      margin-top: 10px;
      padding: 10px;
      background: linear-gradient(var(--room, #171a1f), var(--room2, #101216));
      border: 1px solid var(--line, rgba(255,255,255,.1));
      box-shadow: inset 0 0 0 1px rgba(0,0,0,.35);
      color: var(--ink, #f3f0e7);
    }
    #zombieTypeMenu *, #zombieTypeMenu *::before, #zombieTypeMenu *::after {
      box-sizing: border-box;
      min-width: 0;
    }
    #zombieTypeMenu .zt-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      max-width: 100%;
      margin-bottom: 8px;
      color: var(--ink-dim, #a9aaa6);
      font: 700 12px/1.2 var(--font-ui, system-ui);
      letter-spacing: .1em;
      text-transform: uppercase;
    }
    #zombieTypeMenu .zt-head span {
      display: block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #zombieTypeMenu .zt-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
      width: 100%;
      min-width: 0;
    }
    #zombieTypeMenu button {
      display: block;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      min-height: 36px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 7px 9px;
      border: 1px solid var(--line, #454950);
      background: rgba(255,255,255,.035);
      color: var(--ink, #f3f0e7);
      text-align: left;
      font: 600 13px/1.2 var(--font-ui, system-ui);
      cursor: pointer;
    }
    #zombieTypeMenu button[data-zombie-type="fast"] { border-color: rgba(220,48,61,.6); }
    #zombieTypeMenu button[data-zombie-type="fast"][aria-pressed="true"] {
      border-color: #f04452;
      background: rgba(181,31,43,.24);
      color: #ff7b85;
    }
    #zombieTypeMenu button[aria-pressed="true"]:not([data-zombie-type="fast"]) {
      border-color: var(--accent, #ffc21a);
      background: rgba(255,194,26,.13);
      color: var(--accent, #ffc21a);
    }
    #zombieTypeMenu .zt-note {
      display: -webkit-box;
      max-width: 100%;
      max-height: 2.8em;
      overflow: hidden;
      overflow-wrap: anywhere;
      text-overflow: ellipsis;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      margin: 8px 0 0;
      color: var(--ink-faint, #a4a4a4);
      font-size: 11px;
      line-height: 1.4;
    }
    @media (max-width: 520px) {
      #zombieTypeMenu { padding: 8px; }
      #zombieTypeMenu button { min-height: 32px; padding: 6px; font-size: 12px; }
    }
  `;
  document.head.appendChild(style);

  function findZombieTool(tools) {
    return Array.from(tools.querySelectorAll(".tool")).find(tool =>
      /zombie|зомби/i.test((tool.textContent || "") + " " + (tool.getAttribute("data-tool") || ""))
    ) || null;
  }

  function update(panel) {
    panel.querySelectorAll("[data-zombie-type]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.zombieType === selected));
    });
    const type = types.find(item => item.id === selected) || types[0];
    const note = panel.querySelector(".zt-note");
    if (note) note.textContent = type.note;
    window.__WRECKBOX_SELECTED_ZOMBIE_TYPE__ = selected;
    window.__WRECKBOX_SELECTED_ZOMBIE_CONFIG__ = configs[selected] || configs.standard;
  }

  function render() {
    const options = document.getElementById("optExtra");
    const tools = document.getElementById("tools");
    if (!options || !tools) return;
    const zombieTool = findZombieTool(tools);
    const active = !!zombieTool && zombieTool.classList.contains("on");
    let panel = document.getElementById("zombieTypeMenu");
    if (!active) {
      if (panel) panel.remove();
      return;
    }
    if (!panel || panel.parentElement !== options) {
      if (panel) panel.remove();
      panel = document.createElement("section");
      panel.id = "zombieTypeMenu";
      panel.setAttribute("aria-label", "Выбор вида зомби");
      panel.innerHTML = '<div class="zt-head"><span>Вид зомби</span><span>МОД</span></div><div class="zt-grid" role="group" aria-label="Виды зомби"></div><p class="zt-note" aria-live="polite"></p>';
      const grid = panel.querySelector(".zt-grid");
      types.forEach(type => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.zombieType = type.id;
        button.textContent = type.label;
        button.title = type.label;
        button.addEventListener("click", () => {
          selected = type.id;
          update(panel);
          try {
            window.dispatchEvent(new CustomEvent("wzm:zombie-type-change", {
              detail: { type: selected, config: window.__WRECKBOX_SELECTED_ZOMBIE_CONFIG__ }
            }));
          } catch (_) {}
        });
        grid.appendChild(button);
      });
      options.appendChild(panel);
    }
    update(panel);
  }

  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    const run = () => { renderQueued = false; render(); };
    if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(run);
    else window.setTimeout(run, 0);
  }

  function init() {
    const options = document.getElementById("optExtra");
    const tools = document.getElementById("tools");
    if (!options || !tools) return false;
    if (initialized) { scheduleRender(); return true; }
    initialized = true;
    render();
    observer = new MutationObserver(records => {
      const panel = document.getElementById("zombieTypeMenu");
      if (records.some(record => !panel || (record.target !== panel && !panel.contains(record.target)))) {
        scheduleRender();
      }
    });
    observer.observe(options, { childList: true, subtree: true });
    observer.observe(tools, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-tool"] });
    return true;
  }

  if (!init()) {
    document.addEventListener("DOMContentLoaded", init, { once: true });
    window.addEventListener("load", init, { once: true });
  }
})();
