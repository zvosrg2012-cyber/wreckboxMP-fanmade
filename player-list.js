(() => {
  if (window.__wreckboxPlayerListInstalled) return;
  window.__wreckboxPlayerListInstalled = true;

  const palette = ["#e85d5d", "#55a7ff", "#65c879", "#f2c14e", "#bd83ed", "#ff914d", "#4dd0c8", "#f07fb2"];
  const hashName = name => {
    let hash = 0;
    for (const ch of String(name || "").toLowerCase()) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
    return hash % palette.length;
  };
  const getPlayers = () => {
    const candidates = [window.players, window.playerList, window.multiplayer?.players, window.game?.players, window.network?.players];
    for (const value of candidates) {
      const list = value instanceof Map ? [...value.values()] : Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : null;
      if (list) return list.map((p, i) => typeof p === "string" ? { name: p } : ({ ...(p || {}), name: p?.username || p?.name || p?.nickname || p?.displayName || "Player " + (i + 1) }));
    }
    return [];
  };
  const buttonStyle = "font:600 14px Arial,sans-serif;color:#f1eee6;background:#292b2b;border:2px solid #74766f;border-radius:3px;padding:10px 14px;box-shadow:inset 0 0 0 2px #171818;cursor:pointer;letter-spacing:.4px";
  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.textContent = "ИГРОКИ";
  openButton.setAttribute("aria-label", "Открыть список игроков");
  openButton.style.cssText = buttonStyle + ";position:fixed;right:18px;bottom:18px;z-index:2147483000";
  document.body.appendChild(openButton);

  const panel = document.createElement("section");
  panel.style.cssText = "display:none;position:fixed;right:18px;bottom:68px;z-index:2147483000;width:min(320px,calc(100vw - 36px));max-height:60vh;overflow:auto;background:#252727;color:#f1eee6;border:3px solid #74766f;box-shadow:inset 0 0 0 3px #171818,0 8px 28px #0009;padding:14px;font:14px Arial,sans-serif";
  panel.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><strong style="font-size:16px;letter-spacing:1px">ИГРОКИ</strong><button type="button" data-close style="' + buttonStyle + ';padding:4px 9px">✕</button></div><div data-list></div><div style="display:flex;align-items:center;gap:8px;border-top:1px solid #62645f;margin-top:12px;padding-top:12px"><span style="color:#c5c7c0">ЛОББИ</span><strong data-code style="font-size:18px;letter-spacing:2px"></strong><button type="button" data-copy style="' + buttonStyle + ';margin-left:auto;padding:7px 10px">Копировать</button></div>';
  document.body.appendChild(panel);
  let lobbyCode = String(Math.floor(10000 + Math.random() * 90000));
  panel.querySelector("[data-code]").textContent = lobbyCode;
  const render = () => {
    const list = panel.querySelector("[data-list]");
    const players = getPlayers();
    list.replaceChildren();
    if (!players.length) {
      const empty = document.createElement("div");
      empty.textContent = "Игроки пока не отображаются";
      empty.style.cssText = "padding:12px 0;color:#c5c7c0";
      list.appendChild(empty);
      return;
    }
    players.forEach((player, i) => {
      const name = String(player.name || "Player " + (i + 1));
      const color = palette[hashName(name)];
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:10px;padding:8px 2px;border-bottom:1px solid #444744";
      const icon = document.createElement("span");
      icon.textContent = "●";
      icon.style.cssText = "font-size:20px;color:" + color;
      const label = document.createElement("span");
      label.textContent = name;
      label.style.cssText = "overflow-wrap:anywhere";
      row.append(icon, label);
      list.appendChild(row);
    });
  };
  openButton.addEventListener("click", () => {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
    if (panel.style.display === "block") render();
  });
  panel.querySelector("[data-close]").addEventListener("click", () => panel.style.display = "none");
  panel.querySelector("[data-copy]").addEventListener("click", async event => {
    try {
      await navigator.clipboard.writeText(lobbyCode);
      event.currentTarget.textContent = "Скопировано";
      setTimeout(() => event.currentTarget.textContent = "Копировать", 1200);
    } catch {
      const field = document.createElement("textarea");
      field.value = lobbyCode;
      panel.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
  });
})();