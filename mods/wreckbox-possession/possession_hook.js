/* WreckboxMP 1.9.2 — native NPC possession patch */
(() => {
  'use strict';
  if (window.__WRECKBOX_POSSESSION_HOOK_LOADED__) return;
  window.__WRECKBOX_POSSESSION_HOOK_LOADED__ = true;

  const originalEval = window.eval;
  const toolIcon = '<path d="M12 3.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/><path d="M4.5 20c.6-3.5 3.2-5.3 7.5-5.3s6.9 1.8 7.5 5.3"/><path d="M3 7.5h3M18 7.5h3M12 1v2M12 12v2"/><path d="M2.5 12h3M18.5 12h3"/>';

  // The game's own message function (MR) does not exist yet while the source is being patched, so a
  // notice about a failed patch has to wait until the game is up. If MR is not reachable from here,
  // fall back to the game's plain-HTML #toast element.
  const notifyLater = (message) => {
    const show = () => {
      try { if (typeof MR === 'function') { MR(message); return; } } catch (_) {}
      const toast = document.getElementById('toast');
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 7000);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(show, 1500), { once: true });
    else setTimeout(show, 1500);
  };

  window.__WRECKBOX_RUN_GAME_SOURCE__ = function (source) {
    if (typeof source !== 'string') return originalEval(source);
    const originalSource = source;
    try {
    const replaceOnce = (needle, replacement, label) => {
      if (!source.includes(needle)) throw new Error('Possession mod: game marker missing: ' + label);
      source = source.replace(needle, replacement);
    };

    // Add a genuinely new tool and a bespoke SVG icon; no existing element icon is reused.
    replaceOnce(
      'const CA=["camera","hammer","ball","winch","dynamite","demolish","bomb","nuke","rocket","flame","molotov","lava","water","laser","quake","volcano","tornado","tsunami","meteor","lightning","hole","zombie","gravgun","eraser"]',
      'const CA=["camera","possession","hammer","ball","winch","dynamite","demolish","bomb","nuke","rocket","flame","molotov","lava","water","laser","quake","volcano","tornado","tsunami","meteor","lightning","hole","zombie","gravgun","eraser"]',
      'tool list'
    );
    replaceOnce('LA=["camera","brush","building","furniture","explosives","people","eraser"]', 'LA=["camera","possession","brush","building","furniture","explosives","people","eraser"]', 'build tool list');
    // Minified names differ between builds of the game, so they are looked up instead of hard-coded.
    // Old build: camera pL, icon object PL + marker "const OL=t=>", transition updater Ny. New build: dL, zL, _y.
    let CAM = 'pL', CLAMP = '';
    const camMatch = source.match(/const (\w+)=\{x:[-\d.e]+,y:[-\d.e]+,zoom:[-\d.e]+,vx:0,vy:0,minZoom/);
    if (camMatch) CAM = camMatch[1];
    const clampMatch = source.match(new RegExp('function (\\w+)\\(\\)\\{' + CAM + '\\.zoom=F\\(' + CAM + '\\.zoom,' + CAM + '\\.minZoom,' + CAM + '\\.maxZoom\\)'));
    if (clampMatch) CLAMP = clampMatch[1];
    const iconMatch = source.match(/const (\w+)=t=>`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">\$\{(\w+)\[t\]\|\|""\}<\/svg>`/);
    if (iconMatch) replaceOnce(iconMatch[0], iconMatch[2] + '.possession=' + JSON.stringify(toolIcon) + ';' + iconMatch[0], 'custom icon (icon table)');
    else replaceOnce('const OL=t=>', 'PL.possession=' + JSON.stringify(toolIcon) + ';const OL=t=>', 'custom icon');
    const scMatch = source.match(/function (\w+)\(t,e\)\{const n=t\.sc,o=t\.nav;if\("act"!==t\.state\)if\("stair"===n\.type/);
    if (!scMatch) throw new Error('Possession mod: game marker missing: possessed door and elevator transitions');
    replaceOnce(scMatch[0], scMatch[0].replace('if("act"!==t.state)', 'if("act"!==t.state&&!t.__wzmPossessed)'), 'possessed door and elevator transitions');
    // Injected code is written with the old names (pL, MR); translate it for this build.
    // Read-only window into the game's internals for diagnostics and for automated tests (getters: some of these
    // constants are declared later in the game source than the point where this code runs).
    const WZ_EXPOSE = 'window.__WZM_GAME__={get mm(){return mm},get kg(){return kg},get cam(){return ' + CAM + '},get IS(){return IS},get Eg(){return Eg},get Fg(){return Fg},get Vg(){return Vg},get ET(){return ET},get gt(){try{return gt}catch(_){return null}},get vt(){try{return vt}catch(_){return null}},get mt(){try{return mt}catch(_){return 192}},get gw(){try{return u}catch(_){return 0}},get st(){try{return st}catch(_){return null}},get px(){try{return px}catch(_){return null}},get bx(){try{return bx}catch(_){return null}},get XM(){try{return XM}catch(_){return null}},get sv(){try{return sv}catch(_){return null}},get Wy(){try{return Wy}catch(_){return null}}};';
    const WZ_HELPERS = 'const WZMSG=(m)=>{try{const n=document.getElementById("toast");if(!n)return;n.textContent=String(m);n.classList.add("show");clearTimeout(window.__wzmToastT);window.__wzmToastT=setTimeout(()=>n.classList.remove("show"),2600);}catch(_){}};' +
      'const WZMCLAMP=()=>{' + (CLAMP ? 'try{' + CLAMP + '()}catch(_){}' : '') + '};';
    const adapt = (code) => code.replace(/\bpL\b/g, CAM).replace(/\bMR\(/g, 'WZMSG(');

    // Optional patch: a failed marker here only drops this one feature (the rest of the mod still works).
    const replaceOptional = (needle, replacement, label) => {
      if (!source.includes(needle)) { console.warn('Possession mod: optional patch skipped, marker missing: ' + label); return false; }
      source = source.replace(needle, replacement); return true;
    };
    // Door and "bypass" (crossing a house to the ground on its other side) transitions of a possessed NPC. The game hides the NPC at y=-1e5 for the whole teleport, so the
    // camera used to fly away and snap back (jerk). Instead a semi-transparent copy of the NPC walks from the
    // entry door to the exit door in exactly the time the teleport takes, and the camera follows it.
    // The walking animation needs |vx|>4 and onGround (that is what the game's pose code checks), and ph advancing.
    // NB: this block sits inside a case block that declares its own `e` later, so it must not use `e`.
    replaceOptional(
      'case"door":case"bypass":case"off":{const e="door"===n.type?.35:.6;',
      'case"door":case"bypass":case"off":{if(t.__wzmPossessed&&("door"===n.type||"bypass"===n.type)){' +
        'const wzmRamp=Math.max(.05,Math.min(.35,n.dur/3)),wzmP=Math.min(1,n.t/n.dur);' +
        'if(void 0===n.wzmPh)n.wzmPh=t.ph||0;t.hidden=!1;t.onGround=!0;t.dir=n.bx>=n.ax?1:-1;t.vx=24*t.dir;t.ph=n.wzmPh+n.t*4.2;' +
        't.x=n.ax+(n.bx-n.ax)*wzmP;t.y=n.ay+(n.by-n.ay)*wzmP;' +
        't.fade=.42*Math.max(0,Math.min(1,n.t/wzmRamp,(n.dur-n.t)/wzmRamp));' +
        'if(a>=1){t.x=n.bx;t.y=n.by;if("bypass"===n.type){const wzmY=Fg(t.x);if(wzmY>=0)t.y=wzmY;}t.fade=0;if(!Eg(t.x,t.y)){t.x=n.ax;t.y=n.ay;t.nav=null;t.act=null;}r(1+(n.skip||0));}' +
        'break;}const e="door"===n.type?.35:.6;',
      'ghost door transition'
    );

    // Vision: possession.js computes which NPCs the possessed one can see (r.__wzmUnseen) and draws the view cone
    // and the aim ring through window.__wzmDraw, which is called right after the selected tool's own draw.
    // Optional patches: without them the rest of the mod works, just without hidden NPCs and the cone.
    const drawMatch = source.match(/OS\[FS\]\.draw\((\w+),(\w+)\),/);
    if (drawMatch) replaceOptional(drawMatch[0], drawMatch[0] + 'window.__wzmDraw&&window.__wzmDraw(' + drawMatch[1] + ',' + drawMatch[2] + '),', 'aim/vision draw hook');
    else console.warn('Possession mod: optional patch skipped, marker missing: aim/vision draw hook');
    replaceOptional('for(const r of mm){if(r.gone||r.hidden)continue;if(r.fade>.01&&!r.rag)', 'for(const r of mm){if(r.gone||r.hidden||r.__wzmVisionAlpha<=.015)continue;if(r.fade>.01&&!r.rag)', 'fade NPCs outside the view cone');

    replaceOnce('function RA(t){if(!OS[t])return;', 'window.__WRECKBOX_SELECT_POSSESSION__=()=>RA("possession");function RA(t){if(!OS[t])return;', 'native tool selector');

    const toolMarker = 'BS("camera",{name:r("Камера"),icon:"move",hint:r("Перетаскивайте вид. Колесо или щипок — зум."),mode:"both"});const WS=';
    const toolCode = `BS("possession",{
      name:r("Вселение"),icon:"possession",
      hint:r("Кликните по человеку. WASD — движение, W/S — лестницы и лифт, Shift — бег, Space — прыжок, E — дверь, Esc — выход."),
      down(t){
        const P=window.__WRECKBOX_POSSESSION__;
        if(!P)return;
        if(P.active){P.release();return;}
        let best=null,dist=1e9;
        for(const q of mm){
          if(!ET(q)||q.sc||q.act&&q.act.kind==="zomb"||q.role==="crew")continue;
          const dx=q.x-t.wx,dy=q.y-t.wy,d=Math.hypot(dx,dy*1.15);
          if(Math.abs(dx)<28&&Math.abs(dy)<34&&d<dist){best=q;dist=d;}
        }
        if(!best){MR(r("Нажмите прямо на живого человека"),!0);return;}
        P.camera={x:pL.x,y:pL.y};if(P.enter(best))MR(r("Вы вселились в NPC. Esc — выход, E — дверь."),!0);
      },
      update(){
        const P=window.__WRECKBOX_POSSESSION__,panelId="wzm-possession-lift";
        if(P&&P.dbg){P.dbg.upd++;P.dbg.lastUpd=performance.now();}
        if(!P||!P.active||!P.npc||P.npc.gone||P.npc.dead||P.npc.rag){
          if(P&&P.active&&P.npc&&(!P.npc||P.npc.gone||P.npc.dead||P.npc.rag))P.release();
          const old=document.getElementById(panelId);if(old)old.remove();return;
        }
        const q=P.npc;
        // Keep the camera locked to the possessed NPC even while native stair/elevator
        // transitions temporarily take over movement and skip the custom movement branch.
        pL.x += (q.x - pL.x) * 0.22;
        pL.y += (q.y - 72 - pL.y) * 0.22;
        pL.vx = 0; pL.vy = 0; WZMCLAMP();
        let lift=null,nearStop=-1,best=1e9;
        for(const e of kg.elevs){
          if(e.dead||!e.stops||!e.hub)continue;
          for(let i=0;i<e.stops.length;i++){
            const stop=e.stops[i],floorY=6*stop.row-1;
            for(const side of stop.sides||[]){
              if(!side.seg||side.seg.dead)continue;
              const dx=Math.abs(q.x-side.x),dy=Math.abs(q.y-floorY),score=dx+dy*1.35;
              if(dx<48&&dy<46&&score<best){best=score;lift=e;nearStop=i;}
            }
          }
        }
        let panel=document.getElementById(panelId);
        if(!lift){if(panel)panel.remove();return;}
        if(!panel){panel=document.createElement("div");panel.id=panelId;
          // "panel" is the game's own frame class; .wzm-lift (see possession.js) adds placement and the hazard stripe.
          panel.className="panel wzm-lift";panel.setAttribute("role","group");panel.setAttribute("aria-label","Лифт");
          document.body.appendChild(panel);
        }
        if(panel.dataset.elevator!==String(lift.id)||panel.dataset.floor!==String(nearStop)){
          panel.dataset.elevator=String(lift.id);panel.dataset.floor=String(nearStop);panel.replaceChildren();
          // Floors are numbered by height (a larger row is lower on screen), lowest = 1, and drawn top floor first like a real panel.
          const order=lift.stops.map((s,i)=>i).sort((a,b)=>(lift.stops[b].row||0)-(lift.stops[a].row||0));
          const floorOf={};order.forEach((idx,n)=>{floorOf[idx]=n+1;});
          const head=document.createElement("div");head.className="wzm-lift__head";
          const title=document.createElement("span");title.textContent="Лифт";
          const here=document.createElement("b");here.textContent=String(floorOf[nearStop]);here.title="Текущий этаж";
          head.appendChild(title);head.appendChild(here);panel.appendChild(head);
          const grid=document.createElement("div");grid.className="wzm-lift__grid";
          order.slice().reverse().forEach(i=>{
            const current=i===nearStop;
            const button=document.createElement("button");button.type="button";button.className="wzm-lift__btn";button.textContent=String(floorOf[i]);
            button.title=current?"Вы на этом этаже":"Перейти на этаж "+floorOf[i];button.setAttribute("aria-label",button.title);
            if(current){button.setAttribute("aria-current","true");button.disabled=true;}
            button.addEventListener("click",()=>{const C=window.__WRECKBOX_POSSESSION__;if(!C||!C.active||!C.npc)return;const entry=(lift.stops[i].sides||[]).find(v=>v.seg&&!v.seg.dead);if(!entry){try{MR("На этот этаж сейчас нет доступа.");}catch(_){}return;}C.npc.nav=null;C.npc.act=null;if(!Wy(C.npc,entry.seg,entry.x,{run:false,haz:false})){try{MR("Лифт не отвечает.");}catch(_){}}});
            grid.appendChild(button);
          });
          panel.appendChild(grid);
          const foot=document.createElement("div");foot.className="wzm-lift__foot";foot.textContent="Выберите этаж";panel.appendChild(foot);
        }
      },
    });
    // Crossing a building: the ground zone ends at the house, the next zone starts on its other side. Same rule as the
    // game's own "bypass" link (gap of at most 220 columns). "only" limits it to one direction (-1/1), 0 = both.
    window.__WZM_HOUSE__=(q,cur,only)=>{
      if(!cur||!cur.zone||kg.zones[cur.id]!==cur)return null;
      let side=null,score=1e9;
      for(const d of[-1,1]){
        if(only&&d!==only)continue;
        const nz=kg.zones[cur.id+d];if(!nz)continue;
        const o=d>0?cur.c1+1:nz.c1+1,a=d>0?nz.c0-1:cur.c0-1;if(a-o>220)continue;
        const ex=6*((d>0?cur.c1:cur.c0)+.5),dx=Math.abs(q.x-ex);
        if(dx<score){score=dx;side={from:cur,to:nz,x0:ex,x:6*((d>0?nz.c0:nz.c1)+.5),dx:dx};}
      }
      return side;
    };
    window.addEventListener("wzm-possession-door",()=>{
      const P=window.__WRECKBOX_POSSESSION__,q=P&&P.active&&P.npc;if(!q||q.sc)return;
      // A door link stores one end per node: (ax on node a) and (bx on node b). The game's door links have no
      // ay/by; the floor height of an end is its node's y. (The old code read edge.ay/edge.by, got NaN, and
      // never found a door.) The NPC may stand at either end, so both ends are checked.
      const cur=Vg(q.x,q.y);
      let chosen=null,fromA=false,best=1e9;
      for(const edge of kg.links){
        if(edge.dead||edge.type!=="door"||!edge.a||!edge.b||edge.a.dead||edge.b.dead)continue;
        const ay=edge.ay!==undefined?edge.ay:edge.a.y,by=edge.by!==undefined?edge.by:edge.b.y;
        const score=(x,y)=>Math.abs(q.x-x)<64&&Math.abs(q.y-y)<40?Math.abs(q.x-x)+Math.abs(q.y-y)*1.5:1e9;
        const sa=cur===edge.b?1e9:score(edge.ax,ay),sb=cur===edge.a?1e9:score(edge.bx,by);
        if(Math.min(sa,sb)<best){best=Math.min(sa,sb);chosen=edge;fromA=sa<=sb;}
      }
      // Ground next to a building: E moves the NPC to the ground on the other side of the house.
      const gz=cur&&cur.zone?cur:Og(q.x);
      let side=window.__WZM_HOUSE__(q,gz,0),sideScore=side?side.dx:1e9;
      if(side&&side.dx>=140){side=null;sideScore=1e9;}
      // Prefer a door when one is within reach; otherwise cross to the other side of the house.
      if(!chosen&&!side){try{MR("Подойдите вплотную к двери или к краю дома и нажмите E.");}catch(_){}return;}
      q.act=null;
      if(chosen&&(!side||best<=sideScore)){
        const from=fromA?chosen.a:chosen.b,to=fromA?chosen.b:chosen.a,x0=fromA?chosen.ax:chosen.bx,x1=fromA?chosen.bx:chosen.ax;
        // Build the route step by hand so exactly this door is used (a general route search could pick another way).
        q.nav={steps:[{type:"door",L:chosen,rev:!fromA,from:from,to:to,x0:x0,x:x1}],i:0,sub:0,node:to,x:x1,run:!1,px:q.x,stuck:0,noElev:!0};
      }else{
        q.nav={steps:[{type:"bypass",from:side.from,to:side.to,x0:side.x0,x:side.x}],i:0,sub:0,node:side.to,x:side.x,run:!1,px:q.x,stuck:0,noElev:!0};
      }
    });
    window.addEventListener("wzm-possession-release",()=>{const P=window.__WRECKBOX_POSSESSION__;const panel=document.getElementById("wzm-possession-lift");if(panel)panel.remove();if(P&&P.camera){pL.x=P.camera.x;pL.y=P.camera.y;WZMCLAMP();P.camera=null;}});
    // Diagnostics (F8 overlay in possession.js): publish NPC and camera values from inside the game scope,
    // on a timer that does not depend on the game loop or on the tool's update(). Does nothing unless enabled.
    setInterval(function(){try{
      const P=window.__WRECKBOX_POSSESSION__;if(!P||!P.debug||!P.dbg)return;
      const D=P.dbg,q=P.active&&P.npc;if(!q){D.snap=null;D.lossFrom=0;return;}
      const now=performance.now(),sc=q.sc||null,err=Math.hypot(pL.x-q.x,pL.y-(q.y-72)),warm=now-(D.enterAt||0)<1500;
      D.snap={x:q.x,y:q.y,state:q.state,sc:sc&&sc.type||"",nav:!!q.nav,ground:!!q.onGround,camX:pL.x,camY:pL.y,err:err};
      if(warm){D.lossFrom=0;}
      else if(err>40){if(!D.lossFrom){D.lossFrom=now;D.lossMax=0;D.lossCtx=(sc&&sc.type||"-")+" / "+q.state;}D.lossMax=Math.max(D.lossMax,err);}
      else if(D.lossFrom){const dur=now-D.lossFrom;D.lossFrom=0;if(dur>300){D.losses.unshift(D.lossCtx+", "+Math.round(dur)+" мс, макс. "+Math.round(D.lossMax)+" px");if(D.losses.length>6)D.losses.pop();}}
    }catch(_){}},200);
    const WS=`;
    replaceOnce(toolMarker, toolMarker.replace('const WS=', WZ_HELPERS + WZ_EXPOSE + adapt(toolCode)), 'tool registration');

    const movement = `let n=0;if(t.__wzmPossessed){
      const P=window.__WRECKBOX_POSSESSION__,k=P.keys,AIM=!!(P.aim&&P.aim.on),RUN=!!k.run&&!AIM,ATK=!!(P.atk&&P.atk.until>performance.now());
      if(P.dbg){P.dbg.move++;P.dbg.lastMove=performance.now();P.dbg.moveDt=e;}
      if(t.__wzmReleaseAfterSc&&!t.sc){t.__wzmReleaseAfterSc=false;t.__wzmPossessed=false;t.nav=null;t.act=null;t.state="idle";t.lstate="idle";t.t=.2;}
      const dir=(k.right?1:0)-(k.left?1:0),vert=k.up?-1:k.down?1:0;
      const mode=vert?(vert<0?"up":"down"):dir?(dir<0?"left":"right"):"";
      if(mode!==t.__wzmMoveDir){t.nav=null;t.act=null;t.__wzmMoveDir=mode;}
      t.pose=AIM?"guard":"";if(ATK)t.aimY=0;t.act=null;t.t=999;t.blocked=0;
      if(t.nav){n=Vy(t,e);}
      else if(vert){
        const cur=Vg(t.x,t.y);let dest=null,targetX=t.x,best=1e9;
        if(cur){
          for(const edge of cur.links){
            if(edge.type==="stair"){
              const other=edge.a===cur?edge.b:edge.a;
              if(!other||(vert<0?other.y>=cur.y-4:other.y<=cur.y+4))continue;
              const x=edge.a===cur?edge.bx:edge.ax,cost=Math.abs(other.y-cur.y)+Math.abs(x-t.x)*.45;
              if(cost<best){best=cost;dest=other;targetX=x;}
            }else if(edge.type==="elev"&&edge.elev){
              for(const stop of kg.links){if(stop.type!=="elev"||stop.elev!==edge.elev||!stop.a||stop.a===cur)continue;
                const other=stop.a;if(vert<0?other.y>=cur.y-4:other.y<=cur.y+4)continue;
                const x=stop.ax,cost=Math.abs(other.y-cur.y)+Math.abs(x-t.x)*.45+12;
                if(cost<best){best=cost;dest=other;targetX=x;}
              }
            }
          }
        }
        if(dest&&Wy(t,dest,targetX,{run:RUN,haz:!1})){n=Vy(t,e);}
        else if(cur){
          // Fallback for player-built stairs that have not entered the AI route graph.
          let ramp=null,rampCost=1e9;
          for(const seg of kg.segs){
            if(seg.dead||seg===cur||(vert<0?seg.y>=cur.y-5:seg.y<=cur.y+5)||Math.abs(seg.y-cur.y)>150)continue;
            const candidates=[F(t.x,seg.x0+8,seg.x1-8),seg.x0+12,seg.x1-12,(seg.x0+seg.x1)/2];
            for(const x of candidates){
              if(Math.abs(x-t.x)>190)continue;
              const count=Math.max(2,Math.ceil(Math.abs(x-t.x)/6));let prev=t.y,ok=!0,changes=0;
              for(let j=1;j<=count;j++){
                const px=t.x+(x-t.x)*j/count,fy=Fg(px);
                const expected=t.y+(seg.y-t.y)*j/count;if(fy<0||!Eg(px,fy)||sx(px,fy-27)||Math.abs(fy-prev)>12||Math.abs(fy-expected)>12||(vert<0&&fy>prev+1)||(vert>0&&fy<prev-1)){ok=!1;break;}
                if(Math.abs(fy-prev)>1)changes++;prev=fy;
              }
              const cost=Math.abs(x-t.x)+Math.abs(seg.y-cur.y)*.7;
              if(ok&&changes>=2&&cost<rampCost){ramp={seg,x};rampCost=cost;}
            }
          }
          if(ramp){const edge={type:"stair",x0:t.x,x:ramp.x,from:cur,to:ramp.seg,L:null};t.nav={steps:[edge],i:0,sub:0,node:ramp.seg,x:ramp.x,run:RUN,px:t.x,stuck:0};n=Vy(t,e);}
        }
        t.state="walk";t.lstate="walk";t.dir=dir||t.dir;
      }else if(dir){
        t.dir=dir;t.state="walk";t.lstate="walk";
        const cur=Vg(t.x,t.y),tx=F(t.x+dir*120,8,m-8),target=Vg(tx,t.y)||Og(tx);
        // Free walking may only follow plain steps. A route from a stair landing or lift stop to the ground (or to
        // another room) goes over stair/elev/door links; that is what used to drag the NPC back onto the stairs
        // or into the elevator as soon as it walked out of their range. Such routes are dropped: just walk.
        // Walking into the edge of the ground next to a house for a moment crosses to its other side (like the game's NPCs do).
        const hs=cur&&cur.zone?window.__WZM_HOUSE__(t,cur,dir):null;
        if(hs&&hs.dx<8){
          t.__wzmEdge=(t.__wzmEdge||0)+e;
          if(t.__wzmEdge>.3){t.__wzmEdge=0;t.nav={steps:[{type:"bypass",from:hs.from,to:hs.to,x0:hs.x0,x:hs.x}],i:0,sub:0,node:hs.to,x:hs.x,run:!1,px:t.x,stuck:0,noElev:!0};}
        }else t.__wzmEdge=0;
        let routed=!1;
        if(t.nav&&t.nav.steps&&t.nav.steps[0]&&t.nav.steps[0].type==="bypass")routed=!0;
        if(!routed&&cur&&target&&cur!==target&&Wy(t,target,tx,{run:RUN,haz:!1})){
          if(t.nav&&t.nav.steps&&t.nav.steps.every(s=>s.type==="walk"||s.type==="cross"||s.type==="bypass"))routed=!0;
          else t.nav=null;
        }
        if(routed)n=Vy(t,e);
        else n=RUN?t.runSpd:t.spd;
        // The native collision/step-up code below handles each tread of an unlinked staircase.
        if(!t.nav&&!t.sc){const floor=Fg(t.x+dir*7);if(floor>0&&floor<t.y&&t.y-floor<=7&&Eg(t.x+dir*7,floor)&&!sx(t.x+dir*7,floor-27)){t.y=floor;t.fallY=floor;t.onGround=!0;}}
      }else{
        t.state="idle";t.lstate="idle";t.vx=0;n=0;
      }
      if(k.jump&&t.onGround&&!t.sc){t.vy=-205;t.onGround=!1;t.fallY=t.y;t.state="idle";t.lstate="idle";n=0;k.jump=false;}
      if(dir&&!t.sc){t.state="walk";t.lstate="walk";t.t=999;}
      if(ATK&&!t.sc){n=0;t.vx=0;t.nav=null;t.state="idle";t.lstate="idle";}
      if(AIM&&P.aim.wx!==void 0&&!t.sc)t.dir=P.aim.wx>=t.x?1:-1;
      P.npc===t&&(pL.x+=(t.x-pL.x)*Math.min(1,12*e),pL.y+=(t.y-72-pL.y)*Math.min(1,12*e),pL.vx=0,pL.vy=0,WZMCLAMP());
    }else switch(t.state){case"idle":;`;
    replaceOnce('let n=0;switch(t.state){case"idle":', adapt(movement), 'native NPC movement');

    // possession.js shows its fallback toolbar button only when this flag is set.
    window.__WRECKBOX_POSSESSION_READY__ = true;
    return originalEval(source);
    } catch (error) {
      window.__WRECKBOX_POSSESSION_READY__ = false;
      console.error('Wreckbox Possession patch failed; starting unmodified game source.', error);
      notifyLater('Мод «Вселение»: версия игры не совпала с патчем. Запущена обычная игра.');
      return originalEval(originalSource);
    }
  };
})();