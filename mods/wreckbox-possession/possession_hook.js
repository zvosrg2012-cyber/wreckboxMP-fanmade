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
      update(){const P=window.__WRECKBOX_POSSESSION__;if(P&&P.active&&(!P.npc||P.npc.gone||P.npc.dead||P.npc.rag))P.release();},
      draw(ctx){const P=window.__WRECKBOX_POSSESSION__,q=P&&P.active&&P.npc;if(!q)return;ctx.save();ctx.strokeStyle="#8de7ff";ctx.lineWidth=2/Math.max(.5,pL.zoom);ctx.setLineDash([5/Math.max(.5,pL.zoom),4/Math.max(.5,pL.zoom)]);ctx.beginPath();ctx.ellipse(q.x,q.y-12,13,24,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
    });window.addEventListener("wzm-possession-release",()=>{const P=window.__WRECKBOX_POSSESSION__;if(P&&P.camera){pL.x=P.camera.x;pL.y=P.camera.y;P.camera=null;}});const WS=`;
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
        // The native collision/step-up code below handles each tread of an unlinked staircase.
        if(!t.nav&&!t.sc){const floor=Fg(t.x+dir*7);if(floor>0&&floor<t.y&&t.y-floor<=7&&Eg(t.x+dir*7,floor)&&!sx(t.x+dir*7,floor-27)){t.y=floor;t.fallY=floor;t.onGround=!0;}}
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
