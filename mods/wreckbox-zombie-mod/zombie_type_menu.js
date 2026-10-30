/* WreckboxMP 1.9.2 zombie menu and giant mode mod. */
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
          't.spd=window.__WRECKBOX_SELECTED_ZOMBIE_TYPE__==="fire"?B(14,19):B(9,13),t.runSpd=window.__WRECKBOX_SELECTED_ZOMBIE_TYPE__==="fire"?B(42,58):B(28,38),t.panic=0');
        source = source.replace(visualMarker,
          't.hp=Math.max(t.hp,70),t.blood=Math.max(t.blood,60),t.bleed=Math.min(t.bleed,.15),t.look.helmet=t.look.helmet&&Math.random()<.5,(function(z){const c=' + cfg + ';z.__wzmType=window.__WRECKBOX_SELECTED_ZOMBIE_TYPE__||"standard";if(c.hpMultiplier)z.hp=Math.max(70,z.hp)*c.hpMultiplier;if(c.bodyColor){z.look.shirt=c.bodyColor;z.look.pants=c.pantsColor||c.bodyColor;z.look.skin=c.skinColor||z.look.skin;z.look.hair=c.hairColor||z.look.hair;z.look.helmet=!!c.helmet;z.look.helmCol=c.helmetColor||c.bodyColor;}})(t),yT.n++');
        // Keep normal zombie targeting; only add fire breathing for the fire type.
        const giantModeAnchor = 'const CA=["camera"';
        const giantModeCode = "(()=>{\nlet audio=null,music=null,frame=0,last=0,fireAt=0,stompAt=0;const keys={left:false,right:false,fire:false};let giant=null,camera=null;const hidden=[];\nfunction groundY(x){const col=Math.max(0,Math.min(u-1,Math.floor(x/6)));return 6*Rt[col];}\nfunction hideUI(){hidden.length=0;const canvas=document.querySelector(\"canvas:not(#wzm-giant-overlay)\");if(!canvas)return;for(let n=canvas;n&&n!==document.body;n=n.parentElement){const p=n.parentElement;if(!p)break;for(const s of p.children){if(s===n||s===canvas||s.tagName===\"CANVAS\")continue;hidden.push([s,s.style?s.style.visibility:\"\"]);if(s.style)s.style.visibility=\"hidden\";}}}\nfunction showUI(){for(const [el,v] of hidden)if(el&&el.style)el.style.visibility=v;hidden.length=0;}\nfunction sound(f,d,v,end){try{if(!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type=\"triangle\";o.frequency.value=f;if(end)o.frequency.exponentialRampToValueAtTime(end,audio.currentTime+d);g.gain.setValueAtTime(v,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+d+.02);}catch(e){}}\nfunction startAudio(){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;audio=new A();const ctx=audio;const begin=()=>{if(!mode.active||audio!==ctx||ctx.state===\"closed\")return;const master=ctx.createGain();master.gain.value=.16;master.connect(ctx.destination);for(const f of [55,82.4,110]){const o=ctx.createOscillator(),g=ctx.createGain();o.type=\"triangle\";o.frequency.value=f;g.gain.value=f===55?.12:.025;o.connect(g);g.connect(master);o.start();}const notes=[110,130.81,164.81,146.83,110,98,130.81,164.81,196,164.81,130.81,98];let beat=0;music=setInterval(()=>{if(!giant||!mode.active||ctx.state!==\"running\")return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=\"triangle\";o.frequency.setValueAtTime(notes[beat%notes.length],ctx.currentTime);g.gain.setValueAtTime(.0001,ctx.currentTime);g.gain.linearRampToValueAtTime(.055,ctx.currentTime+.025);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.34);o.connect(g);g.connect(master);o.start();o.stop(ctx.currentTime+.36);beat++;},380);};if(ctx.state===\"running\")begin();else ctx.resume().then(begin).catch(()=>{});}catch(e){}}\nfunction stopAudio(){if(music)clearInterval(music);music=null;if(audio){try{audio.close();}catch(e){}audio=null;}}\nfunction say(s){try{MR(s);}catch(e){}}\nconst mode={active:false,enter(x,y){if(this.active||giant&&!giant.gone){say(\"Гигант уже существует. Сначала выйдите из режима.\");return false;}x=Math.max(12,Math.min(u*6-12,x));const floor=groundY(x);if(!(floor>0)){say(\"Здесь нельзя создать гиганта.\");return false;}const g=Km(x,floor,{kind:\"street\",state:\"walk\",street:true});if(!g){say(\"Не удалось создать гиганта.\");return false;}if(!LT(g,{quiet:true})){g.gone=true;say(\"Слишком много зомби на карте.\");return false;}g.__wzmGiant=true;g.look.s=2.35;g.t=999;g.spd=34;g.hp=1200;g.blood=100;g.fireproof=true;g.zomb.goal=null;g.state=\"walk\";g.t=0;g.vx=0;g.vy=0;g.onGround=true;g.y=floor;g.fallY=floor;g.dir=1;g.ph=0;g.nav=null;g.act=null;g.sc=null;g.pose=\"\";g.rag=null;giant=g;this.active=true;last=0;fireAt=0;stompAt=0;keys.left=keys.right=keys.fire=false;camera={x:pL.x,y:pL.y};hideUI();startAudio();say(\"ГИГАНТ: A/D или ←/→ — идти · F — огонь · SPACE — топот · ESC — выход\");frame=requestAnimationFrame(tick);return true},exit(){if(!this.active)return;this.active=false;keys.left=keys.right=keys.fire=false;if(frame)cancelAnimationFrame(frame);frame=0;stopAudio();showUI();if(giant&&!giant.gone)yx(giant,false);giant=null;if(camera){pL.x=camera.x;pL.y=camera.y;}camera=null;}};\nwindow.__WRECKBOX_GIANT_MODE__=mode;\nfunction stomp(now){if(now-stompAt<650)return;stompAt=now;try{cl(giant.x,giant.y-3,48);for(let a=-5;a<=5;a++)for(let b=0;b<=2;b++){const cell=re(giant.x+a*6,giant.y-6-b*6);if(cell>=0)ll(cell);}}catch(e){}try{lL.whoosh(.85,giant.x,giant.y);lL.zomb(giant.x,giant.y-12,\"growl\");}catch(e){}sound(68,.5,.28,22);sound(34,.65,.14,16);for(const q of mm){if(q===giant||q.gone||q.dead||q.hidden||q.rag)continue;const dx=q.x-giant.x,dy=q.y-giant.y;if(Math.abs(dx)<82&&Math.abs(dy)<48){bx(q,38,\"blunt\",1);q.vx+=Math.sign(dx||giant.dir)*B(35,75);q.vy-=B(12,30);}}for(let i=0;i<24;i++)Oi(Js,giant.x+B(-45,45),giant.y-2,B(-135,135),B(-150,-15),B(.5,1.2),B(3,7),ki(158,143,120));}\nfunction breatheFire(now){if(now-fireAt<130)return;fireAt=now;for(let i=0;i<4;i++)Oi(Ys,giant.x+giant.dir*B(17,32),giant.y-B(22,35),giant.dir*B(55,135),B(-24,13),B(.25,.6),B(3,7),0);for(const q of mm){if(q===giant||q.gone||q.dead||q.hidden||q.rag)continue;const dx=(q.x-giant.x)*giant.dir,dy=q.y-giant.y;if(dx>0&&dx<112&&Math.abs(dy)<48)zx(q);}for(let d=1;d<=18;d++)for(const h of [8,20,32]){const cell=re(giant.x+giant.dir*d*6,giant.y-h);if(cell>=0)sl(cell,120);}}\nfunction tick(now){if(!mode.active||!giant||giant.gone)return;const dt=Math.min(.04,Math.max(.001,(now-(last||now))/1000));last=now;const dir=(keys.right?1:0)-(keys.left?1:0);if(dir){giant.dir=dir;giant.x+=dir*125*dt;giant.state=\"walk\";giant.t=999;giant.spd=34;giant.vx=dir*38;giant.ph+=dt*7.5;if(now-(giant.__wzmStepAt||0)>360){giant.__wzmStepAt=now;sound(58,.11,.2,34);}}else{giant.state=\"idle\";giant.t=999;giant.spd=0;giant.vx=0;}giant.x=Math.max(12,Math.min(u*6-12,giant.x));giant.y=groundY(giant.x);giant.fallY=giant.y;giant.vy=0;giant.onGround=true;giant.nav=null;giant.act=null;giant.sc=null;giant.pose=\"\";giant.rag=null;giant.look.s=2.35;if(keys.fire)breatheFire(now);pL.x+=(giant.x-pL.x)*Math.min(1,dt*5);pL.y+=(giant.y-95-pL.y)*Math.min(1,dt*4);if(stompAt&&now-stompAt<550)for(let i=0;i<2;i++)Oi(Js,giant.x+B(-35,35),giant.y-2,B(-35,35),B(-40,-5),B(.3,.7),B(2,4),ki(160,140,116));frame=requestAnimationFrame(tick);}\nfunction keydown(e){if(!mode.active)return;const k=e.code;if([\"ArrowLeft\",\"ArrowRight\",\"KeyA\",\"KeyD\",\"KeyF\",\"Space\",\"Escape\"].includes(k)){e.preventDefault();e.stopImmediatePropagation();}if(k===\"Escape\"){mode.exit();return;}if(k===\"ArrowLeft\"||k===\"KeyA\")keys.left=true;if(k===\"ArrowRight\"||k===\"KeyD\")keys.right=true;if(k===\"KeyF\")keys.fire=true;if(k===\"Space\"&&!e.repeat)stomp(performance.now());}\nfunction keyup(e){if(!mode.active)return;if([\"ArrowLeft\",\"ArrowRight\",\"KeyA\",\"KeyD\",\"KeyF\",\"Space\"].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();}if(e.code===\"ArrowLeft\"||e.code===\"KeyA\")keys.left=false;if(e.code===\"ArrowRight\"||e.code===\"KeyD\")keys.right=false;if(e.code===\"KeyF\")keys.fire=false;}\nwindow.addEventListener(\"keydown\",keydown,true);window.addEventListener(\"keyup\",keyup,true);\n})();";
        if (source.includes(giantModeAnchor)) source = source.replace(giantModeAnchor, giantModeCode + giantModeAnchor);
        const giantAIAnchor = "function GT(t,e){e.re=";
        if (source.includes(giantAIAnchor)) source = source.replace(giantAIAnchor, "function GT(t,e){if(t.__wzmGiant){e.re=$t+.15;e.tgt=null;e.x=null;t.nav=null;return;}e.re=");
        const giantSpawnMarker = 'down(t){!function(t,e,n){const o=ob(t,e,5);';
        if (source.includes(giantSpawnMarker)) source = source.replace(giantSpawnMarker,
          'down(t){if(window.__WRECKBOX_SELECTED_ZOMBIE_TYPE__==="giant"){if(window.__WRECKBOX_GIANT_MODE__)window.__WRECKBOX_GIANT_MODE__.enter(t.wx,t.wy);return;}!function(t,e,n){const o=ob(t,e,5);');
        const attackMarker = 'if(n)return n!==e.tgt&&(t.nav=null,!e.tgt&&$t-(e.lostT||-9)>4&&lL.zomb(t.x,t.y-14,"growl")),e.tgt=n,e.lx=a,e.ly=r,e.lostT=$t,void $T(t,e,a,r,s<80);';
        if (source.includes(attackMarker)) {
          source = source.replace(attackMarker,
            'if(n){if(t.__wzmType==="fire"&&s<125&&$t>(t.__wzmFireAt||0)){t.__wzmFireAt=$t+.8;zx(n);for(const q of mm){if(q===t||q.gone||q.dead||q.zomb)continue;const dx=q.x-t.x,dy=q.y-t.y;if(dx*t.dir>0&&Math.abs(dx)<90&&Math.abs(dy)<26)zx(q)}for(let d=1;d<=5;d++){const c=re(t.x+t.dir*d*6,t.y-10);if(c>=0)sl(c,120)}Oi(Ys,t.x+12*t.dir,t.y-13,28*t.dir,-4,.35,5,0)}n!==e.tgt&&(t.nav=null,!e.tgt&&$t-(e.lostT||-9)>4&&lL.zomb(t.x,t.y-14,"growl"));e.tgt=n;e.lx=a;e.ly=r;e.lostT=$t;return void $T(t,e,a,r,s<80)};');
        }
        window.__WRECKBOX_ZOMBIE_SPEED_HOOK_ACTIVE__ = true;
      } else {
        window.__WRECKBOX_ZOMBIE_SPEED_HOOK_ACTIVE__ = false;
      }
      return originalEval(source);
    };
  }

  const types = [
    { id: 'standard', label: 'Обычный', note: 'Стандартный тип игры.' },
    { id: 'fire', label: 'Огненный', note: 'Огненное дыхание поджигает людей и горючие материалы.' },
    { id: 'giant', label: 'Гигант', note: 'Один управляемый гигант: A/D — ходьба, F — огонь, Space — топот, Esc — выход.' }
  ];
  let selectedType = 'standard';
  let observer = null;
  let renderQueued = false;
  let initialized = false;

  // Config is exposed for the game's NPC logic to consume; declaring it alone
  // does not alter NPCs until a compatible game-side handler reads it.
  const typeConfig = {
    standard: { bodyColor: null, helmet: false, hostileToOtherZombieTypes: false },
    fire: { bodyColor: '#ff6500', pantsColor: '#ff3b00', skinColor: '#ff8a12', hairColor: '#7d1c00', helmet: false, fireBreath: true, hostileToOtherZombieTypes: false },
    giant: { giantMode: true, hostileToOtherZombieTypes: false }
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
    '#wzmPanel button[data-zombie-type="fire"]{border-color:rgba(255,101,0,.75)}',
    '#wzmPanel button[data-zombie-type="fire"][aria-pressed="true"]{border-color:#ff6500;background:rgba(255,101,0,.2);color:#ff9b48}',
    '#wzmPanel button[data-zombie-type="giant"]{border-color:rgba(255,151,62,.75);background:rgba(120,48,12,.12)}',
    '#wzmPanel button[data-zombie-type="giant"][aria-pressed="true"]{border-color:#ff9a42;background:rgba(255,112,24,.2);color:#ffc18a}',
    '#wzmPanel button[aria-pressed=true]:not([data-zombie-type="fire"]):not([data-zombie-type="giant"]){border-color:var(--accent,#ffc21a);background:rgba(255,194,26,.13);color:var(--accent,#ffc21a)}',
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
