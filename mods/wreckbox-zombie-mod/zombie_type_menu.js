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
        const giantModeCode = "(()=>{\n\nconst gc=document.createElement(\"canvas\");gc.id=\"wzm-giant-overlay\";gc.style.cssText=\"position:fixed;pointer-events:none;z-index:800;display:none\";document.body.appendChild(gc);const gcx=gc.getContext(\"2d\");\nconst gb=document.createElement(\"div\");gb.id=\"wzm-giant-controls\";gb.style.cssText=\"position:fixed;z-index:2147483646;left:50%;bottom:14px;transform:translateX(-50%);display:none;gap:7px;flex-wrap:wrap;padding:8px;border:1px solid #c8793d;border-radius:13px;background:#1b110fee;font:800 12px system-ui;touch-action:none\";gb.innerHTML=\"<button data-g=left>◀</button><button data-g=right>▶</button><button data-g=stomp>ТОПОТ</button><button data-g=fire>ОГОНЬ</button><button data-g=exit>ВЫЙТИ</button>\";for(const b of gb.querySelectorAll(\"button\"))b.style.cssText=\"border:1px solid #8d6048;border-radius:9px;padding:10px 11px;background:#34231c;color:white;font:800 12px system-ui;touch-action:none\";document.body.appendChild(gb);\nconst gs=[];let ga=null,gmusic=null;\nfunction gtone(f,d,v,end){try{if(!ga)return;const o=ga.createOscillator(),g=ga.createGain();o.type=\"triangle\";o.frequency.value=f;if(end)o.frequency.exponentialRampToValueAtTime(end,ga.currentTime+d);g.gain.setValueAtTime(v,ga.currentTime);g.gain.exponentialRampToValueAtTime(.001,ga.currentTime+d);o.connect(g);g.connect(ga.destination);o.start();o.stop(ga.currentTime+d+.02)}catch(e){}}\nfunction gaudio(){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;ga=new A();ga.resume();const m=ga.createGain();m.gain.value=.035;m.connect(ga.destination);for(const f of [55,82,110]){const o=ga.createOscillator(),g=ga.createGain();o.type=\"triangle\";o.frequency.value=f;g.gain.value=f===55?.23:.06;o.connect(g);g.connect(m);o.start();gs.push(o)}gmusic=setInterval(()=>{if(window.__WRECKBOX_GIANT_MODE__&&window.__WRECKBOX_GIANT_MODE__.active)gtone(46,.5,.12,28)},1900)}catch(e){}}\nfunction gaudioStop(){if(gmusic)clearInterval(gmusic);gmusic=null;if(ga){try{ga.close()}catch(e){}ga=null}gs.length=0}\nconst saved=[];function hideUI(){saved.length=0;const main=document.querySelector(\"canvas:not(#wzm-giant-overlay)\");if(!main)return;for(let n=main;n&&n!==document.body;n=n.parentElement){const p=n.parentElement;if(!p)break;for(const s of p.children){if(s===n||s===gc||s===gb)continue;if(s.contains&&(s.contains(gc)||s.contains(gb)))continue;saved.push([s,s.style.visibility]);s.style.visibility=\"hidden\"}}}\nfunction showUI(){for(const p of saved)if(p[0]&&p[0].style)p[0].style.visibility=p[1];saved.length=0}\nfunction ground(x,old){const y=Fg(x);return y>0?y:(old||420)}\nconst mode={active:false,g:null,frame:0,last:0,keys:{left:false,right:false,fire:false},cam:null,\nnote(s){let n=document.getElementById(\"wzm-giant-note\");if(!n){n=document.createElement(\"div\");n.id=\"wzm-giant-note\";n.style.cssText=\"position:fixed;z-index:2147483647;top:12%;left:50%;transform:translateX(-50%);padding:10px 14px;border:1px solid #b76c36;border-radius:10px;background:#201610ed;color:#ffd4a1;font:700 13px system-ui;text-align:center;pointer-events:none\";document.body.appendChild(n)}n.textContent=s;n.style.display=\"block\";setTimeout(()=>n.style.display=\"none\",2200)},\nenter(x,y){if(this.active){this.note(\"Гигант уже активен. Выйдите из режима, чтобы создать нового.\");return false}this.cam={x:pL.x,y:pL.y};this.g={x:x,y:ground(x,y),dir:1,stomp:0};this.active=true;this.keys={left:false,right:false,fire:false};this.last=0;gc.style.display=\"block\";gb.style.display=\"flex\";hideUI();gaudio();this.note(\"A/D или ←/→ — идти · F — огонь · SPACE — топот · ESC — выход\");this.frame=requestAnimationFrame(tick);return true},\nexit(){if(!this.active)return;this.active=false;this.keys.left=false;this.keys.right=false;this.keys.fire=false;if(this.frame)cancelAnimationFrame(this.frame);gc.style.display=\"none\";gb.style.display=\"none\";gcx.clearRect(0,0,gc.width,gc.height);showUI();gaudioStop();if(this.cam){pL.x=this.cam.x;pL.y=this.cam.y}this.cam=null;this.g=null},\nstomp(){if(!this.active||!this.g)return;this.g.stomp=performance.now();gtone(70,.55,.35,22);gtone(34,.7,.16,16);for(let i=0;i<20;i++)Oi(Js,this.g.x+B(-40,40),this.g.y-3,B(-130,130),B(-150,-20),B(.5,1.2),B(3,7),ki(177,159,132))},\nfire(v){this.keys.fire=!!v;if(v)gtone(110,.18,.07,68)}\n};window.__WRECKBOX_GIANT_MODE__=mode;\nfunction draw(now){const main=document.querySelector(\"canvas:not(#wzm-giant-overlay)\");if(!main)return;const r=main.getBoundingClientRect(),d=window.devicePixelRatio||1;gc.style.left=r.left+\"px\";gc.style.top=r.top+\"px\";gc.style.width=r.width+\"px\";gc.style.height=r.height+\"px\";if(gc.width!==Math.round(r.width*d)||gc.height!==Math.round(r.height*d)){gc.width=Math.max(1,Math.round(r.width*d));gc.height=Math.max(1,Math.round(r.height*d))}const c=gcx;c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,r.width,r.height);const g=mode.g;if(!g)return;const x=r.width/2+(g.x-pL.x)*pL.zoom,y=r.height/2+(g.y-pL.y)*pL.zoom,z=pL.zoom;if(x<-200||x>r.width+200)return;const moving=mode.keys.left||mode.keys.right,sw=moving?Math.sin(now/145)*.55:Math.sin(now/520)*.04,st=Math.max(0,1-(now-g.stomp)/700);if(st>0){c.save();c.globalAlpha=.7*st;c.strokeStyle=\"#ffb05b\";c.lineWidth=3;c.beginPath();c.ellipse(x,y-2,(1-st)*100*z,(1-st)*18*z,0,0,Math.PI*2);c.stroke();c.restore()}\nc.save();c.translate(x,y);c.scale(z*1.65,z*1.65);c.lineCap=\"round\";c.lineJoin=\"round\";const gr=c.createLinearGradient(-22,-100,22,-20);gr.addColorStop(0,\"#c1a58c\");gr.addColorStop(.5,\"#776254\");gr.addColorStop(1,\"#382b26\");c.shadowColor=\"#ff6b2b\";c.shadowBlur=7;c.fillStyle=\"#292321\";c.strokeStyle=\"#171311\";c.lineWidth=2;\nc.beginPath();c.moveTo(-13,-37);c.lineTo(-17,-18+sw*8);c.lineTo(-25,-4);c.lineTo(-5,-3);c.lineTo(-2,-18-sw*8);c.lineTo(1,-37);c.closePath();c.fill();c.stroke();c.beginPath();c.moveTo(8,-37);c.lineTo(12,-18-sw*8);c.lineTo(17,-4);c.lineTo(35,-3);c.lineTo(31,-12);c.lineTo(20,-18+sw*8);c.lineTo(17,-37);c.closePath();c.fill();c.stroke();\nc.fillStyle=gr;c.beginPath();c.moveTo(-18,-89);c.lineTo(18,-89);c.lineTo(26,-60);c.lineTo(18,-35);c.lineTo(-18,-35);c.lineTo(-26,-60);c.closePath();c.fill();c.stroke();c.fillStyle=\"#5c493d\";c.beginPath();c.ellipse(-23,-82,12,11,-.2,0,Math.PI*2);c.ellipse(23,-82,12,11,.2,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle=\"#4c3a31\";c.lineWidth=9;c.beginPath();c.moveTo(-23,-79);c.lineTo(-31,-59+sw*7);c.lineTo(-34,-39+sw*5);c.moveTo(23,-79);c.lineTo(31,-59-sw*7);c.lineTo(33,-39-sw*5);c.stroke();c.fillStyle=\"#9b8069\";c.beginPath();c.ellipse(-34,-35,7,9,0,0,Math.PI*2);c.ellipse(33,-35,7,9,0,0,Math.PI*2);c.fill();\nc.fillStyle=\"#796656\";c.fillRect(-8,-98,16,13);c.fillStyle=gr;c.beginPath();c.moveTo(-15,-111);c.lineTo(-10,-124);c.lineTo(8,-125);c.lineTo(16,-111);c.lineTo(13,-96);c.lineTo(5,-91);c.lineTo(-8,-94);c.closePath();c.fill();c.strokeStyle=\"#30251f\";c.lineWidth=1.8;c.stroke();c.fillStyle=\"#ff4b22\";c.shadowColor=\"#ff3b15\";c.shadowBlur=9;c.beginPath();c.ellipse(-7,-111,3,2,0,0,Math.PI*2);c.ellipse(7,-111,3,2,0,0,Math.PI*2);c.fill();c.shadowBlur=0;c.strokeStyle=\"#201612\";c.lineWidth=2;c.beginPath();c.moveTo(-7,-100);c.lineTo(-2,-98);c.lineTo(5,-100);c.stroke();\nif(mode.keys.fire){c.save();c.translate(g.dir*13,-108);c.scale(g.dir,1);const f=c.createLinearGradient(0,0,85,0);f.addColorStop(0,\"#fff6b0\");f.addColorStop(.25,\"#ffb21e\");f.addColorStop(.65,\"#ff4c13\");f.addColorStop(1,\"rgba(255,30,0,0)\");c.fillStyle=f;c.shadowColor=\"#ff5a12\";c.shadowBlur=22;c.beginPath();c.moveTo(0,-5);c.quadraticCurveTo(22,-19,44,-4);c.quadraticCurveTo(62,-15,86,0);c.quadraticCurveTo(61,7,43,3);c.quadraticCurveTo(20,11,0,5);c.closePath();c.fill();c.restore()}c.restore()}\nfunction tick(now){const m=mode,g=m.g;if(!m.active||!g)return;const dt=Math.min(.045,Math.max(.001,(now-(m.last||now))/1000));m.last=now;const dir=(m.keys.right?1:0)-(m.keys.left?1:0);if(dir){g.dir=dir;g.x+=dir*170*dt}g.y=ground(g.x,g.y);pL.x+=(g.x-pL.x)*Math.min(1,dt*5);pL.y+=(g.y-85-pL.y)*Math.min(1,dt*4);if(m.keys.fire){for(let j=0;j<3;j++)Oi(Ys,g.x+g.dir*B(18,48),g.y-104+B(-8,8),g.dir*B(45,125),B(-25,15),B(.25,.65),B(3,7),0);if(Math.random()<.34){const ix=re(g.x+g.dir*B(35,75),g.y-100+B(-8,8));if(ix>=0)sl(ix,110)}}draw(now);m.frame=requestAnimationFrame(tick)}\nfunction kd(e){if(!mode.active)return;const k=e.code;if([\"ArrowLeft\",\"ArrowRight\",\"KeyA\",\"KeyD\",\"Space\",\"KeyF\",\"Escape\"].includes(k)){e.preventDefault();e.stopImmediatePropagation()}if(k===\"Escape\")return mode.exit();if(k===\"ArrowLeft\"||k===\"KeyA\")mode.keys.left=true;if(k===\"ArrowRight\"||k===\"KeyD\")mode.keys.right=true;if(k===\"KeyF\")mode.fire(true);if(k===\"Space\"&&!e.repeat)mode.stomp()}\nfunction ku(e){if(!mode.active)return;if([\"ArrowLeft\",\"ArrowRight\",\"KeyA\",\"KeyD\",\"KeyF\",\"Space\"].includes(e.code)){e.preventDefault();e.stopImmediatePropagation()}if(e.code===\"ArrowLeft\"||e.code===\"KeyA\")mode.keys.left=false;if(e.code===\"ArrowRight\"||e.code===\"KeyD\")mode.keys.right=false;if(e.code===\"KeyF\")mode.fire(false)}\nwindow.addEventListener(\"keydown\",kd,true);window.addEventListener(\"keyup\",ku,true);\nfor(const b of gb.querySelectorAll(\"button\")){const a=b.dataset.g;if(a===\"left\"||a===\"right\"){b.addEventListener(\"pointerdown\",e=>{e.preventDefault();mode.keys[a]=true});for(const ev of [\"pointerup\",\"pointercancel\",\"pointerleave\"])b.addEventListener(ev,()=>mode.keys[a]=false)}else if(a===\"fire\"){b.addEventListener(\"pointerdown\",e=>{e.preventDefault();mode.fire(true)});for(const ev of [\"pointerup\",\"pointercancel\",\"pointerleave\"])b.addEventListener(ev,()=>mode.fire(false))}else if(a===\"stomp\")b.addEventListener(\"click\",()=>mode.stomp());else if(a===\"exit\")b.addEventListener(\"click\",()=>mode.exit())}\n\n})();";
        if (source.includes(giantModeAnchor)) source = source.replace(giantModeAnchor, giantModeCode + giantModeAnchor);
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
