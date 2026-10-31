/* WreckboxMP 1.9.2 — native NPC possession patch */
(() => {
  'use strict';
  if (window.__WRECKBOX_POSSESSION_HOOK_LOADED__) return;
  window.__WRECKBOX_POSSESSION_HOOK_LOADED__ = true;

  const originalEval = window.eval;
  const toolIcon = '<path d="M12 3.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/><path d="M4.5 20c.6-3.5 3.2-5.3 7.5-5.3s6.9 1.8 7.5 5.3"/><path d="M3 7.5h3M18 7.5h3M12 1v2M12 12v2"/><path d="M2.5 12h3M18.5 12h3"/>';

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
    replaceOnce('const OL=t=>', 'PL.possession=' + JSON.stringify(toolIcon) + ';const OL=t=>', 'custom icon');
    replaceOnce('function Ny(t,e){const n=t.sc,o=t.nav;if("act"!==t.state)if("stair"===n.type', 'function Ny(t,e){const n=t.sc,o=t.nav;if("act"!==t.state&&!t.__wzmPossessed)if("stair"===n.type', 'possessed door and elevator transitions');

    replaceOnce('function RA(t){if(!OS[t])return;', 'window.__WRECKBOX_SELECT_POSSESSION__=()=>RA("possession");function RA(t){if(!OS[t])return;', 'native tool selector');

    const toolMarker = 'BS("camera",{name:r("Камера"),icon:"move",hint:r("Перетаскивайте вид. Колесо или щипок — зум."),mode:"both"});const WS=';
    const toolCode = `BS("possession",{
      name:r("Вселение"),icon:"possession",
      hint:r("Кликните по человеку. WASD — движение, W/S — лестницы и лифт, Shift — бег, Space — прыжок, E — выход."),
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
        P.camera={x:pL.x,y:pL.y};if(P.enter(best))MR(r("Вы вселились в NPC. Нажмите E для выхода."),!0);
      },
      update(){
        const P=window.__WRECKBOX_POSSESSION__,panelId="wzm-possession-lift";
        if(!P||!P.active||!P.npc||P.npc.gone||P.npc.dead||P.npc.rag){
          if(P&&P.active&&P.npc&&(!P.npc||P.npc.gone||P.npc.dead||P.npc.rag))P.release();
          const old=document.getElementById(panelId);if(old)old.remove();return;
        }
        const q=P.npc;let lift=null,nearStop=-1,best=1e9;
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
          panel.style.cssText="position:fixed;z-index:99999;right:22px;bottom:90px;display:flex;flex-direction:column;gap:4px;min-width:108px;padding:6px;background:rgba(24,24,24,.94);border:1px solid #555;border-radius:0;font:12px Arial,sans-serif;color:#eee;box-shadow:2px 2px 0 rgba(0,0,0,.45)";
          document.body.appendChild(panel);
        }
        if(panel.dataset.elevator!==String(lift.id)||panel.dataset.floor!==String(nearStop)){
          panel.dataset.elevator=String(lift.id);panel.dataset.floor=String(nearStop);panel.replaceChildren();
          const head=document.createElement("div");head.textContent="ЛИФТ • ЭТАЖ "+(nearStop+1);
          head.style.cssText="text-align:center;padding:4px 2px;color:#eee;border-bottom:1px solid #555;letter-spacing:.5px;font-weight:bold";panel.appendChild(head);
          const grid=document.createElement("div");grid.style.cssText="display:grid;grid-template-columns:repeat(3,1fr);gap:4px";
          lift.stops.forEach((stop,i)=>{
            const button=document.createElement("button");button.type="button";button.textContent=String(i+1);button.title="Вызвать лифт на этаж "+(i+1);
            button.style.cssText="height:28px;background:"+(i===nearStop?"#a87936":"#303030")+";color:"+(i===nearStop?"#17130d":"#eee")+";border:1px solid "+(i===nearStop?"#d0a45e":"#666")+";border-radius:0;box-shadow:none;font:bold 13px Arial,sans-serif;cursor:pointer";
            button.addEventListener("click",()=>{const C=window.__WRECKBOX_POSSESSION__;if(!C||!C.active||!C.npc)return;const entry=(lift.stops[i].sides||[]).find(v=>v.seg&&!v.seg.dead);if(!entry){try{MR("На этот этаж сейчас нет доступа.");}catch(_){}return;}C.npc.nav=null;C.npc.act=null;if(!Wy(C.npc,entry.seg,entry.x,{run:false,haz:false})){try{MR("Лифт не отвечает.");}catch(_){}}});
            grid.appendChild(button);
          });
          panel.appendChild(grid);const foot=document.createElement("div");foot.textContent="НАЖМИТЕ ЭТАЖ";foot.style.cssText="text-align:center;color:#aaa;font:9px Arial,sans-serif;letter-spacing:.4px";panel.appendChild(foot);
        }
      },

    });
    window.addEventListener("wzm-possession-door",()=>{
      const P=window.__WRECKBOX_POSSESSION__,q=P&&P.active&&P.npc;if(!q)return;
      let chosen=null,fromA=false,best=54;
      for(const edge of kg.links){if(edge.dead||edge.type!=="door"||!edge.a||!edge.b)continue;
        const da=Math.hypot(q.x-edge.ax,q.y-edge.ay),db=Math.hypot(q.x-edge.bx,q.y-edge.by);
        if(Math.min(da,db)<best){best=Math.min(da,db);chosen=edge;fromA=da<=db;}
      }
      if(!chosen){try{MR("Подойдите вплотную к дверному проёму и нажмите E.");}catch(_){}return;}
      const target=fromA?chosen.b:chosen.a,x=fromA?chosen.bx:chosen.ax;q.nav=null;q.act=null;
      if(!Wy(q,target,x,{run:false,haz:false})){try{MR("Не удалось пройти через эту дверь.");}catch(_){}}
    });
    window.addEventListener("wzm-possession-release",()=>{const P=window.__WRECKBOX_POSSESSION__;const panel=document.getElementById("wzm-possession-lift");if(panel)panel.remove();if(P&&P.camera){pL.x=P.camera.x;pL.y=P.camera.y;P.camera=null;}});
    const WS=`;
    replaceOnce(toolMarker, toolMarker.replace('const WS=', toolCode), 'tool registration');

    const movement = `let n=0;if(t.__wzmPossessed){
      const P=window.__WRECKBOX_POSSESSION__,k=P.keys;
      if(t.__wzmReleaseAfterSc&&!t.sc){t.__wzmReleaseAfterSc=false;t.__wzmPossessed=false;t.nav=null;t.act=null;t.state="idle";t.lstate="idle";t.t=.2;}
      const dir=(k.right?1:0)-(k.left?1:0),vert=k.up?-1:k.down?1:0;
      const mode=vert?(vert<0?"up":"down"):dir?(dir<0?"left":"right"):"";
      if(mode!==t.__wzmMoveDir){t.nav=null;t.act=null;t.__wzmMoveDir=mode;}
      t.pose="";t.act=null;t.t=999;t.blocked=0;
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
        if(dest&&Wy(t,dest,targetX,{run:!!k.run,haz:!1})){n=Vy(t,e);}
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
          if(ramp){const edge={type:"stair",x0:t.x,x:ramp.x,from:cur,to:ramp.seg,L:null};t.nav={steps:[edge],i:0,sub:0,node:ramp.seg,x:ramp.x,run:!!k.run,px:t.x,stuck:0};n=Vy(t,e);}
        }
        t.state="walk";t.lstate="walk";t.dir=dir||t.dir;
      }else if(dir){
        t.dir=dir;t.state="walk";t.lstate="walk";
        const cur=Vg(t.x,t.y),tx=F(t.x+dir*120,8,m-8),target=Vg(tx,t.y)||Og(tx);
        if(cur&&target&&cur!==target&&Wy(t,target,tx,{run:!!k.run,haz:!1}))n=Vy(t,e);
        else n=k.run?t.runSpd:t.spd;
      }else{
        t.state="idle";t.lstate="idle";t.vx=0;n=0;
      }
      if(k.jump&&t.onGround&&!t.sc){t.vy=-205;t.onGround=!1;t.fallY=t.y;t.state="idle";t.lstate="idle";n=0;k.jump=false;}
      if(dir&&!t.sc){t.state="walk";t.lstate="walk";t.t=999;}
      P.npc===t&&(pL.x+=(t.x-pL.x)*Math.min(1,12*e),pL.y+=(t.y-72-pL.y)*Math.min(1,12*e),pL.vx=0,pL.vy=0);
    }else switch(t.state){case"idle":`;
    replaceOnce('let n=0;switch(t.state){case"idle":', movement, 'native NPC movement');

    return originalEval(source);
    } catch (error) {
      console.error('Wreckbox Possession patch failed; starting unmodified game source.', error);
      try { MR('Мод «Вселение»: версия игры не совпала с патчем. Запущена обычная игра.'); } catch (_) {}
      return originalEval(originalSource);
    }
  };
})();
