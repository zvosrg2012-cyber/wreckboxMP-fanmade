/* Integrated Wreckbox zombie-type panel.
   Loaded by index.html; uses the existing Zombie tool and its #optExtra panel.
   No separate game loop or external software is started. */
(() => {
  "use strict";

  const style = document.createElement("style");
  style.textContent = `
    #zombieTypeMenu {
      margin-top: 10px;
      padding: 10px;
      background: linear-gradient(var(--room, #171a1f), var(--room2, #101216));
      border: 1px solid var(--line, rgba(255,255,255,.1));
      box-shadow: inset 0 0 0 1px rgba(0,0,0,.35);
    }
    #zombieTypeMenu .zt-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
      color: var(--ink-dim);
      font: 700 12px/1.2 var(--font-ui);
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    #zombieTypeMenu .zt-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
    }
    #zombieTypeMenu button {
      min-height: 36px;
      padding: 7px 9px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,.035);
      color: var(--ink);
      text-align: left;
      font: 600 13px/1.2 var(--font-ui);
      cursor: pointer;
    }
    #zombieTypeMenu button[aria-pressed="true"] {
      border-color: var(--accent);
      background: rgba(255,194,26,.13);
      color: var(--accent);
    }
    #zombieTypeMenu button:disabled {
      opacity: .48;
      cursor: not-allowed;
    }
    #zombieTypeMenu .zt-note {
      margin: 8px 0 0;
      color: var(--ink-faint);
      font-size: 11px;
      line-height: 1.35;
    }
    @media (max-width: 520px) {
      #zombieTypeMenu { padding: 8px; }
      #zombieTypeMenu button { min-height: 32px; padding: 6px; font-size: 12px; }
    }
  `;
  document.head.appendChild(style);

  function init() {
    const options = document.getElementById("optExtra");
    const tools = document.getElementById("tools");
    if (!options || !tools) return false;

    function render() {
      const zombieActive = !!tools.querySelector('.tool.on[data-tool="zombie"]');
      let panel = document.getElementById("zombieTypeMenu");

      if (!zombieActive) {
        if (panel) panel.remove();
        return;
      }
      if (panel && panel.parentElement === options) return;
      if (panel) panel.remove();

      panel = document.createElement("section");
      panel.id = "zombieTypeMenu";
      panel.setAttribute("aria-label", "Выбор вида зомби");
      panel.innerHTML = `
        <div class="zt-head"><span>Вид зомби</span><span>1 доступен</span></div>
        <div class="zt-grid" role="group" aria-label="Виды зомби">
          <button type="button" data-zombie-type="standard" aria-pressed="true">Обычный</button>
          <button type="button" disabled aria-disabled="true">Быстрый · позже</button>
          <button type="button" disabled aria-disabled="true">Тяжёлый · позже</button>
          <button type="button" disabled aria-disabled="true">Охотник · позже</button>
        </div>
        <p class="zt-note">Сейчас работает стандартный вид. Новые виды и их поведение добавим отдельно.</p>
      `;
      options.appendChild(panel);
    }

    const observer = new MutationObserver(render);
    observer.observe(options, { childList: true, subtree: true });
    observer.observe(tools, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-tool"]
    });
    render();
    return true;
  }

  if (!init()) {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  }
})();
