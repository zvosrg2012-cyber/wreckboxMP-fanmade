/* WreckboxMP 1.9.2 zombie menu mod.
   Installs a guarded hook before the game's encrypted script and applies the
   selected speed multiplier when the game converts a person into a zombie. */
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
          't.spd=B(9,13)*(' + cfg + '.speedMultiplier||1),t.runSpd=B(28,38)*(' + cfg + '.speedMultiplier||1),t.panic=0');
        source = source.replace(visualMarker,
          't.hp=Math.max(t.hp,70),t.blood=Math.max(t.blood,60),t.bleed=Math.min(t.bleed,.15),t.look.helmet=t.look.helmet&&Math.random()<.5,(function(z){const c=' + cfg + ';if(c.hpMultiplier)z.hp=Math.max(70,z.hp)*c.hpMultiplier;if(c.bodyColor){z.look.shirt=c.bodyColor;z.look.pants=c.pantsColor||c.bodyColor;z.look.skin=c.skinColor||z.look.skin;z.look.hair=c.hairColor||z.look.hair;z.look.helmet=!!c.helmet;z.look.helmCol=c.helmetColor||c.bodyColor;}})(t),yT.n++');
        // The base game excludes zombies from GT's target search. Let fast
        // variants attack ordinary zombies, and let fire variants breathe fire.
        const acidToolAnchor = 'BS("volcano",{name:r("Вулкан")';
        const acidToolCode = \`const __wzmAcidPools=[];
function __wzmAcidPool(x,y,r=25){__wzmAcidPools.push({x,y,r,until:$t+60,next:0});}
const __wzmAcidCanvas=document.createElement("canvas");
__wzmAcidCanvas.id="wzm-acid-overlay";
__wzmAcidCanvas.style.cssText="position:fixed;pointer-events:none;z-index:900;display:block";
document.body.appendChild(__wzmAcidCanvas);
const __wzmAcidCtx=__wzmAcidCanvas.getContext("2d");
let __wzmAcidFrame=0;
function __wzmAcidDraw(){
  const mainCanvas=document.querySelector("canvas:not(#wzm-acid-overlay)");
  if(mainCanvas){
    const rect=mainCanvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
    __wzmAcidCanvas.style.left=rect.left+"px";__wzmAcidCanvas.style.top=rect.top+"px";
    __wzmAcidCanvas.style.width=rect.width+"px";__wzmAcidCanvas.style.height=rect.height+"px";
    if(__wzmAcidCanvas.width!==Math.round(rect.width*dpr)||__wzmAcidCanvas.height!==Math.round(rect.height*dpr)){
      __wzmAcidCanvas.width=Math.max(1,Math.round(rect.width*dpr));__wzmAcidCanvas.height=Math.max(1,Math.round(rect.height*dpr));
    }
    const c=__wzmAcidCtx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,rect.width,rect.height);
    const sx=x=>rect.width/2+(x-pL.x)*pL.zoom,sy=y=>rect.height/2+(y-pL.y)*pL.zoom;
    const now=performance.now();
    for(let i=__wzmAcidPools.length-1;i>=0;i--){
      const p=__wzmAcidPools[i];if(p.until<$t){__wzmAcidPools.splice(i,1);continue;}
      if($t>=p.next){
        p.next=$t+.35;
        const cx=Math.floor(p.x/6),cy=Math.floor(p.y/6),rad=Math.ceil(p.r/6);
        for(let yy=-rad;yy<=rad;yy++)for(let xx=-rad;xx<=rad;xx++){
          if(xx*xx+yy*yy>rad*rad)continue;
          const col=cx+xx,row=cy+yy;if(!ne(col,row))continue;
          const cell=row*u+col,mat=gt[cell];
          if(mat&&(mat===4||mat===nt||mat===et)&&!st[mat].indestructible)ue(cell,0,0,0);
        }
        for(const npc of mm){
          if(npc.gone||npc.dead||npc.hidden||npc.__wzmSkeleton)continue;
          if(Math.hypot(npc.x-p.x,(npc.y-8)-p.y)>p.r+5)continue;
          if(npc.__wzmAcidSince===undefined)npc.__wzmAcidSince=$t;
          if($t-npc.__wzmAcidSince>1.4){
            npc.__wzmSkeleton=true;npc.__wzmSkeletonAt=$t;npc.__wzmSkeletonX=npc.x;npc.__wzmSkeletonY=npc.y;
            gx(npc,"acid");npc.gone=true;
          }
        }
      }
      const x=sx(p.x),y=sy(p.y),r=p.r*pL.zoom;
      if(x+r<-10||x-r>rect.width+10||y+r<-10||y-r>rect.height+10)continue;
      c.save();c.globalAlpha=.55;c.fillStyle="#48ff35";c.shadowColor="#38ff00";c.shadowBlur=12;
      c.beginPath();c.ellipse(x,y,r,r*.38,0,0,Math.PI*2);c.fill();
      c.globalAlpha=.85;c.strokeStyle="#b8ff63";c.lineWidth=1.5;c.beginPath();c.ellipse(x,y,r*.8,r*.26,0,0,Math.PI*2);c.stroke();
      for(let b=0;b<3;b++){const bx=x+Math.sin(now/330+b*2.2)*r*.55,by=y+Math.cos(now/410+b*1.8)*r*.2-Math.abs(Math.sin(now/280+b))*r*.18;c.globalAlpha=.7;c.fillStyle="#d9ff9a";c.beginPath();c.arc(bx,by,Math.max(1,1.3*pL.zoom),0,Math.PI*2);c.fill();}
      c.restore();
    }
    for(const npc of mm){
      if(!npc.__wzmSkeleton)continue;
      const x=sx(npc.__wzmSkeletonX),y=sy(npc.__wzmSkeletonY),z=pL.zoom;
      if(x<-60||x>rect.width+60||y<-60||y>rect.height+60)continue;
      const age=Math.max(0,$t-npc.__wzmSkeletonAt),phase=now/260+(npc.id||0),collapse=Math.max(0,1-age/1.8);
      const bob=Math.sin(phase)*1.2*(1-collapse)+collapse*8;
      const arm=Math.sin(phase)*.24,leg=Math.cos(phase)*.22;
      c.save();c.translate(x,y-bob*z);c.scale(z,z);c.lineCap="round";c.lineJoin="round";
      c.strokeStyle="#e1e7c8";c.fillStyle="#e1e7c8";c.lineWidth=1.65;c.shadowColor="#a8ff7b";c.shadowBlur=4;
      c.beginPath();c.arc(0,-24,4.2,0,Math.PI*2);c.fill();
      c.fillStyle="#28451d";c.beginPath();c.arc(-1.5,-24,1,0,Math.PI*2);c.arc(1.5,-24,1,0,Math.PI*2);c.fill();
      c.strokeStyle="#e1e7c8";c.beginPath();c.moveTo(0,-19.5);c.lineTo(0,-8);c.moveTo(-3,-17);c.lineTo(3,-17);c.moveTo(-3.5,-14);c.lineTo(3.5,-14);c.moveTo(-3.2,-11);c.lineTo(3.2,-11);
      c.moveTo(0,-8);c.lineTo(-4,-5);c.lineTo(0,-3);c.lineTo(4,-5);c.lineTo(0,-8);
      c.moveTo(-1,-17);c.lineTo(-6*Math.cos(arm),-12+3*Math.sin(arm));c.lineTo(-8*Math.cos(arm),-7+3*Math.sin(arm));
      c.moveTo(1,-17);c.lineTo(6*Math.cos(arm),-12-3*Math.sin(arm));c.lineTo(8*Math.cos(arm),-7-3*Math.sin(arm));
      c.moveTo(-2,-4);c.lineTo(-3-3*Math.sin(leg),4);c.lineTo(-4-4*Math.sin(leg),9);
      c.moveTo(2,-4);c.lineTo(3+3*Math.sin(leg),4);c.lineTo(4+4*Math.sin(leg),9);c.stroke();c.restore();
    }
  }
  __wzmAcidFrame=requestAnimationFrame(__wzmAcidDraw);
}
__wzmAcidFrame=requestAnimationFrame(__wzmAcidDraw);
BS("acid",{name:r("Кислота"),icon:"drop",hint:r("Удерживайте — разливает зелёную кислоту. Она растворяет сталь, чугун и свинец; житель долго не выживет в луже."),slider:{label:r("Поток"),min:1,max:10,def:5,fmt:t=>r(\`\${t*5} л/с\`)},acc:0,down(t){__wzmAcidPool(t.wx,t.wy,20+this.value*1.8);this.acc=0;},update(t){if(!IS.down)return;this.acc+=t*(2+this.value*.8);while(this.acc>=.12){this.acc-=.12;__wzmAcidPool(IS.wx+B(-4,4),IS.wy+B(-3,3),15+this.value*1.8);}},draw(t){if(!IS.over)return;t.strokeStyle="rgba(72,255,53,.85)";t.fillStyle="rgba(72,255,53,.14)";t.lineWidth=2/pL.zoom;t.beginPath();t.ellipse(IS.wx,IS.wy,20+this.value*1.8,8+this.value*.8,0,0,Math.PI*2);t.fill();t.stroke();}});\`;
        if (source.includes(acidToolAnchor)) source = source.replace(acidToolAnchor, acidToolCode + acidToolAnchor);
        source = source.replace('const CA=["camera","hammer","ball","winch","dynamite","demolish","bomb","nuke","rocket","flame","molotov","lava","water","laser"',
          'const CA=["camera","hammer","ball","winch","dynamite","demolish","bomb","nuke","rocket","flame","molotov","lava","water","acid","laser"');
        const targetFilter = 'if(!ET(i)||i===e.skip)continue;';
        if (source.includes(targetFilter)) {
          source = source.replace(targetFilter,
            'if((!ET(i)&&!(t.__wzmType==="fast"&&i.zomb&&!i.dead&&!i.gone&&(i.__wzmType==="standard"||!i.__wzmType)))||i===e.skip)continue;');
        }
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
    { id: 'fast', label: 'Быстрый', note: 'Красная одежда, скорость ×1,75; заражённые, превращённые после выбора, будут быстрее.' },
    { id: 'heavy', label: 'Тяжёлый', note: 'Медленный, крепкий и в тёмно-серой одежде; здоровье ×3,4.' },
    { id: 'hunter', label: 'Охотник', note: 'Быстрый преследователь в тёмной одежде; здоровье немного ниже обычного.' }
  ];
  let selectedType = 'standard';
  let observer = null;
  let renderQueued = false;
  let initialized = false;

  // Config is exposed for the game's NPC logic to consume; declaring it alone
  // does not alter NPCs until a compatible game-side handler reads it.
  const typeConfig = {
    standard: { speedMultiplier: 1, bodyColor: null, eyeColor: null, bloody: false, glowEyesInDark: false, hostileToOtherZombieTypes: false },
    fast: { speedMultiplier: 1.75, bodyColor: '#b51f2b', pantsColor: '#3d1519', skinColor: '#a85d60', hairColor: '#211719', hpMultiplier: 1, helmet: false, bloody: true, glowEyesInDark: true, hostileToOtherZombieTypes: true },
    heavy: { speedMultiplier: 0.58, bodyColor: '#41464b', pantsColor: '#24282d', skinColor: '#777d80', hairColor: '#303336', hpMultiplier: 3.4, helmet: true, helmetColor: '#292e33', bloody: false, glowEyesInDark: false, hostileToOtherZombieTypes: false },
    hunter: { speedMultiplier: 1.45, bodyColor: '#292b42', pantsColor: '#171824', skinColor: '#6d737d', hairColor: '#171820', hpMultiplier: 0.82, helmet: false, bloody: true, glowEyesInDark: true, hostileToOtherZombieTypes: false }
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
