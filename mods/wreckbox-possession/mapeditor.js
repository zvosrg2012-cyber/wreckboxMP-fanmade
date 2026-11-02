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
  const BG_NAMES = { 1: 'Задняя стена', 10: 'Фон 10', 11: 'Фон 11', 12: 'Фон 12', 13: 'Фон 13', 14: 'Фон 14', 15: 'Фон 15', 17: 'Фон 17', 18: 'Фон 18' };
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
  const buildBgs = () => Object.keys(BG_NAMES).map(k => ({ kind: 'bg', name: BG_NAMES[k], bg: +k }));
  const PROP_CATS = { furniture: 'Мебель и быт', explosive: 'Взрывоопасное', other: 'Прочее' };

  // ------------------------------------------------------------------ state ---------------------------------
  const S = { tool: 'pencil', size: 2, filled: true, sel: null, tab: 'mat', drawing: false, a: null, b: null, stroke: null, last: null,
              undo: [], redo: [], cur: { id: null, name: 'Без названия', thumb: '' }, pal: [], bgs: [], propKey: null, search: '' };
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
    else if (g.St[i]) { const b = S.bgs.find(p => p.bg === g.St[i]); if (b) { setSel(b); S.tab = 'bg'; renderTabs(); } }
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
  const wipe = () => {
    const g = G(), gw = g.gw; let n = 0;
    for (let x = 0; x < gw; x++) {
      const top = g.Rt ? g.Rt[x] : 0;
      for (let y = 0; y < top; y++) { const i = y * gw + x; if (g.gt[i]) { g.ce(i); n++; } if (g.St[i]) { g.St[i] = 0; } g.Lt[i] = -1; g.se(i); }
    }
    for (const o of (g.Xa || []).slice()) if (o && o.pt && !o.dead) { try { g.GC(o); } catch (_) {} }
    for (const r of (g.mm || []).slice()) if (!r.gone) { try { g.WC(r); } catch (_) {} }
    S.undo.length = 0; S.redo.length = 0; return n;
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

  // ------------------------------------------------------------------ UI ------------------------------------------
  const CSS = `
  .wzed{position:fixed;z-index:60;font:600 13px/1.2 var(--font-body,system-ui,sans-serif);color:#f3efe4;user-select:none}
  .wzed *{box-sizing:border-box}
  .wzed-left{left:8px;top:108px;bottom:8px;width:268px;display:flex;flex-direction:column;background:rgba(22,24,29,.93);border:1px solid rgba(255,194,26,.35);border-radius:10px;overflow:hidden}
  .wzed-top{left:50%;top:108px;transform:translateX(-50%);display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:calc(100vw - 600px);background:rgba(22,24,29,.93);border:1px solid rgba(255,194,26,.35);border-radius:10px;padding:6px}
  .wzed-file{right:8px;top:108px;width:196px;display:flex;flex-direction:column;gap:6px;background:rgba(22,24,29,.93);border:1px solid rgba(255,194,26,.35);border-radius:10px;padding:8px}
  .wzed button,.wzed-btn{font:inherit;color:#f3efe4;background:#2a2e36;border:1px solid #444a56;border-radius:7px;padding:6px 9px;cursor:pointer}
  .wzed button:hover{border-color:rgba(255,194,26,.7)}
  .wzed button.on{background:var(--accent,#ffc21a);color:#1a1a1a;border-color:var(--accent,#ffc21a)}
  .wzed button.acc{background:#3a3220;border-color:rgba(255,194,26,.6)}
  .wzed-tabs{display:flex;gap:4px;padding:6px;border-bottom:1px solid #33383f}
  .wzed-tabs button{flex:1;padding:6px 2px;font-size:12px}
  .wzed-body{flex:1;overflow:auto;padding:6px}
  .wzed-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:5px}
  .wzed-grid button{display:flex;align-items:center;gap:6px;text-align:left;padding:5px 6px;font-size:12px;min-height:32px}
  .wzed-sw{width:18px;height:18px;border-radius:4px;border:1px solid rgba(255,255,255,.35);flex:none}
  .wzed-h{margin:8px 2px 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#ffc21a}
  .wzed input[type=text],.wzed input[type=search]{width:100%;padding:6px 8px;border-radius:7px;border:1px solid #444a56;background:#14161a;color:#f3efe4;font:inherit}
  .wzed label{display:flex;align-items:center;gap:6px;font-size:12px}
  .wzed-info{font-size:11px;color:#b9b4a6;font-weight:500;padding:2px}
  .wzed-toast{position:fixed;left:50%;bottom:86px;transform:translateX(-50%);z-index:70;background:rgba(22,24,29,.96);border:1px solid rgba(255,194,26,.5);color:#f3efe4;padding:8px 14px;border-radius:9px;font:600 13px system-ui;opacity:0;pointer-events:none;transition:opacity .2s}
  .wzed-toast.on{opacity:1}
  body.wzed-on #hudBottom,body.wzed-on #tools,body.wzed-on #mDestroy,body.wzed-on #mBuild{display:none!important}
  .wzed-modal{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center}
  .wzed-modal>div{width:min(560px,92vw);max-height:80vh;overflow:auto;background:#1c1f25;border:1px solid rgba(255,194,26,.4);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px}
  .wzed-row{display:flex;gap:8px;align-items:center;background:#252932;border-radius:8px;padding:6px}
  .wzed-row img{width:96px;height:54px;object-fit:cover;border-radius:5px;background:#111}
  .wzed-row b{flex:1}
  .mapCard.wzm-custom .x{position:absolute;right:6px;top:6px;background:rgba(0,0,0,.6);color:#fff;border-radius:5px;padding:1px 6px;font-size:12px}
  .mapCard.wzm-custom{position:relative}
  .mapCard.wzm-custom img{width:100%;height:100%;object-fit:cover;display:block;border-radius:4px}
  `;
  let ui = null;
  const setSel = s => { S.sel = s; if (S.tool === 'eraser' || S.tool === 'pick' || S.tool === 'prop' || S.tool === 'person' || S.tool === 'delete') S.tool = 'pencil'; renderTools(); renderTabs(); };
  const setTool = t => { S.tool = t; renderTools(); renderTabs(); };
  const setSize = n => { S.size = Math.max(1, Math.min(12, n)); if (ui) ui.size.textContent = S.size; };
  const TOOLS = [['pencil', 'Кисть (B)'], ['line', 'Линия (L)'], ['rect', 'Прямоугольник (R)'], ['fill', 'Заливка (G)'], ['eraser', 'Ластик (E)'], ['pick', 'Пипетка (I)'], ['delete', 'Удалить предмет/человека']];
  const renderTools = () => { if (!ui) return; for (const b of ui.top.querySelectorAll('[data-tool]')) b.classList.toggle('on', b.dataset.tool === S.tool); };
  const renderTabs = () => {
    if (!ui) return;
    for (const b of ui.tabs.children) b.classList.toggle('on', b.dataset.tab === S.tab);
    const body = ui.body; body.textContent = '';
    const item = (label, color, on, fn) => { const b = el('button'); if (color) { const s = el('span', 'wzed-sw'); s.style.background = color; b.appendChild(s); } b.appendChild(document.createTextNode(label)); if (on) b.classList.add('on'); b.onclick = fn; return b; };
    if (S.tab === 'mat') {
      const gr = el('div', 'wzed-grid');
      for (const m of S.pal) gr.appendChild(item(m.name, m.color, S.sel === m, () => { S.sel = m; if (!['pencil', 'line', 'rect', 'fill'].includes(S.tool)) S.tool = 'pencil'; renderTools(); renderTabs(); }));
      body.append(el('div', 'wzed-h', 'Все материалы игры (' + S.pal.length + ')'), gr);
    } else if (S.tab === 'bg') {
      const gr = el('div', 'wzed-grid');
      for (const b of S.bgs) gr.appendChild(item(b.name, null, S.sel === b, () => { S.sel = b; if (!['pencil', 'line', 'rect', 'fill'].includes(S.tool)) S.tool = 'pencil'; renderTools(); renderTabs(); }));
      body.append(el('div', 'wzed-h', 'Фоновые слои'), gr, el('div', 'wzed-info', 'Фон рисуется за материалами и не держит конструкции. Ластик убирает материал, а если его нет — фон.'));
    } else if (S.tab === 'prop') {
      const g = G(), inp = el('input'); inp.type = 'search'; inp.placeholder = 'Поиск предметов…'; inp.value = S.search;
      const list = el('div'); body.append(inp, list);
      const fill = () => {
        list.textContent = ''; const q = S.search.toLowerCase(), cats = {};
        for (const k of Object.keys(g.wc || {})) { const d = g.wc[k]; const nm = d.name || k; if (q && !(nm.toLowerCase().includes(q) || k.includes(q))) continue; (cats[d.cat || 'other'] = cats[d.cat || 'other'] || []).push([k, nm]); }
        for (const c of Object.keys(cats)) {
          const gr = el('div', 'wzed-grid'); list.append(el('div', 'wzed-h', (PROP_CATS[c] || c) + ' (' + cats[c].length + ')'), gr);
          for (const [k, nm] of cats[c]) gr.appendChild(item(nm, null, S.propKey === k && S.tool === 'prop', () => { S.propKey = k; S.tool = 'prop'; renderTools(); fill(); }));
        }
      };
      inp.oninput = () => { S.search = inp.value; fill(); }; fill();
    } else {
      const b = item('Поставить человека', null, S.tool === 'person', () => { S.tool = 'person'; renderTools(); renderTabs(); });
      body.append(el('div', 'wzed-h', 'Люди'), b, el('div', 'wzed-info', 'Клик по карте — появится житель. Удалить — инструмент «Удалить».'));
    }
  };
  const renderFile = () => {
    if (!ui) return; ui.fileName.textContent = S.cur.name + (S.cur.id ? '' : ' (не сохранена)');
  };
  const openList = async () => {
    const recs = await dbAll(), m = el('div', 'wzed-modal'), box = el('div'); m.appendChild(box);
    box.appendChild(el('div', 'wzed-h', 'Мои карты'));
    if (!recs.length) box.appendChild(el('div', 'wzed-info', 'Пока ничего нет. Нажмите «Сохранить».'));
    for (const r of recs) {
      const row = el('div', 'wzed-row'), im = el('img'); if (r.thumb) im.src = r.thumb;
      const nm = el('b', null, r.name), open = el('button', 'acc', 'Открыть'), dl = el('button', null, '⬇ .wbx'), rm = el('button', null, '✕');
      open.onclick = async () => { m.remove(); await loadBytes(r.data, r); }; dl.onclick = () => download(r);
      rm.onclick = async () => { if (confirm('Удалить карту «' + r.name + '»?')) { await dbDel(r.id); refreshCards(); m.remove(); openList(); } };
      row.append(im, nm, open, dl, rm); box.appendChild(row);
    }
    const close = el('button', null, 'Закрыть'); close.onclick = () => m.remove(); box.appendChild(close);
    m.onclick = e => { if (e.target === m) m.remove(); }; document.body.appendChild(m);
  };
  const buildUi = () => {
    const st = el('style'); st.textContent = CSS; document.head.appendChild(st);
    const left = el('div', 'wzed wzed-left'), tabs = el('div', 'wzed-tabs'), body = el('div', 'wzed-body');
    for (const [k, n] of [['mat', 'Материалы'], ['bg', 'Фон'], ['prop', 'Предметы'], ['ppl', 'Люди']]) { const b = el('button', null, n); b.dataset.tab = k; b.onclick = () => { S.tab = k; renderTabs(); }; tabs.appendChild(b); }
    left.append(tabs, body);
    const top = el('div', 'wzed wzed-top');
    for (const [k, n] of TOOLS) { const b = el('button', null, n.replace(/ \(.\)$/, '')); b.title = n; b.dataset.tool = k; b.onclick = () => setTool(k); top.appendChild(b); }
    const sz = el('span', null, ''), minus = el('button', null, '−'), plus = el('button', null, '+'), size = el('b', null, String(S.size));
    minus.onclick = () => setSize(S.size - 1); plus.onclick = () => setSize(S.size + 1);
    const fl = el('label'), cb = el('input'); cb.type = 'checkbox'; cb.checked = S.filled; cb.onchange = () => { S.filled = cb.checked; }; fl.append(cb, document.createTextNode('Залить'));
    const un = el('button', null, '↶'), re = el('button', null, '↷'); un.title = 'Отменить (Ctrl+Z)'; re.title = 'Повторить (Ctrl+Y)';
    un.onclick = () => swap(S.undo, S.redo); re.onclick = () => swap(S.redo, S.undo);
    sz.append(document.createTextNode('Размер '), minus, size, plus); top.append(sz, fl, un, re);
    const file = el('div', 'wzed wzed-file'), fname = el('div', 'wzed-h', '');
    const mk = (label, fn, cls) => { const b = el('button', cls || null, label); b.onclick = fn; file.appendChild(b); return b; };
    file.appendChild(fname);
    mk('Сохранить (Ctrl+S)', () => saveMap(false), 'acc'); mk('Сохранить как…', () => saveMap(true));
    mk('Мои карты…', openList); mk('Скачать файл .wbx', downloadCurrent);
    mk('Открыть файл…', () => pickFile((b, n) => loadBytes(b, null)));
    mk('Скриншот-иконка', () => { S.cur.thumb = thumbNow(); say('Иконка карты обновлена — сохраните карту'); });
    mk('Чистый лист', () => { if (confirm('Стереть всё над землёй?')) { wipe(); say('Участок очищен'); } });
    mk('Выйти из редактора', () => exit());
    file.appendChild(el('div', 'wzed-info', 'Время стоит. ПКМ — двигать камеру, колесо — зум. Ctrl+Z/Y — отмена.'));
    document.body.append(left, top, file); document.body.classList.add('wzed-on');
    ui = { left, top, file, tabs, body, size, fileName: fname };
    renderTools(); renderTabs(); renderFile();
  };
  let freezeT = 0;
  const enter = blank => {
    const g = G(); if (!g || !g.gt || !g.ie || !g.Gz) { alert('Редактор недоступен: мод не подключился к этой версии игры.'); return; }
    if (ED.active) return;
    S.pal = buildPalette(); S.bgs = buildBgs(); S.sel = S.pal[0]; S.tab = 'mat'; S.tool = 'pencil';
    if (blank) wipe();
    ED.active = true; buildUi(); g.setOL(true); freezeT = setInterval(() => { try { if (!g.OL) g.setOL(true); } catch (_) {} }, 250);
    say('Редактор карт: время остановлено');
  };
  const exit = () => {
    if (!ED.active) return; if (!confirm('Выйти из редактора? Несохранённые изменения останутся только в этой игре.')) return;
    ED.active = false; clearInterval(freezeT); for (const e of document.querySelectorAll('.wzed')) e.remove();
    document.body.classList.remove('wzed-on'); try { G().setOL(false); } catch (_) {} ui = null;
  };
  ED.enter = enter; ED.exit = exit; ED.state = S; ED.wipe = wipe; ED.save = saveMap;

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
