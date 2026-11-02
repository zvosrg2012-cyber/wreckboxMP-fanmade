/* WreckboxMP fan mod: Map editor (v1).
 * - Time is frozen while editing (the game's own pause flag), the game's bottom toolbar is hidden.
 * - Every material (including the ones the original build menu does not offer), every background and every prop
 *   from the game's own tables can be placed.
 * - Maps are saved as the game's own world snapshot (WBX1): in the browser (IndexedDB), as a downloadable .wbx
 *   file, and they show up as cards in the map picker of the main menu.
 * It relies on internals exposed by possession_hook.js (window.__WZM_GAME__); without them it stays inactive.
 */
(() => {
  'use strict';
  if (window.__WZM_EDITOR__) return;
  const G = () => window.__WZM_GAME__;
  const ED = (window.__WZM_EDITOR__ = { active: false });
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const CELL = 6;

  // ------------------------------------------------------------------ storage (IndexedDB) -------------------
  const openDb = () => new Promise((res, rej) => {
    const r = indexedDB.open('wzm-maps', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('maps', { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const store = async (mode, fn) => {
    const d = await openDb();
    return new Promise((res, rej) => {
      const t = d.transaction('maps', mode), r = fn(t.objectStore('maps'));
      t.oncomplete = () => { d.close(); res(r && r.result); }; t.onerror = () => { d.close(); rej(t.error); };
    });
  };
  const dbAll = () => store('readonly', s => s.getAll()).then(a => (a || []).sort((x, y) => y.time - x.time));
  const dbGet = id => store('readonly', s => s.get(id));
  const dbPut = rec => store('readwrite', s => s.put(rec));
  const dbDel = id => store('readwrite', s => s.delete(id));

  // ------------------------------------------------------------------ small toast ---------------------------
  let toastEl = null, toastT = 0;
  const say = msg => {
    if (!toastEl) { toastEl = el('div', 'wzed-toast'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('on'), 2600);
  };

  // ------------------------------------------------------------------ palette -------------------------------
  const rgb = c => Array.isArray(c) ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')' : '#888';
  const buildPalette = () => {
    const g = G(), out = [], used = new Set();
    for (const e of (g.xA || [])) if (e && e.m !== undefined) {
      used.add(e.m); const s = g.st && g.st[e.m];
      out.push({ kind: 'mat', name: e.name, m: e.m, t: e.t || 0, f: e.f || 0, joints: !!e.joints, color: rgb(s && s.base) });
    }
    for (let id = 1; g.st && id < g.st.length; id++) {
      const s = g.st[id]; if (!s || !s.name || used.has(id)) continue;
      out.push({ kind: 'mat', name: s.name + (out.some(o => o.name === s.name) ? ' (' + id + ')' : ''), m: id, t: 0, f: 0, joints: false, color: rgb(s.base) });
    }
    return out;
  };
  // ------------------------------------------------------------------ state ---------------------------------
  const S = { tool: 'pencil', size: 2, filled: true, sel: null, tab: 'mat', drawing: false, a: null, b: null, stroke: null, last: null,
              undo: [], redo: [], cur: { id: null, name: 'Без названия', thumb: '' }, pal: [], bgOf: {}, propKey: null, search: '' };
  const canvas = () => document.getElementById('game') || document.querySelector('canvas');
  const world = e => {
    const g = G(), cv = canvas(), r = cv.getBoundingClientRect(), z = g.cam.zoom;
    return { x: g.cam.x + ((e.clientX - r.left) * (cv.width / r.width) - cv.width / 2) / z, y: g.cam.y + ((e.clientY - r.top) * (cv.height / r.height) - cv.height / 2) / z };
  };
  const rows = () => { const g = G(); return Math.floor(g.gt.length / g.gw); };
  const inb = (cx, cy) => { const g = G(); return cx >= 0 && cy >= 0 && cx < g.gw && cy < rows(); };
  const snap = i => { const g = G(); return [g.gt[i], g.yt ? g.yt[i] : 0, g.Mt[i], g.vt[i], g.St[i]]; };
  const restore = (i, o) => {
    const g = G(), gw = g.gw;
    if (o[0]) { g.ie(i, o[0], o[2], o[3]); } else if (g.gt[i]) g.ce(i);
    g.St[i] = o[4]; g.Lt[i] = -1; g.se(i);
  };
  const touch = i => { if (S.stroke && !S.stroke.has(i)) S.stroke.set(i, snap(i)); };

  const paintCell = (cx, cy, mode) => {
    const g = G(); if (!inb(cx, cy)) return; const i = cy * g.gw + cx;
    const sel = S.sel;
    if (mode === 'erase') {
      if (g.gt[i]) { touch(i); g.ce(i); g.se(i); } else if (g.St[i]) { touch(i); g.St[i] = 0; g.Lt[i] = -1; g.se(i); }
      return;
    }
    if (!sel) return;
    if (sel.kind === 'mat') {
      touch(i); if (g.gt[i]) g.ce(i);
      g.ie(i, sel.m, sel.t, 1 | sel.f);
    } else if (sel.kind === 'bg') {
      if (g.St[i] === sel.bg) return; touch(i); g.St[i] = sel.bg; g.Lt[i] = -1; g.se(i);
    }
  };
  const stamp = (wx, wy, mode) => {
    const cx = Math.floor(wx / CELL), cy = Math.floor(wy / CELL), r = S.size - 0.5;
    const n = Math.ceil(r);
    for (let y = -n; y <= n; y++) for (let x = -n; x <= n; x++) if (x * x + y * y <= r * r + 0.3) paintCell(cx + x, cy + y, mode);
  };
  const lineCells = (x0, y0, x1, y1, fn) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) fn(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n));
  };
  const rectCells = (a, b, fn) => {
    const x0 = Math.min(a.cx, b.cx), x1 = Math.max(a.cx, b.cx), y0 = Math.min(a.cy, b.cy), y1 = Math.max(a.cy, b.cy);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (S.filled || x === x0 || x === x1 || y === y0 || y === y1) fn(x, y);
  };
  const flood = (cx, cy, mode) => {
    const g = G(); if (!inb(cx, cy)) return; const gw = g.gw;
    const isBg = !!(S.sel && S.sel.kind === 'bg') && mode !== 'erase';
    const key = i => isBg ? g.St[i] : g.gt[i];
    const start = cy * gw + cx, want = key(start);
    if (!isBg && S.sel && S.sel.kind === 'mat' && want === S.sel.m && mode !== 'erase') return;
    if (isBg && want === S.sel.bg) return;
    const q = [start], seen = new Set([start]); let n = 0;
    while (q.length && n < 60000) {
      const i = q.pop(); n++; paintCell(i % gw, (i / gw) | 0, mode);
      const x = i % gw, y = (i / gw) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) continue; const j = ny * gw + nx;
        if (!seen.has(j) && key(j) === want) { seen.add(j); q.push(j); }
      }
    }
  };
  const pushUndo = () => { if (S.stroke && S.stroke.size) { S.undo.push(S.stroke); if (S.undo.length > 60) S.undo.shift(); S.redo.length = 0; } S.stroke = null; };
  const swap = (from, to) => {
    const m = from.pop(); if (!m) return; const cur = new Map();
    for (const [i, o] of m) { cur.set(i, snap(i)); restore(i, o); }
    to.push(cur);
  };

  // ------------------------------------------------------------------ props / people ------------------------------
  const placeProp = (wx, wy) => {
    const g = G(); if (!S.propKey || !g.wA) return;
    try { g.wA(S.propKey, wx, wy); } catch (e) { say('Не удалось поставить предмет'); }
  };
  const deleteNear = (wx, wy) => {
    const g = G(); let best = null, bd = 1e9;
    for (const o of g.Xa || []) {
      if (o.dead || !o.pt) continue;
      const d = Math.hypot(o.x - wx, o.y - wy); if (d < Math.max(14, (o.pw || 20) * 0.6) && d < bd) { bd = d; best = o; }
    }
    if (best) { g.GC(best); return true; }
    for (const r of g.mm || []) if (!r.gone && Math.hypot(r.x - wx, r.y - 12 - wy) < 18) { g.WC(r); return true; }
    return false;
  };
  const placePerson = (wx, wy) => { const g = G(); try { g.BC('person', g.ox(wx, wy)); } catch (e) { say('Не удалось добавить человека'); } };

  // ------------------------------------------------------------------ pointer handling ---------------------------
  const onCanvas = e => { const t = e.target; return !!t && (t.id === 'game' || t.tagName === 'CANVAS'); };
  const cellAt = w => ({ cx: Math.floor(w.x / CELL), cy: Math.floor(w.y / CELL) });
  let hover = { x: 0, y: 0 };
  const applyTool = (w, phase) => {
    const tool = S.tool, c = cellAt(w);
    if (tool === 'pencil' || tool === 'eraser') {
      const mode = tool === 'eraser' ? 'erase' : 'paint';
      if (phase === 'down') { S.stroke = new Map(); S.last = c; stamp(w.x, w.y, mode); }
      else if (phase === 'move' && S.last) { lineCells(S.last.cx, S.last.cy, c.cx, c.cy, (x, y) => stamp((x + 0.5) * CELL, (y + 0.5) * CELL, mode)); S.last = c; }
    } else if (tool === 'fill') { if (phase === 'down') { S.stroke = new Map(); flood(c.cx, c.cy, 'paint'); pushUndo(); } }
    else if (tool === 'line' || tool === 'rect') {
      if (phase === 'down') { S.a = c; S.b = c; } else if (phase === 'move') S.b = c;
      else if (phase === 'up' && S.a) {
        S.stroke = new Map(); S.b = c;
        const fn = (x, y) => stamp((x + 0.5) * CELL, (y + 0.5) * CELL, 'paint');
        if (tool === 'line') lineCells(S.a.cx, S.a.cy, S.b.cx, S.b.cy, fn); else rectCells(S.a, S.b, (x, y) => paintCell(x, y, 'paint'));
        pushUndo(); S.a = S.b = null;
      }
    } else if (tool === 'pick') {
      if (phase === 'down') pick(c);
    } else if (tool === 'prop') { if (phase === 'down') placeProp(w.x, w.y); }
    else if (tool === 'person') { if (phase === 'down') placePerson(w.x, w.y); }
    else if (tool === 'delete') { if (phase === 'down' && !deleteNear(w.x, w.y)) say('Тут нечего удалять'); }
  };
  const pick = c => {
    const g = G(); if (!inb(c.cx, c.cy)) return; const i = c.cy * g.gw + c.cx;
    if (g.gt[i]) { const m = S.pal.find(p => p.m === g.gt[i] && p.t === (g.Mt[i] || 0)) || S.pal.find(p => p.m === g.gt[i]); if (m) { setSel(m); S.tab = 'mat'; renderTabs(); } }
    else if (g.St[i]) { const b = S.pal.find(p => p.m === g.St[i] && p.t === 0); if (b) { S.tab = 'bg'; setSel(S.bgOf[b.m] || (S.bgOf[b.m] = { kind: 'bg', name: b.name, bg: b.m })); } }
    S.tool = 'pencil'; renderTools();
  };
  const blocking = e => ED.active && e.button === 0 && onCanvas(e);
  window.addEventListener('pointerdown', e => {
    if (!blocking(e)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    S.drawing = true; applyTool(world(e), 'down');
  }, true);
  window.addEventListener('pointermove', e => {
    if (!ED.active) return;
    const w = world(e); hover = w;
    if (S.drawing && (e.buttons & 1)) { e.stopImmediatePropagation(); applyTool(w, 'move'); }
    else if (S.drawing) { S.drawing = false; pushUndo(); S.a = S.b = null; }
  }, true);
  window.addEventListener('pointerup', e => {
    if (!ED.active || e.button !== 0 || !S.drawing) return;
    e.stopImmediatePropagation(); S.drawing = false;
    applyTool(world(e), 'up'); if (S.tool === 'pencil' || S.tool === 'eraser') pushUndo(); S.last = null;
  }, true);
  window.addEventListener('keydown', e => {
    if (!ED.active || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
    const k = e.code, ctrl = e.ctrlKey || e.metaKey; let used = true;
    if (ctrl && k === 'KeyZ') swap(e.shiftKey ? S.redo : S.undo, e.shiftKey ? S.undo : S.redo);
    else if (ctrl && k === 'KeyY') swap(S.redo, S.undo);
    else if (ctrl && k === 'KeyS') saveMap();
    else if (!ctrl && k === 'KeyB') setTool('pencil'); else if (!ctrl && k === 'KeyL') setTool('line');
    else if (!ctrl && k === 'KeyR') setTool('rect'); else if (!ctrl && k === 'KeyG') setTool('fill');
    else if (!ctrl && k === 'KeyE') setTool('eraser'); else if (!ctrl && k === 'KeyI') setTool('pick');
    else if (k === 'BracketLeft') setSize(S.size - 1); else if (k === 'BracketRight') setSize(S.size + 1);
    else used = false;
    if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  // ------------------------------------------------------------------ preview drawing -----------------------------
  const prevDraw = window.__wzmDraw;
  window.__wzmDraw = function (ctx) {
    if (typeof prevDraw === 'function') prevDraw.apply(this, arguments);
    if (!ED.active) return;
    try { drawGhost(ctx); } catch (_) {}
  };
  const drawGhost = ctx => {
    const g = G(), z = g.cam.zoom; ctx.save(); ctx.lineWidth = Math.max(1, 1.5 / z);
    ctx.strokeStyle = 'rgba(255,194,26,0.95)'; ctx.fillStyle = 'rgba(255,194,26,0.16)'; ctx.setLineDash([4 / z, 3 / z]);
    const box = (a, b) => { const x0 = Math.min(a.cx, b.cx) * CELL, y0 = Math.min(a.cy, b.cy) * CELL, w = (Math.abs(a.cx - b.cx) + 1) * CELL, h = (Math.abs(a.cy - b.cy) + 1) * CELL; ctx.fillRect(x0, y0, w, h); ctx.strokeRect(x0, y0, w, h); };
    const c = cellAt(hover);
    if (S.tool === 'rect' && S.a) box(S.a, S.b || c);
    else if (S.tool === 'line' && S.a) { lineCells(S.a.cx, S.a.cy, (S.b || c).cx, (S.b || c).cy, (x, y) => ctx.fillRect(x * CELL, y * CELL, CELL, CELL)); }
    else if (S.tool === 'pencil' || S.tool === 'eraser' || S.tool === 'line' || S.tool === 'rect') {
      ctx.beginPath(); ctx.arc((c.cx + 0.5) * CELL, (c.cy + 0.5) * CELL, (S.size - 0.5) * CELL + 1, 0, 7); ctx.fill(); ctx.stroke();
    } else if (S.tool === 'fill' || S.tool === 'pick') { ctx.strokeRect(c.cx * CELL, c.cy * CELL, CELL, CELL); }
    else if (S.tool === 'prop' && S.propKey) {
      const d = g.wc && g.wc[S.propKey]; if (d) { ctx.strokeRect(hover.x - d.w / 2, hover.y - d.h / 2, d.w, d.h); }
    } else if (S.tool === 'delete') { ctx.beginPath(); ctx.arc(hover.x, hover.y, 14, 0, 7); ctx.stroke(); }
    ctx.restore();
  };

  // ------------------------------------------------------------------ world operations ----------------------------
  // A flat map: every column becomes a copy of one plain terrain column taken from the current world; everything
  // above ground, all props and all people are removed.
  const flatten = () => {
    const g = G(), gw = g.gw, R = rows(), TERRAIN = { 8: 1, 9: 1, 11: 1, 13: 1 };
    let tx = -1;
    for (let d = 0; d < gw / 2 && tx < 0; d++) for (const x of [(gw >> 1) + d, (gw >> 1) - d]) {
      if (x < 0 || x >= gw) continue; let ok = true;
      for (let y = g.Rt[x]; y < R && ok; y++) { const v = g.gt[y * gw + x]; if (v && !TERRAIN[v]) ok = false; }
      if (ok) { tx = x; break; }
    }
    if (tx < 0) tx = gw >> 1;
    const T = g.Rt[tx], col = [];
    for (let y = 0; y < R; y++) col.push(snap(y * gw + tx));
    for (const o of (g.Xa || []).slice()) if (o && o.pt && !o.dead) { try { g.GC(o); } catch (_) {} }
    for (const r of (g.mm || []).slice()) if (!r.gone) { try { g.WC(r); } catch (_) {} }
    for (let x = 0; x < gw; x++) {
      if (x !== tx) for (let y = 0; y < R; y++) {
        const i = y * gw + x, want = y < T ? [0, 0, 0, 0, col[0][4]] : col[y];
        if (g.gt[i] === want[0] && g.St[i] === want[4] && g.Mt[i] === want[2] && g.vt[i] === want[3]) continue;
        restore(i, want);
      }
      g.Rt[x] = T;
    }
    S.undo.length = 0; S.redo.length = 0; return T;
  };
  const thumbNow = () => {
    try {
      const cv = canvas(), t = document.createElement('canvas'); t.width = 240; t.height = 135;
      const c = t.getContext('2d'), k = Math.max(240 / cv.width, 135 / cv.height), w = cv.width * k, h = cv.height * k;
      c.drawImage(cv, (240 - w) / 2, (135 - h) / 2, w, h); return t.toDataURL('image/jpeg', 0.75);
    } catch (_) { return ''; }
  };
  const saveMap = async (asNew) => {
    const g = G();
    try {
      let name = S.cur.name;
      if (asNew || !S.cur.id) { const n = window.prompt('Название карты:', name); if (n === null) return; name = n.trim() || name; }
      const gz = await g.Fz(g.Bz());
      const id = (!asNew && S.cur.id) || 'm' + Date.now();
      if (!S.cur.thumb) S.cur.thumb = thumbNow();
      await dbPut({ id, name, time: Date.now(), thumb: S.cur.thumb, data: gz });
      S.cur.id = id; S.cur.name = name; renderFile(); refreshCards();
      say('Карта «' + name + '» сохранена и добавлена в выбор карт');
    } catch (e) { console.error(e); say('Не удалось сохранить карту'); }
  };
  const loadBytes = async (bytes, rec) => {
    const g = G();
    try {
      const raw = await g.Dz(bytes); g.Gz(raw);
      if (rec) S.cur = { id: rec.id, name: rec.name, thumb: rec.thumb || '' }; else S.cur = { id: null, name: 'Без названия', thumb: '' };
      S.undo.length = 0; S.redo.length = 0; g.setOL(true); renderFile(); say('Карта загружена');
    } catch (e) { console.error(e); say('Не удалось загрузить: файл не похож на карту'); }
  };
  const download = async rec => {
    const blob = new Blob([rec.data], { type: 'application/octet-stream' }), a = el('a');
    a.href = URL.createObjectURL(blob); a.download = (rec.name || 'map').replace(/[\\/:*?"<>|]+/g, '_') + '.wbx';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  const downloadCurrent = async () => { const g = G(); try { download({ name: S.cur.name, data: await g.Fz(g.Bz()) }); } catch (e) { say('Не удалось скачать'); } };
  const pickFile = cb => {
    const inp = el('input'); inp.type = 'file'; inp.accept = '.wbx,application/octet-stream';
    inp.onchange = async () => { const f = inp.files && inp.files[0]; if (f) cb(new Uint8Array(await f.arrayBuffer()), f.name.replace(/\.wbx$/i, '')); };
    inp.click();
  };
  const importFileToDb = async (bytes, name) => {
    const g = G();
    try { await g.Dz(bytes); } catch (_) { say('Это не файл карты'); return false; }
    if (!(bytes[0] === 87 || bytes[0] === 31)) { say('Это не файл карты'); return false; }
    await dbPut({ id: 'm' + Date.now(), name: name || 'Карта из файла', time: Date.now(), thumb: '', data: bytes });
    refreshCards(); say('Карта «' + (name || 'из файла') + '» добавлена в выбор карт'); return true;
  };

  // ------------------------------------------------------------------ UI (built from the game's own classes) --
  const CSS = `
  .wzed{position:fixed;z-index:60;color:var(--ink,#f3f0e7);font:600 13px/1.2 var(--font-body,system-ui,sans-serif);user-select:none}
  .wzed *{box-sizing:border-box}
  .wzed.panel{padding:6px}
  .wzed-pal{left:8px;top:64px;bottom:96px;width:312px;display:flex;flex-direction:column;gap:6px}
  .wzed-tabs{display:flex;flex-wrap:wrap;gap:4px}
  .wzed-tabs .chip{height:30px;padding:0 10px;cursor:pointer;font:700 11px/1 var(--font-display,system-ui);letter-spacing:.05em;text-transform:uppercase;color:inherit}
  .wzed-body{flex:1;overflow:auto;padding:2px;scrollbar-width:thin}
  .wzed-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
  .wzed-tile{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 3px 5px;min-height:74px;background:var(--panel-hi,rgba(255,255,255,.07));border:1px solid transparent;border-radius:2px;color:inherit;font:inherit;cursor:pointer}
  .wzed-tile:hover{background:var(--panel-hi2,rgba(255,255,255,.14))}
  .wzed-tile.on{border-color:var(--accent,#ffc21a);background:rgba(255,194,26,.14)}
  .wzed-tile canvas,.wzed-tile .ico{width:44px;height:44px;image-rendering:pixelated;flex:none}
  .wzed-tile .ico svg{width:34px;height:34px;margin:5px}
  .wzed-tile span{font-size:10.5px;line-height:1.1;text-align:center;color:var(--ink-dim,#a9aaa6);word-break:break-word}
  .wzed-tile.on span{color:var(--ink,#f3f0e7)}
  .wzed-h{margin:8px 2px 5px;font:700 11px/1 var(--font-display,system-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--accent,#ffc21a)}
  .wzed input[type=search]{width:100%;height:34px;padding:0 10px;border-radius:2px;border:1px solid var(--line,rgba(255,255,255,.1));background:rgba(0,0,0,.35);color:inherit;font:inherit}
  .wzed-info{font-size:11px;line-height:1.35;color:var(--ink-dim,#a9aaa6);font-weight:500;padding:4px 2px}
  .wzed-bar{left:50%;bottom:10px;transform:translateX(-50%);display:flex;gap:4px;align-items:stretch;max-width:calc(100vw - 16px);overflow-x:auto}
  .wzed-bar .sep{width:1px;background:var(--line,rgba(255,255,255,.12));margin:4px 4px}
  .wzed-size{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:92px;padding:0 6px}
  .wzed-size div{display:flex;gap:4px;align-items:center}
  .wzed-size b{min-width:22px;text-align:center;font:700 15px var(--font-display,system-ui)}
  .wzed-size small{font-size:9.5px;color:var(--ink-dim,#a9aaa6)}
  .wzed-top{right:8px;top:8px;display:flex;gap:6px;align-items:center}
  .wzed-name{left:8px;top:8px;display:flex;align-items:center;gap:8px;height:48px;padding:0 14px!important;font:700 13px var(--font-display,system-ui);letter-spacing:.06em;text-transform:uppercase}
  .wzed-name small{color:var(--ink-dim,#a9aaa6);font-weight:600;letter-spacing:.02em;text-transform:none}
  .wzed-menu{right:8px;top:66px;width:230px;display:flex;flex-direction:column;gap:3px}
  .wzed-menu button{display:flex;align-items:center;gap:8px;height:36px;padding:0 10px;background:var(--panel-hi,rgba(255,255,255,.07));border:1px solid transparent;border-radius:2px;color:inherit;font:600 13px var(--font-body,system-ui);text-align:left;cursor:pointer}
  .wzed-menu button:hover{border-color:var(--accent,#ffc21a)}
  .wzed-menu hr{border:0;border-top:1px solid var(--line,rgba(255,255,255,.12));margin:3px 0;width:100%}
  .wzed-toast{position:fixed;left:50%;top:70px;transform:translateX(-50%);z-index:90;background:rgba(16,18,22,.97);border:1px solid var(--accent,#ffc21a);color:var(--ink,#f3f0e7);padding:9px 16px;font:600 13px system-ui;opacity:0;pointer-events:none;transition:opacity .2s}
  .wzed-toast.on{opacity:1}
  body.wzed-on #hudTop,body.wzed-on #hudBottom,body.wzed-on #hudShow,body.wzed-on #tgCard{display:none!important}
  .wzed-modal{position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center}
  .wzed-modal>div{width:min(580px,92vw);max-height:80vh;overflow:auto;display:flex;flex-direction:column;gap:8px;color:var(--ink,#f3f0e7)}
  .wzed-row{display:flex;gap:8px;align-items:center;background:var(--panel-hi,rgba(255,255,255,.07));padding:6px}
  .wzed-row img{width:96px;height:54px;object-fit:cover;background:#111;flex:none}
  .wzed-row b{flex:1;font:700 13px var(--font-display,system-ui);letter-spacing:.04em;text-transform:uppercase}
  .mapCard.wzm-custom{position:relative}
  .mapCard.wzm-custom .x{position:absolute;right:6px;top:6px;background:rgba(0,0,0,.65);color:#fff;padding:1px 7px;font-size:12px}
  .mapCard.wzm-custom img{width:100%;height:100%;object-fit:cover;display:block}
  `;
  let ui = null;
  const svg = p => '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>';
  const PATH = {
    line: '<path d="M4 20L20 4"/><circle cx="4" cy="20" r="1.7"/><circle cx="20" cy="4" r="1.7"/>',
    rect: '<rect x="4" y="6" width="16" height="12" rx="1"/>',
    fill: '<path d="M5 12l6-7 8 8-7 6z"/><path d="M19 16c1.2 1.6 2 2.7 2 3.6a2 2 0 0 1-4 0c0-.9.8-2 2-3.6z"/>',
    pick: '<path d="M17 3l4 4-3 3-4-4z"/><path d="M14 8L5 17v3h3l9-9"/>',
    trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
    play: '<path d="M7 4l13 8-13 8z"/>', exit: '<path d="M9 4H5v16h4M15 8l4 4-4 4M19 12H9"/>', save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
    folder: '<path d="M3 7h6l2 2h10v10H3z"/>', down: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', up: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
    cam: '<path d="M4 8h4l2-3h4l2 3h4v11H4z"/><circle cx="12" cy="13" r="3.4"/>', flat: '<path d="M3 16h18M3 20h18M7 12V8l5-3 5 3v4"/>'
  };
  const icon = (name, fallback) => { const z = G().zL; return svg((z && z[name]) || PATH[name] || PATH[fallback] || ''); };
  const setSel = s => { S.sel = s; S.propKey = null; if (!['pencil', 'line', 'rect', 'fill'].includes(S.tool)) S.tool = 'pencil'; renderTools(); renderTabs(); };
  const setTool = t => { S.tool = t; renderTools(); renderTabs(); };
  const setSize = n => { S.size = Math.max(1, Math.min(12, n)); if (ui) ui.size.textContent = S.size; };
  const TOOLS = [['pencil', 'Кисть', 'brush'], ['line', 'Линия', 'line'], ['rect', 'Прямоуг.', 'rect'], ['fill', 'Заливка', 'fill'], ['eraser', 'Ластик', 'eraser'], ['pick', 'Пипетка', 'pick'], ['delete', 'Удалить', 'trash']];
  const TIPS = { pencil: 'Кисть (B)', line: 'Линия (L)', rect: 'Прямоугольник (R)', fill: 'Заливка (G)', eraser: 'Ластик (E)', pick: 'Пипетка (I)', delete: 'Удалить предмет или человека' };
  const renderTools = () => { if (!ui) return; for (const b of ui.bar.querySelectorAll('[data-tool]')) b.classList.toggle('on', b.dataset.tool === S.tool || (b.dataset.tool === 'pencil' && (S.tool === 'prop' || S.tool === 'person'))); };

  // pixel-art swatch for a material (dimmed for the background layer)
  const matIcon = (m, bg) => {
    const c = document.createElement('canvas'); c.width = c.height = 40; const x = c.getContext('2d'), base = (G().st[m.m] || {}).base || [128, 128, 128];
    let s = m.m * 7919 + 13; const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const col = k => 'rgb(' + base.map(v => Math.max(0, Math.min(255, Math.round(v * k)))).join(',') + ')';
    for (let cy = 0; cy < 8; cy++) for (let cx = 0; cx < 8; cx++) { x.fillStyle = col(0.88 + rnd() * 0.24); x.fillRect(cx * 5, cy * 5, 5, 5); }
    if (m.m === 2) { x.fillStyle = col(0.55); for (let r = 0; r < 4; r++) { x.fillRect(0, r * 10 + 9, 40, 1); for (let k = (r % 2) * 10 + 5; k < 40; k += 20) x.fillRect(k, r * 10, 1, 10); } }
    else if (m.m === 1) { x.fillStyle = col(0.7); for (let r = 4; r < 40; r += 8) x.fillRect(0, r, 40, 1); x.fillStyle = col(1.25); x.fillRect(0, 12, 40, 1); }
    else if (m.m === 5 || m.m === 17) { x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(6, 30, 3, 3); x.fillRect(10, 24, 3, 3); x.fillRect(14, 18, 3, 3); x.fillRect(18, 12, 3, 3); if (m.m === 17) { x.fillStyle = col(0.6); x.fillRect(19, 0, 2, 40); x.fillRect(0, 19, 40, 2); } }
    else if (m.m === 4 || m.m === 18 || m.m === 19) { x.fillStyle = col(1.35); for (const [px, py] of [[3, 3], [35, 3], [3, 35], [35, 35]]) x.fillRect(px, py, 3, 3); x.fillStyle = col(0.6); x.fillRect(0, 19, 40, 2); }
    else if (m.m === 7) { x.fillStyle = 'rgba(30,20,10,.65)'; for (let k = 4; k < 40; k += 9) x.fillRect(k, 0, 2, 40); for (let r = 4; r < 40; r += 9) x.fillRect(0, r, 40, 2); }
    else if (m.m === 10 || m.m === 16) { x.fillStyle = col(0.6); for (let r = 0; r < 4; r++) x.fillRect(0, r * 10 + 9, 40, 1); }
    else if (m.m === 12) { x.fillStyle = 'rgba(255,230,120,.55)'; for (let k = 0; k < 6; k++) x.fillRect((k * 13) % 36, (k * 17) % 36, 5, 5); }
    x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 2; x.strokeRect(1, 1, 38, 38);
    if (bg) { x.fillStyle = 'rgba(8,10,16,.5)'; x.fillRect(0, 0, 40, 40); x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1; x.strokeRect(4.5, 4.5, 31, 31); }
    return c;
  };
  const propIcon = k => {
    const d = document.createElement('canvas'); d.width = d.height = 44; const x = d.getContext('2d');
    try { const sp = G().zc(k, 0, 0), s = Math.min(40 / sp.width, 40 / sp.height); x.imageSmoothingEnabled = false; x.drawImage(sp, (44 - sp.width * s) / 2, (44 - sp.height * s) / 2, sp.width * s, sp.height * s); } catch (_) {}
    return d;
  };
  const tile = (iconEl, label, on, fn, title) => {
    const b = el('button', 'wzed-tile' + (on ? ' on' : '')); b.type = 'button'; if (title) b.title = title;
    if (typeof iconEl === 'string') { const w = el('div', 'ico'); w.innerHTML = iconEl; b.appendChild(w); } else b.appendChild(iconEl);
    b.appendChild(el('span', null, label)); b.onclick = fn; return b;
  };
  const TABS = [['mat', 'Материалы'], ['bg', 'Фон'], ['furniture', 'Мебель'], ['explosive', 'Взрывчатка'], ['other', 'Прочее'], ['ppl', 'Люди']];
  const renderTabs = () => {
    if (!ui) return;
    for (const b of ui.tabs.children) b.classList.toggle('on', b.dataset.tab === S.tab);
    const body = ui.body, g = G(), keep = body.scrollTop; body.textContent = '';
    if (S.tab === 'mat' || S.tab === 'bg') {
      const bg = S.tab === 'bg', gr = el('div', 'wzed-grid');
      const list = bg ? S.pal.filter(m => m.m <= 17 && m.t === 0) : S.pal;
      for (const m of list) {
        const target = bg ? (S.bgOf[m.m] || (S.bgOf[m.m] = { kind: 'bg', name: m.name, bg: m.m })) : m;
        gr.appendChild(tile(matIcon(m, bg), m.name, S.sel === target, () => setSel(target)));
      }
      body.append(el('div', 'wzed-h', bg ? 'Фон — слой за стеной' : 'Материалы (' + S.pal.length + ')'), gr,
        el('div', 'wzed-info', bg ? 'Фон не держит конструкции и рисуется за основным материалом. Ластик убирает материал, а если его нет — фон.' : 'Здесь все материалы игры, а не только те, что есть в штатном меню.'));
    } else if (S.tab === 'ppl') {
      body.append(el('div', 'wzed-h', 'Люди'), tile(icon('person'), 'Житель', S.tool === 'person', () => { S.tool = 'person'; renderTools(); renderTabs(); }),
        el('div', 'wzed-info', 'Клик по карте — появится человек. Убрать его можно инструментом «Удалить».'));
    } else {
      const q = S.search.toLowerCase(), gr = el('div', 'wzed-grid'); let n = 0;
      for (const k of Object.keys(g.wc || {})) {
        const d = g.wc[k], nm = d.name || k; if ((d.cat || 'other') !== S.tab) continue; if (q && !(nm.toLowerCase().includes(q) || k.includes(q))) continue;
        gr.appendChild(tile(propIcon(k), nm, S.propKey === k && S.tool === 'prop', () => { S.propKey = k; S.tool = 'prop'; renderTools(); renderTabs(); }, nm)); n++;
      }
      body.append(el('div', 'wzed-h', (TABS.find(t => t[0] === S.tab) || [])[1] + ' (' + n + ')'), gr);
    }
    body.scrollTop = keep;
  };
  const renderFile = () => { if (ui) ui.fileName.textContent = S.cur.name + (S.cur.id ? '' : ' · не сохранена'); };
  const openList = async () => {
    const recs = await dbAll(), m = el('div', 'wzed-modal'), box = el('div', 'panel'); m.appendChild(box);
    box.appendChild(el('div', 'wzed-h', 'Мои карты'));
    if (!recs.length) box.appendChild(el('div', 'wzed-info', 'Пока ничего нет. Сохраните карту — она появится здесь и в выборе карт.'));
    const mkb = (cls, html, title, fn) => { const b = el('button', cls); b.type = 'button'; b.title = title; b.innerHTML = html; b.onclick = fn; return b; };
    for (const r of recs) {
      const row = el('div', 'wzed-row'), im = el('img'); if (r.thumb) im.src = r.thumb;
      row.append(im, el('b', null, r.name),
        mkb('ib wide', icon('folder') + 'Открыть', 'Открыть в редакторе', async () => { m.remove(); await loadBytes(r.data, r); }),
        mkb('ib', icon('down'), 'Скачать .wbx', () => download(r)),
        mkb('ib', icon('trash'), 'Удалить', async () => { if (confirm('Удалить карту «' + r.name + '»?')) { await dbDel(r.id); refreshCards(); m.remove(); openList(); } }));
      box.appendChild(row);
    }
    box.appendChild(mkb('ib wide', 'Закрыть', '', () => m.remove()));
    m.onclick = e => { if (e.target === m) m.remove(); }; document.body.appendChild(m);
  };
  let menuEl = null;
  const toggleMenu = () => {
    if (menuEl) { menuEl.remove(); menuEl = null; return; }
    menuEl = el('div', 'wzed wzed-menu panel');
    const item = (ic, t, fn) => { const b = el('button'); b.type = 'button'; b.innerHTML = icon(ic) + t; b.onclick = () => { toggleMenu(); fn(); }; menuEl.appendChild(b); };
    item('save', 'Сохранить (Ctrl+S)', () => saveMap(false)); item('save', 'Сохранить как…', () => saveMap(true));
    item('folder', 'Мои карты…', openList); menuEl.appendChild(el('hr'));
    item('cam', 'Скриншот-иконка карты', () => { S.cur.thumb = thumbNow(); say('Иконка обновлена — сохраните карту'); });
    item('down', 'Скачать файл .wbx', downloadCurrent); item('up', 'Открыть файл .wbx…', () => pickFile(b => loadBytes(b, null))); menuEl.appendChild(el('hr'));
    item('flat', 'Новая плоская карта', () => { if (confirm('Заменить всё плоской землёй? Несохранённое пропадёт.')) { flatten(); say('Плоская карта готова'); } });
    document.body.appendChild(menuEl);
  };
  const buildUi = () => {
    const st = el('style'); st.id = 'wzed-css'; st.textContent = CSS; document.head.appendChild(st);
    const btn = (cls, html, title, fn) => { const b = el('button', cls); b.type = 'button'; b.title = title || ''; b.innerHTML = html; b.onclick = fn; return b; };
    const pal = el('div', 'wzed wzed-pal panel'), tabs = el('div', 'wzed-tabs'), body = el('div', 'wzed-body');
    for (const [k, n] of TABS) { const b = el('button', 'chip', n); b.type = 'button'; b.dataset.tab = k; b.onclick = () => { S.tab = k; renderTabs(); }; tabs.appendChild(b); }
    const search = el('input'); search.type = 'search'; search.placeholder = 'Поиск предметов…';
    search.oninput = () => { S.search = search.value; if (['mat', 'bg', 'ppl'].includes(S.tab)) S.tab = 'furniture'; renderTabs(); };
    pal.append(tabs, search, body);
    const bar = el('div', 'wzed wzed-bar panel');
    for (const [k, n, ic] of TOOLS) { const b = btn('tool', icon(ic) + '<span>' + n + '</span>', TIPS[k], () => setTool(k)); b.dataset.tool = k; bar.appendChild(b); }
    bar.appendChild(el('div', 'sep'));
    const size = el('b', null, String(S.size)), sz = el('div', 'wzed-size'), row = el('div');
    row.append(btn('ib', '−', 'Меньше ([)', () => setSize(S.size - 1)), size, btn('ib', '+', 'Больше (])', () => setSize(S.size + 1)));
    sz.append(row, el('small', null, 'Размер кисти')); bar.appendChild(sz);
    const fl = btn('tool on', icon('rect') + '<span>Залить</span>', 'Прямоугольник: залитый или контур', () => { S.filled = !S.filled; fl.classList.toggle('on', S.filled); fl.querySelector('span').textContent = S.filled ? 'Залить' : 'Контур'; });
    bar.appendChild(fl);
    const top = el('div', 'wzed wzed-top panel'), pause = btn('ib wide', '', '', () => { const g = G(); g.setOL(!g.OL); syncPause(); });
    const syncPause = () => { const run = !G().OL; pause.innerHTML = run ? icon('pause') + 'Пауза' : icon('play') + 'Снять с паузы'; pause.classList.toggle('on', !run); pause.title = run ? 'Остановить время' : 'Запустить физику, чтобы проверить постройку'; };
    top.append(pause, btn('ib', icon('undo'), 'Отменить (Ctrl+Z)', () => swap(S.undo, S.redo)), btn('ib', icon('redo'), 'Повторить (Ctrl+Y)', () => swap(S.redo, S.undo)),
      btn('ib wide', icon('menu') + 'Файл', 'Сохранение и загрузка карт', toggleMenu), btn('ib wide', icon('exit') + 'Выйти', 'Выйти из редактора', () => exit()));
    const nm = el('div', 'wzed wzed-name panel'), fileName = el('span'); nm.append(el('small', null, 'Редактор карт ·'), fileName);
    document.body.append(pal, bar, top, nm); document.body.classList.add('wzed-on');
    ui = { pal, bar, top, tabs, body, size, fileName, syncPause, nm };
    ui.syncT = setInterval(syncPause, 300); syncPause(); renderTools(); renderTabs(); renderFile();
  };

  const enter = blank => {
    const g = G(); if (!g || !g.gt || !g.ie || !g.Gz) { alert('Редактор недоступен: мод не подключился к этой версии игры.'); return; }
    if (ED.active) return;
    S.pal = buildPalette(); S.bgOf = {}; S.sel = S.pal[0]; S.tab = 'mat'; S.tool = 'pencil'; S.propKey = null;
    if (blank) flatten();
    ED.active = true; buildUi(); g.setOL(true); ui.syncPause();
    say('Редактор карт: время остановлено');
  };
  const exit = () => {
    if (!ED.active) return; if (!confirm('Выйти из редактора? Несохранённые изменения останутся только в этой игре.')) return;
    ED.active = false; if (ui) clearInterval(ui.syncT); if (menuEl) { menuEl.remove(); menuEl = null; }
    for (const e of document.querySelectorAll('.wzed')) e.remove();
    document.body.classList.remove('wzed-on'); try { G().setOL(false); } catch (_) {} ui = null;
  };

  ED.enter = enter; ED.exit = exit; ED.state = S; ED.flatten = flatten; ED.save = saveMap;

  // ------------------------------------------------------------------ main-menu integration -----------------------
  let picked = null;
  const refreshCards = async () => {
    const box = document.getElementById('mapCards'); if (!box) return;
    for (const c of box.querySelectorAll('.wzm-custom')) c.remove();
    let recs = []; try { recs = await dbAll(); } catch (_) {}
    for (const r of recs) {
      const b = el('button', 'mapCard wzm-custom'); b.type = 'button'; b.dataset.custom = r.id;
      const pic = el('div', 'mapPic'); if (r.thumb) { const im = el('img'); im.src = r.thumb; pic.appendChild(im); }
      const t = el('b', null, r.name), x = el('span', 'x', '✕'); x.title = 'Удалить карту';
      x.onclick = async ev => { ev.stopPropagation(); ev.preventDefault(); if (confirm('Удалить карту «' + r.name + '»?')) { await dbDel(r.id); if (picked === r.id) picked = null; refreshCards(); } };
      b.append(pic, t, x); if (picked === r.id) b.classList.add('on'); box.appendChild(b);
    }
  };
  const startEditorFromMenu = async blank => {
    const go = document.getElementById('mapGo'); if (!go) return;
    go.click();
    for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 250)); if (!document.body.classList.contains('inMenu') && G() && G().gt) break; }
    await new Promise(r => setTimeout(r, 300)); enter(blank);
  };
  const initMenu = () => {
    const box = document.getElementById('mapCards'), go = document.getElementById('mapGo');
    if (!box || !go || box.dataset.wzed) return false; box.dataset.wzed = '1';
    box.addEventListener('click', e => {
      const c = e.target.closest && e.target.closest('.mapCard'); if (!c) return;
      for (const o of box.querySelectorAll('.wzm-custom')) o.classList.remove('on');
      if (c.classList.contains('wzm-custom')) {
        e.stopPropagation(); e.preventDefault(); picked = c.dataset.custom; c.classList.add('on');
        for (const o of box.querySelectorAll('.mapCard:not(.wzm-custom)')) o.classList.remove('on');
        const nm = document.getElementById('mapName'); if (nm) nm.textContent = c.querySelector('b').textContent;
      } else picked = null;
    }, true);
    const loadPicked = async () => {
      const rec = await dbGet(picked); if (!rec) return false;
      await G().qz(async () => { G().Gz(await G().Dz(rec.data)); }); return true;
    };
    go.addEventListener('click', e => { if (!picked) return; e.stopImmediatePropagation(); e.preventDefault(); loadPicked(); }, true);
    const bar = el('div'); bar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:8px';
    const mk = (t, fn) => { const b = el('button', 'mb', t); b.type = 'button'; b.onclick = fn; bar.appendChild(b); };
    mk('Редактор: пустой участок', () => { picked = null; startEditorFromMenu(true); });
    mk('Редактор: выбранная карта', async () => { if (picked) { const had = picked; await loadPicked(); await new Promise(r => setTimeout(r, 500)); enter(false); picked = had; } else startEditorFromMenu(false); });
    mk('Добавить карту из файла (.wbx)', () => pickFile((b, n) => importFileToDb(b, n)));
    go.parentElement.appendChild(bar); refreshCards(); return true;
  };
  const wait = setInterval(() => { if (initMenu()) clearInterval(wait); }, 400);
  setTimeout(() => clearInterval(wait), 60000);
})();
