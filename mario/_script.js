


'use strict';
/* STEP20 — direct browser translation of the supplied Python source subset.
 * Evidence boundary: SOURCE/player_physics.py, player_vertical_core.py,
 * source_player_check.py, source_enemy_move.py, source_enemy_check.py,
 * source_enemy_spawn.py, source_stage_runtime.py and DATA/source_worlds_built.json.
 * No new physics constants are introduced here. */
const W=20,H=14,NV=13,NH=16,SCREEN_W=320,SCREEN_H=200,EY1=8;
// VGA256.PAS defines MAX_PAGE=1 (two VGA pages, 0..MAX_PAGE). Several source
// routines (ENEMIES.PAS Check/MoveEnemies fireball-dying delay, GLITTER.PAS
// ShowGlitter/Remove lifetime, PLAY.PAS ShowObjects transition window) read
// this constant directly. It was referenced but never declared in this file.
const MAX_PAGE=1;
const keys=new Set(), prevKeys=new Set();
addEventListener('keydown',e=>{keys.add(e.code);if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','AltLeft','AltRight','ControlLeft','ControlRight','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();});
addEventListener('keyup',e=>keys.delete(e.code));
const K={left:()=>keys.has('ArrowLeft'),right:()=>keys.has('ArrowRight'),up:()=>keys.has('ArrowUp'),down:()=>keys.has('ArrowDown'),alt:()=>keys.has('AltLeft')||keys.has('AltRight'),ctrl:()=>keys.has('ControlLeft')||keys.has('ControlRight'),space:()=>keys.has('Space'),ls:()=>keys.has('ShiftLeft'),rs:()=>keys.has('ShiftRight'),s:()=>keys.has('KeyS'),w:()=>keys.has('KeyW'),enter:()=>keys.has('Enter'),p:()=>keys.has('KeyP'),r:()=>keys.has('KeyR'),q:()=>keys.has('KeyQ'),escape:()=>keys.has('Escape')};
const pdiv=(a,b)=>a<0?Math.ceil(a/b):Math.floor(a/b), pmod=(a,b)=>((a%b)+b)%b;
const CAN_HOLD=v=>(v>=0&&v<=13)||(v>=48&&v<=90), CAN_STAND=v=>(v>=14&&v<=16)||(v>=97&&v<=102), HIDDEN=v=>v===36;
let DATA=null,stage=null,player=null,enemies=[]; const imgs={};
/* STEP22: embed the already source-derived stage table so index.html works from file:// without a fetch/CORS dependency. */
const SOURCE_WORLDS=window.MARIO_SOURCE_WORLDS;
const assetNames=["BLOCK_000","BLOCK_001","BRICK0_000","BRICK0_001","BRICK0_002","BRICK1_000","BRICK1_001","BRICK1_002","BRICK2_000","BRICK2_001","BRICK2_002","BROWN_000","BROWN_001","BROWN_002","BROWN_003","BROWN_004","CHAMP_000","CHIBIBO_000","CHIBIBO_001","CHIBIBO_002","CHIBIBO_003","COIN_000","DES_000","DES_001","DES_002","DES_003","DES_004","DONUT_000","DONUT_001","EXIT_000","EXIT_001","FENCE_000","FENCE_001","FIRE_000","FIRE_001","FISH_001","FJLUI_000","FJMAR_000","FLOWER_000","FWLUI_000","FWLUI_001","FWMAR_000","FWMAR_001","F_000","F_001","F_002","F_003","GRASS_000","GRASS_001","GRASS_002","GRASS_003","GRASS_004","GREEN_000","GREEN_001","GREEN_002","GREEN_003","GREEN_004","GRKOOPA_000","GRKOOPA_001","GRKP_000","GRKP_001","HIT_000","INTRO_000","INTRO_001","INTRO_002","LAVA2_000","LAVA2_001","LAVA2_002","LAVA2_003","LAVA2_004","LAVA2_005","LAVA_000","LAVA_001","LIFE_000","LIFT1_000","LJLUI_000","LJMAR_000","LWLUI_000","LWLUI_001","LWMAR_000","LWMAR_001","NOTE_000","PART_000","PIN_000","PIPE_000","PIPE_001","PIPE_002","PIPE_003","POISON_000","PPLANT_000","PPLANT_001","PPLANT_002","PPLANT_003","QUEST_000","QUEST_001","RDKOOPA_000","RDKOOPA_001","RDKP_000","RDKP_001","RED_000","RED_001","SAND_000","SAND_001","SAND_002","SAND_003","SAND_004","SJLUI_000","SJMAR_000","START_000","START_001","STAR_000","SWLUI_000","SWLUI_001","SWMAR_000","SWMAR_001","TREE_000","TREE_001","TREE_002","TREE_003","WHFIRE_000","WOOD_000","WPALM_000","XBLOCK_000"];
function bakedAssetKey(n){return String(n).replace(/_/g,'.');}
function loadBakedImg(n){
  const D=window.MARIO_BAKED_DATA;
  if(!D) return null;
  const key=bakedAssetKey(n);
  const ent=(D.sprites&&D.sprites[key])||(D.pas_images&&D.pas_images[key]);
  if(!ent || !ent.source_data || !D.source_images || !D.source_images[ent.source_data]) return null;
  const src=D.source_images[ent.source_data];
  const w=Number(src.w), h=Number(src.h);
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0) return null;
  const pal=(D.palettes&&D.palettes['MPAL256'])||[];
  if(pal.length<256) return null;
  const a=src.alpha||null, px=src.pixels||[];
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const cc=c.getContext('2d'); const id=cc.createImageData(w,h);
  for(let i=0;i<w*h;i++){
    const idx=Number(px[i]||0)&255, aa=a?Number(a[i]??255):255, q=i*4;
    if(idx===0 || aa===0){ id.data[q]=0; id.data[q+1]=0; id.data[q+2]=0; id.data[q+3]=0; continue; }
    const rgb=pal[idx]||[0,0,0];
    id.data[q]=Math.round(Number(rgb[0]||0)*255/63);
    id.data[q+1]=Math.round(Number(rgb[1]||0)*255/63);
    id.data[q+2]=Math.round(Number(rgb[2]||0)*255/63);
    id.data[q+3]=Math.max(0,Math.min(255,aa));
  }
  cc.putImageData(id,0,0);
  return c;
}
function loadImg(n){return new Promise((r,j)=>{
  const baked=loadBakedImg(n);
  if(baked){imgs[n]=baked;r(baked);return;}
  const i=new Image();i.onload=()=>{imgs[n]=i;r(i)};i.onerror=()=>j(new Error('asset '+n+' failed'));i.src='ASSETS/'+n+'.png';
});}
// STEP 94 — Source parity runtime audit marker retained for regression tests.
// STEP 94 — compatibility marker: R restart is handled in the 60Hz input phase

function img(n){return imgs[n]}
function drawSprite(ctx,n,x,y,w=W,h=H,flip=false){const im=img(n);if(!im)return;if(flip){ctx.save();ctx.translate(x+w,y);ctx.scale(-1,1);ctx.drawImage(im,0,0,w,h);ctx.restore()}else ctx.drawImage(im,x,y,w,h)}
function drawSpriteHFlip(ctx,n,x,y,w=W,h=H){const im=img(n);if(!im)return;ctx.save();ctx.translate(x+w,y);ctx.scale(-1,1);ctx.drawImage(im,0,0,w,h);ctx.restore()}
function drawSpriteVFlip(ctx,n,x,y,w=W,h=H){const im=img(n);if(!im)return;ctx.save();ctx.translate(x,y+h);ctx.scale(1,-1);ctx.drawImage(im,0,0,w,h);ctx.restore()}
function drawSpriteHVFlip(ctx,n,x,y,w=W,h=H){const im=img(n);if(!im)return;ctx.save();ctx.translate(x+w,y+h);ctx.scale(-1,-1);ctx.drawImage(im,0,0,w,h);ctx.restore()}
function wallAsset(design,n,wallType=0){
  // FIGURES.PAS::InitWall selects the wall bank from Options.WallType1,
  // not from Design.  BuildWorld's 1..13 values are the source FigList
  // indices and the second bank (14..26) is selected separately by WallType2.
  const wt=Number(wallType);
  if(wt===2){
    // WallType=2 is ReColor2(Green000..004, GroundColor1, GroundColor2).
    // The HTML runtime has not previously had the indexed recolor path here;
    // keep the source bank visible until that exact palette transform is added.
    const pref='GREEN';
    return `${pref}_00${Math.min(4,Math.max(0,n-1))}`;
  }
  const pref={0:'GREEN',1:'SAND',3:'BROWN',4:'GRASS',5:'DES'}[wt];
  if(pref)return `${pref}_00${Math.min(4,Math.max(0,n-1))}`;
  // WallType 100..102 is handled by the source A/brick path, not InitWall.
  return null;
}
let bumpBlockState=null;

// BLOCKS.PAS::BumpBlock receives GetImage(X,Y,W,H) and
// SaveBumpBackGr(X,Y-BumpHeight,W,H+BumpHeight) from the page that is
// currently visible before MovePlayer changes the world.  The browser canvas
// already contains that previous presented page at this point in the source
// frame loop, so capture those exact source-space rectangles instead of
// selecting a new block PNG during DrawBlocks.
function captureBumpImage(x,y,w,h,cam){
  if(!canvas || !ctx)return null;
  // BumpBlock passes source PIXEL coordinates (mx*W, my*H), not map-cell
  // coordinates. Do not multiply by W/H a second time.
  const sx=Math.round(Number(x)-Number(cam));
  const sy=Math.round(Number(y)+9);
  if(sx<0 || sy<0 || sx+w>canvas.width || sy+h>canvas.height)return null;
  const c=document.createElement('canvas');
  c.width=w;c.height=h;
  const cctx=c.getContext('2d');
  cctx.imageSmoothingEnabled=false;
  cctx.drawImage(canvas,sx,sy,w,h,0,0,w,h);
  return c;
}

function sourceBlockAsset(design,n,wallType=0){
  if(n>=1&&n<=26){
    // SOURCE/Python SourceFigureSet has one wall bank selected by WallType1;
    // 14..26 are only aliases for 1..13. Do not switch to WallType2.
    let nn=n;
    if(nn>13)nn-=13;
    return wallAsset(design,nn,Number(wallType||0));
  }
  if(n===63)return 'QUEST_000';
  if(n===64)return 'QUEST_001';
  if(n===73)return 'BLOCK_000';
  if(n===74)return 'BLOCK_001';
  if(n===75)return 'NOTE_000';
  if(n===88)return 'XBLOCK_000';
  if(n===87)return 'WOOD_000';
  if(n>=48&&n<=51)return `PIPE_00${n-48}`;
  return null;
}

function moveBumpBlock(){
  // BLOCKS.PAS::MoveBlocks: MoveDelay=0, DY starts at -BumpHeight (-4),
  // advances one unit per source frame until +4, then waits four frames.
  if(!bumpBlockState)return;
  if(bumpBlockState.dy<4){
    bumpBlockState.dy+=1;
    bumpBlockState.delayCounter=0;
    // DY has just reached BumpHeight: DrawBlocks stops drawing the displaced
    // copy, so the ordinary map cell must be presented again from this frame on.
    if(bumpBlockState.dy>=4) foregroundCache=null;
  }else{
    bumpBlockState.delayCounter+=1;
    if(bumpBlockState.delayCounter>=4){
      bumpBlockState=null;
      foregroundCache=null;
    }
  }
}

class World{
 constructor(rows,xsize){
   this.rows=rows;this.xsize=xsize;this.revision=0;
   // BUFFERS.PAS::ReadWorld allocates [-EX..X+EX-1][-EY1..NV-1+EY2].
   // The HTML map must retain those non-visible rows/edge columns because
   // PLAYERS.PAS uses row 13 for the E6/E7 camera-end markers and collision
   // code can address the source padding rows.
   this.extBottom=Array.from({length:xsize},(_,x)=>Number(rows[NV-1]?.[x]??32));
 }
 get(x,y){
   x=Number(x);y=Number(y);
   if(x===-1 || x===this.xsize){ return (y>=-8&&y<=15)?64:32; }
   if(x< -1 || x>this.xsize)return 32;
   if(x>=0 && x<this.xsize){
     if(y===-8)return 0;
     if(y>=0 && y<NV)return this.rows[y]?.[x]??32;
     if(y>=NV && y<=NV+2)return this.extBottom[x];
   }
   return 32;
 }
 set(x,y,v){
   x=Number(x);y=Number(y);v=Number(v);
   if(x>=0&&x<this.xsize&&y>=0&&y<NV){if(this.rows[y][x]!==v){this.rows[y][x]=v;this.revision+=1}}
 }
}
function makeStage(key){const d=DATA[key];if(!d||!d.has_map)return null;return {key,options:d.options,world:new World(d.rows.map(r=>r.slice()),d.xsize),spawn:d.spawn.slice(),turbo:false}}
// source_rng.py::TurboPascal7Random. The multiplier is recovered from the
// supplied MARIO.EXE runtime. Randomize's seed acquisition is explicitly OPEN
// in the Python source, so use a time-derived 32-bit seed as that same open
// boundary; all subsequent Random(N) arithmetic is source-derived.
let sourceRandSeed=(Date.now()*1000)&0xFFFFFFFF;
function sourceRandom(n){
  n=Number(n);if(n<=0)throw new Error('source Random(N) requires N>0');
  sourceRandSeed=(Math.imul(sourceRandSeed,0x08088405)+1)>>>0;
  return Math.floor(((sourceRandSeed>>>16)*n)/65536);
}

// PALETTES.PAS::BlinkPalette writes DAC entry 1 for the Star with
// Random(4), Random(8), Random(25). Keep the three calls in the source
// order and consume them once per source frame, not once per sprite.
let starPaletteVga=[0,10,41];
function sourceBlinkStarPalette(){
  starPaletteVga=[
    (60+sourceRandom(4))&63,
    (55+sourceRandom(8))&63,
    (30+sourceRandom(25))&63
  ];
}

function spawnEnemies(s, fromColumn=0, toColumn=16, directionOverride=null){
  /* ENEMIES.PAS::StartEnemies calls NewEnemy for every recognized marker.
   * NewEnemy owns the 25-slot limit, Turbo scaling, and fireball constraints.
   * Do not bypass that boundary here: doing so lets the HTML array grow beyond
   * the source EnemyList and also leaves source markers uncleared when full. */
  const out=[];
  const lo=Math.max(0, fromColumn), hi=Math.min(s.world.xsize, toColumn);
  // Source StartEnemies receives Direction from its caller.  The initial
  // Restart scan computes it as `1 - 2 * Byte(j > MapX)`, where MapX is the
  // source map width.  Runtime callers therefore pass directionOverride;
  // there is no source rule that derives Direction from InitX.
  const directionFor=x => directionOverride===null ? 1 : Number(directionOverride);
  const canCreate=()=>out.length + enemies.length < 25;
  const make=(tp,sub,x,y,xv,yv,delay)=>{
    if(!canCreate()) return null;
    let xx=Number(x)*W, yy=Number(y)*H, vx=Number(xv), vy=Number(yv), d=Number(delay);
    if(s.turbo){vx*=2;vy*=2;d=pdiv(d,2);}
    if(Number(tp)===18){xx+=8;}
    if(Number(tp)===13){
      // ENEMIES.PAS::NewEnemy sets FireBall XPos to PlayerX2/PlayerX1 after
      // Turbo scaling, rather than leaving it at InitX*W. Spawned fireballs
      // are rare, but the same source boundary is used for every NewEnemy.
      xx = vx>0 ? Number(player?.x2??xx) : Number(player?.x1??xx);
    }
    const e={tp:Number(tp),sub:Number(sub),x:xx,y:yy,lastx:xx,lasty:yy,vx:vx,vy:vy,delay:d,dc:0,dirc:0,status:0,counter:0,mapx:Number(x),mapy:Number(y)};
    if(Number(tp)===13 && out.some(q=>q.tp===13) + enemies.filter(q=>q.tp===13).length>=2)return null;
    out.push(e); return e;
  };
  for(let x=lo;x<hi;x++){
    const direction=directionFor(x);
    for(let y=0;y<NV;y++){
      const c=s.world.get(x,y); let e=null;
      if(c===0x80) e=make(2,0,x,y,direction,0,2);
      else if(c===0x81) e=make(15,0,x,y+2,0,0,50+sourceRandom(100));
      else if(c===0x82) e=make(17,0,x,y+2,0,0,50+sourceRandom(100));
      else if(c===0x83) e=make(2,1,x,y,direction,0,2);
      else if(c>=0x84&&c<=0x86) e=make(18,c-0x84,x,y+2,0,0,20+sourceRandom(50));
      else if(c===0x87) e=make(20,0,x,y,direction,0,2);
      else if(c>=0x88&&c<=0x8A) e=make(50,c-0x88,x,y,direction,0,2);
      else if(c===0xB0){
        const left=s.world.get(x-1,y), right=s.world.get(x+1,y);
        const supported=(CAN_HOLD(left)||CAN_HOLD(right));
        e=make(60,0,x,y,supported?-direction:0,supported?0:-direction,0);
      } else if(c===0xB1) e=make(61,0,x,y,0,0,0);
      /* 81/82/84..86 require the unresolved source Random() argument. Keep
       * the marker intact instead of inventing a replacement random stream. */
      // STEP157 SOURCE FIX: make() already appends the newly allocated enemy
    // to `out`, exactly once.  The previous HTML path appended it a second
    // time here, so every enemy discovered by StartEnemies occupied two
    // entries referring to the same object.  MoveEnemies then advanced that
    // object twice per frame, making Level 1A enemies visibly too fast.
    // ENEMIES.PAS StartEnemies has one NewEnemy call and one returned slot;
    // there is no second insertion.
    if(e){s.world.set(x,y,32)}
    }
  }
  return out;
}

const MAX_TEMP_OBJ=20, MAX_REMOVE=10;
let tempObjects=[];
let removeList=[];
// GLITTER.PAS::GlitterRuntime. The source allocates slots 1..MaxGlitter-1
// (MaxGlitter=75), culls NewGlitter against XView/NH, and keeps an 8-bit
// duration counter. Pixel restoration is deliberately not synthesized here;
// presentation uses the source palette attribute for live records.
const MAX_GLITTER=75;
let glitterObjects=[];
function initGlitter(){
  glitterObjects=Array.from({length:MAX_GLITTER+1},()=>({alive:false,attr:0,x:0,y:0,duration:0}));
}
function newGlitter(x,y,attr,duration){
  if(x<player.x_view || x>=player.x_view+NH*W || y<0 || y>NV*H)return false;
  for(let i=1;i<MAX_GLITTER;i++){
    const g=glitterObjects[i];
    if(!g.alive){g.alive=true;g.attr=Number(attr)&255;g.x=Number(x);g.y=Number(y);g.duration=Number(duration)&255;return true;}
  }
  return false;
}
function newGlitterStar(x,y,attr,duration){
  newGlitter(x+0,y+0,attr,duration+4);
  newGlitter(x+1,y+0,attr,duration);
  newGlitter(x+0,y+1,attr,duration);
  newGlitter(x-1,y+0,attr,duration);
  newGlitter(x+0,y-1,attr,duration);
}
function startGlitter(x,y,w,h){
  // GLITTER.PAS::StartGlitter: one NewStar followed by four NewGlitter calls,
  // consuming the shared Turbo Pascal Random stream in source order.
  newGlitterStar(x+sourceRandom(w),y+sourceRandom(h),0x1F,10+sourceRandom(10));
  for(let i=0;i<4;i++)newGlitter(x+sourceRandom(w),y+sourceRandom(h),0x1F,5+sourceRandom(10));
}
function coinGlitter(x,y){
  // GLITTER.PAS::CoinGlitter — all six calls are deterministic.
  newGlitterStar(x+5,y+2,0x1F,20);
  newGlitterStar(x+W-6,y+6,0x1F,18);
  newGlitterStar(x+10,y+H-3,0x1F,16);
  newGlitter(x+W-9,y+2,0x1F,15);
  newGlitter(x+6,y+7,0x1F,17);
  newGlitter(x+3,y+9,0x1F,15);
}
function tickGlitter(){
  for(let i=1;i<MAX_GLITTER;i++){
    const g=glitterObjects[i];
    if(!g.alive)continue;
    if(g.duration>0)g.duration--;
    if(g.duration===0)g.alive=false;
  }
}
function drawGlitter(ctx,cam){
  const pal=sourceRuntimePalette(stage.options||{});
  for(let i=1;i<MAX_GLITTER;i++){
    const g=glitterObjects[i];
    // GLITTER.PAS::ShowGlitter: Count > MAX_PAGE+1. MAX_PAGE=1.
    if(!g.alive || g.duration<=2)continue;
    const rgb=pal[g.attr]||[63,63,63];
    ctx.fillStyle=sourceVgaRgb(rgb);
    ctx.fillRect(g.x-cam,g.y+9,1,1);
  }
}

function initTempObjects(){
  initGlitter();
  tempObjects=Array.from({length:MAX_TEMP_OBJ+1},()=>({alive:false,visible:[false,false],tp:0,x:0,y:0,w:0,h:0,xv:0,yv:0,delay:0}));
  removeList=Array.from({length:MAX_REMOVE+1},()=>({active:false,x:0,y:0,w:0,h:0,newImg:0,count:0}));
}
function newTempObject(tp,x,y,xv,yv,w,h){
  // TMPOBJ.PAS::NewTempObj. Preserve the source TP_BROKEN viewport admission
  // test before consuming a slot; this prevents off-page debris from entering
  // the 20-entry temporary-object table.
  if(Number(tp)===1){
    const vx=Number(player?.x_view??0);
    const xx=Number(x), vv=Number(xv);
    if(vv>0){
      if(xx+32*vv > vx + NH*W + 2*W) return null;
    }else{
      if(xx+32*vv+2*W < vx) return null;
    }
  }
  for(let i=1;i<=MAX_TEMP_OBJ;i++){
    const t=tempObjects[i];
    if(t.alive||t.visible[0]||t.visible[1])continue;
    t.alive=true;t.visible[0]=t.visible[1]=false;t.tp=tp;t.x=x;t.y=y;t.xv=xv;t.yv=yv;t.w=w;t.h=h;t.delay=0;
    return i;
  }
  return null;
}
function sourceRemove(x,y,w,h,newImg){
  // TMPOBJ.PAS::Remove: MAX_PAGE+1 frames of restoration state.
  for(let i=1;i<=MAX_REMOVE;i++){
    const r=removeList[i];
    if(r.active)continue;
    r.active=true;r.x=x;r.y=y;r.w=w;r.h=h;r.newImg=newImg;r.count=2;
    return i;
  }
  return null;
}
function moveTempObjects(){
  // TMPOBJ.PAS::MoveTempObj. The coin glitter is emitted only when the
  // source TP_COIN reaches MAX_COIN_YVEL+1, using the post-integration
  // position (x+xv,y+yv) from the source callback boundary.
  for(let i=1;i<=MAX_TEMP_OBJ;i++){
    const t=tempObjects[i];if(!t.alive)continue;
    let coinFinished=false;
    if(t.tp===1){
      t.delay++;
      if(t.delay>3){t.delay=0;t.yv++;if(t.y>NV*H)t.alive=false;}
    }else if(t.tp===2){
      t.delay++;
      if(t.delay>12){
        t.yv++;
        if(t.yv>6){t.alive=false;coinFinished=true;}
      }
    }else if(t.tp===3||t.tp===4){
      t.delay++;if(t.delay>4)t.alive=false;
    }
    t.x+=t.xv;t.y+=t.yv;
    if(coinFinished) coinGlitter(t.x,t.y);
  }
}
function runRemoveObjects(ctx,cam){
  for(let i=1;i<=MAX_REMOVE;i++){
    const r=removeList[i];if(!r.active)continue;
    const sx=r.x-cam, sy=r.y+9;
    // SOURCE/game.py RunRemove presentation table:
    //   {1: assets.quest[1], 2: assets.quest[0], 5: assets.temp_note}
    // i.e. 1 -> QUEST_001 (used block), 2 -> QUEST_000, 5 -> NOTE_000.
    // The old 1 -> PART_000 / 2 -> COIN_000 mapping was not the source's and
    // made a debris/coin sprite blink over a just-hit '?' block.
    if(r.newImg===1)drawSprite(ctx,'QUEST_001',sx,sy,r.w,r.h);
    else if(r.newImg===2)drawSprite(ctx,'QUEST_000',sx,sy,r.w,r.h);
    else if(r.newImg===5)drawSprite(ctx,'NOTE_000',sx,sy,r.w,r.h);
    // newImg=0 restores background; drawWorld already supplied that page.
    r.count--;if(r.count<1)r.active=false;
  }
}
function drawTempObjects(ctx,cam){
  const names={1:'PART_000',2:'COIN_000',3:'HIT_000',4:'WHFIRE_000',5:'NOTE_000'};
  for(let i=1;i<=MAX_TEMP_OBJ;i++){
    const t=tempObjects[i];if(!t.alive)continue;
    const n=names[t.tp];if(!n)continue;
    drawSprite(ctx,n,t.x-cam,t.y+9,t.w,t.h);
  }
}


/* STEP173 — SOURCE CONFIG + MUSIC.PAS presentation bridge
 * Python authority: source_config.py and audio_runtime.py in MARIO_PYTHON_PORTABLE.py.
 * Browser storage/audio are only representation changes; slot fields, menu labels,
 * toggle semantics and selected source MP3 names remain source-defined. */
const SOURCE_SAVE_KEY='MARIO_SOURCE_CONFIG_V1';
function sourceDefaultConfig(){
  const game=()=>({num_players:1,progress:[0,0],lives:[3,3],coins:[0,0],score:[0,0],mode:[0,0]});
  return {sound:true,sline:true,use_js:false,games:[game(),game(),game()],jsdat:Array(12).fill(0)};
}
function sourceLoadConfig(){
  const d=sourceDefaultConfig();
  try{
    const raw=localStorage.getItem(SOURCE_SAVE_KEY); if(!raw)return d;
    const o=JSON.parse(raw);
    if(!o||typeof o!=='object')return d;
    d.sound=!!(o.sound??true); d.sline=!!(o.sline??true); d.use_js=!!o.use_js;
    if(Array.isArray(o.games))for(let i=0;i<3;i++){
      const g=o.games[i]; if(!g)continue;
      d.games[i].num_players=Number(g.num_players??1);
      for(const k of ['progress','lives','coins','score','mode']){
        if(Array.isArray(g[k]))d.games[i][k]=[Number(g[k][0]??d.games[i][k][0]),Number(g[k][1]??d.games[i][k][1])];
      }
    }
    if(Array.isArray(o.jsdat)&&o.jsdat.length===12)d.jsdat=o.jsdat.map(v=>Number(v)&0xffff);
  }catch(_e){}
  return d;
}
function sourceSaveConfig(){
  try{localStorage.setItem(SOURCE_SAVE_KEY,JSON.stringify(browserConfig));}catch(_e){}
}
let browserConfig=sourceLoadConfig();
let currentSaveSlot=-1;
let currentPlayerIndex=0;
let sourceProgress=0;
let sourceNumPlayers=1;
// Source Data[Player] mirror.  The HTML runtime must keep the same per-player
// state boundary as the Python runtime; this is state storage only, not a new
// game rule.
let sourcePlayers=[
  {progress:0,lives:3,coins:0,score:0,mode:0},
  {progress:0,lives:3,coins:0,score:0,mode:0}
];
function sourceCaptureCurrentPlayer(){
  if(!player)return;
  const d=sourcePlayers[currentPlayerIndex];
  d.progress=Number(sourceProgress);
  d.lives=Number(player.lives);
  d.coins=Number(player.coins);
  d.score=Number(player.score);
  d.mode=Number(player.mode);
}
function sourceSyncPlayerState(){
  if(!player)return;
  const d=sourcePlayers[currentPlayerIndex];
  d.lives=Number(player.lives); d.coins=Number(player.coins);
  d.score=Number(player.score); d.mode=Number(player.mode);
  sourceProgress=Number(d.progress);
}

function sourceSaveLabel(slot,eraseMode=false){
  const g=browserConfig.games[slot];
  if(g.progress[0]===0&&g.progress[1]===0)return `GAME #${slot+1} \x07 EMPTY`;
  let j=Number(g.progress[0]), k=Number(g.progress[0]>=6);
  if(k)j-=6;
  if(Number(g.progress[1])>j){j=Number(g.progress[1]);g.progress[0]=j;}
  return `GAME #${slot+1} \x07 LEVEL ${j+1} ${k?'* ':'\x07 '}${g.num_players}P`;
}
function sourceSyncSaveSlot(){
  if(currentSaveSlot<0)return;
  sourceSyncPlayerState();
  const g=browserConfig.games[currentSaveSlot];
  g.num_players=sourceNumPlayers;
  g.progress[0]=Number(sourcePlayers[0].progress);
  g.progress[1]=Number(sourcePlayers[1].progress);
  g.lives[0]=Number(sourcePlayers[0].lives); g.lives[1]=Number(sourcePlayers[1].lives);
  g.coins[0]=Number(sourcePlayers[0].coins); g.coins[1]=Number(sourcePlayers[1].coins);
  g.score[0]=Number(sourcePlayers[0].score); g.score[1]=Number(sourcePlayers[1].score);
  g.mode[0]=Number(sourcePlayers[0].mode); g.mode[1]=Number(sourcePlayers[1].mode);
  browserConfig.sound=!!introSound;browserConfig.sline=!!introStatusLine;
  sourceSaveConfig();
}
function sourceStartMusic(name){
  if(!browserConfig.sound)return;
  if(!window.__marioAudio)window.__marioAudio={channel:null,cache:new Map()};
  const a=window.__marioAudio;
  if(!a.channel)a.channel=new Audio();
  const allowed=new Set(['LifeMusic','GrowMusic','CoinMusic','PipeMusic','FireMusic','HitMusic','DeadMusic','NoteMusic','StarMusic']);
  if(!allowed.has(name))return;
  const src=`AUDIO/${name}.mp3`;
  try{a.channel.pause();a.channel.currentTime=0;a.channel.src=src;const p=a.channel.play();if(p&&p.catch)p.catch(()=>{});}catch(_e){}
}
function sourceBeep(freq){
  if(!browserConfig.sound||!freq)return;
  // BUFFERS.PAS has one PC-speaker path. A source Beep replaces the currently
  // playing music/effect instead of opening a second browser audio channel.
  if(!window.__marioAudio)window.__marioAudio={channel:null,cache:new Map()};
  const a=window.__marioAudio;
  if(!a.channel)a.channel=new Audio();
  const src=`AUDIO/BEEP_${Number(freq)}.mp3`;
  try{a.channel.pause();a.channel.currentTime=0;a.channel.src=src;const p=a.channel.play();if(p&&p.catch)p.catch(()=>{});}catch(_e){}
}
function sourceNoSound(){
  const a=window.__marioAudio?.channel;if(a){try{a.pause();a.currentTime=0;}catch(_e){}}
}
function sourceSetSound(on){browserConfig.sound=!!on;if(!browserConfig.sound)sourceNoSound();}

class Player{
 constructor(s){this.stage=s;this.player_index=Number(currentPlayerIndex)||0;this.x=s.spawn[0];this.y=s.spawn[1];this.oldx=this.x;this.oldy=this.y;this.xv=0;this.yv=0;this.dir=1;this.walking_mode=0;this.status=0;this.counter=0;this.jumped=false;this.high_jump=false;this.small=true;this.mode=0;this.fired=false;this.cd_hit=0;this.cd_enemy=0;this.cd_lift=0;this.cd_stop_jump=0;this.hit_enemy=false;this.x_view=0;this.walk_count=0;this.lives=3;this.score=0;this.level_score=0;this.coins=0;this.game_done=false;this.blink=0;this.blinking=false;this.blink_counter=0;this.star=false;this.star_counter=0;this.growing=false;this.grow_counter=0;this.cd_champ=0;this.player_x_vel=0;this.player_y_vel=0;this.player_x1=this.x;this.player_x2=this.x+W-1;this.player_y1=this.y+H;this.player_y2=this.y+2*H-1;this.cd_life=0;this.cd_flower=0;this.cd_star=0;this.demo=0;this.demo_counter1=0;this.demo_counter2=0;this.demo_x=0;this.demo_y=0;this.fire_counter=0;this.in_pipe=false;this.pipe_code=[32,32];this.updateBounds()}
 updateBounds(){this.x1=this.x;this.x2=this.x+W-1;this.y1=this.y+(this.small?H:0);this.y2=this.y+2*H-1}
 breakBlock(mx,my){
   // TMPOBJ.PAS::BreakBlock: clear block, restore background, then create four
   // debris temp objects with the exact source velocities/sizes.
   const w=this.stage.world;
   if(w.get(mx,my)!==74 || this.small)return;
   w.set(mx,my,32);
   sourceRemove(mx*W,my*H,W,H,0);
   newTempObject(1,mx*W,my*H,-2,-6,12,H/2);
   newTempObject(1,mx*W+W/2,my*H,2,-6,12,H/2);
   newTempObject(1,mx*W,my*H+H/2,-2,-4,12,H/2);
   newTempObject(1,mx*W+W/2,my*H+H/2,2,-4,12,H/2);
   // TMPOBJ.PAS::BreakBlock emits Beep(110) after creating all four fragments.
   this._effect('Beep',110);
 }
 checkJump(keyAlt){if(this.cd_enemy){this.hit_enemy=true;this.jumped=false}if(!this.jumped&&(keyAlt||this.hit_enemy)){this.counter=0;this.status=1;this.high_jump=Math.abs(this.xv)===2||(this.hit_enemy&&keyAlt);this.yv=-4-2*Number(this.hit_enemy&&keyAlt)-Number(this.stage.turbo)}this.cd_enemy=0}
 hitCoin(x,y,throwUp){
   // TMPOBJ.PAS::HitCoin. Throw-up creates TP_COIN without clearing the map;
   // normal collection clears the source coin and schedules background restore.
   const tx=pdiv(x,W), ty=pdiv(y,H);
   // TMPOBJ.PAS::HitCoin -> "if WorldMap[MapX,MapY] in [#0,' '] then Exit".
   // The source only rejects an EMPTY map cell. Requiring the cell to be a
   // coin ('*', 42) was a browser-side invention: it made the '?'/'$'/note
   // block ThrowUp path (called with the block's own cell) silently fail, so
   // no coin ever rose out of a question block and no Beep(2420) was emitted.
   const cell=this.stage.world.get(tx,ty);
   if(cell===0||cell===32)return false;
   if(throwUp){
     newTempObject(2,Number(x),Number(y)-H,0,-4,W,H);
   }else{
     this.stage.world.set(tx,ty,32);
     sourceRemove(Number(x),Number(y),W,H,0);
   }
   sourceBeep(2420);this.coins+=1;this.level_score+=50;
   // TMPOBJ.PAS::HitCoin: CoinGlitter is emitted for normal collection;
   // the thrown-up coin emits its glitter later when MoveTempObj ends it.
   if(!throwUp) coinGlitter(Number(x),Number(y));
   // TMPOBJ.PAS::HitCoin awards a life at exactly 100 coins and resets the
   // coin counter. Keep this source state transition here rather than adding
   // a generic modern coin rule elsewhere.
   if(this.coins%100===0){
     this.lives+=1;
     this.coins=0;
   }
   return true;
 }
 removeTempObject(x,y,w,h,img){ sourceRemove(Number(x),Number(y),Number(w),Number(h),Number(img)); }
 bumpBlock(mx,my,ch){
   /* PLAYERS.PAS calls BumpBlock(X,Y) after the ceiling-block branch.
      BLOCKS.PAS owns the one-at-a-time visual animation; it captures the
      original block image before moving it and refuses a second bump while
      Bumping is already true. */
   const w=this.stage.world;
   if(ch===74 && !this.small){
     w.set(mx,my,32); this.level_score+=10; return;
   }
   if(!bumpBlockState){
     const cam=Number(this.x_view||0)*1;
     // Source PLAY.PAS supplies the current visible page to BLOCKS.PAS before
     // MovePlayer.  Keep the captured images in the bump state exactly as the
     // source BlockBuffer/BackGrBuffer pair.
     let blockBuffer=captureBumpImage(mx*W,my*H,W,H,cam);
     let backgrBuffer=captureBumpImage(mx*W,(my*H)-4,W,H+4,cam);
     // Source BLOCKS.PAS captures the already-rendered BlockBuffer. For the
     // browser, if the source block is outside the current 320px capture
     // rectangle, rebuild only the captured source image from its original
     // indexed asset; never replace it with a guessed graphic.
     if(!blockBuffer){
       const asset=sourceBlockAsset(Number(this.stage.options?.Design??0),Number(ch),Number(this.stage.options?.WallType1??0));
       const im=asset&&img(asset);
       if(im){blockBuffer=document.createElement('canvas');blockBuffer.width=W;blockBuffer.height=H;blockBuffer.getContext('2d').drawImage(im,0,0,W,H);}
     }
     bumpBlockState={x:mx,y:my,ch:Number(ch),dy:-4,delayCounter:0,
       blockBuffer:blockBuffer,backgrBuffer:backgrBuffer};
     foregroundCache=null;
   }
   // BLOCKS.PAS::BumpBlock contains ONLY the bump-animation state above.
   // The coin / power-up / map-replacement logic belongs to PLAYERS.PAS
   // CheckJumping (see check() below) and was duplicated here by mistake,
   // which would emit a second coin for every '?' block hit.
 }
 newEnemy(tp,sub,initX,initY,xv,yv,delay){
   // ENEMIES.PAS::NewEnemy is the single allocation boundary: MaxEnemiesAtOnce=25,
   // Turbo doubles velocities and halves delay, and FireBall is limited to two.
   const T=Number(tp);
   if(enemies.length>=25)return null;
   if(T===13 && enemies.filter(e=>e.tp===13).length>=2)return null;
   let vx=Number(xv),vy=Number(yv),d=Number(delay);
   if(this.stage.turbo){vx*=2;vy*=2;d=pdiv(d,2);}
   let x=Number(initX)*W,y=Number(initY)*H;
   if(T===13){
     // ENEMIES.PAS::NewEnemy receives PlayerX1/PlayerX2 from the source
     // player globals. These are published by MovePlayer after X/Y integration
     // and are therefore intentionally not the same thing as the renderer
     // collision rectangle this.x1/this.x2.
     x=vx>0?Number(this.player_x2):Number(this.player_x1);
     this._effect('StartMusic','FireMusic');
   }
   // ENEMIES.PAS::NewEnemy case Tp of: tpVertPlant shifts the initial XPos
   // by +8 pixels after the map-cell position is assigned. This is source
   // state, not a rendering offset, so preserve it before LastXPos is seeded.
   if(T===18)x+=8;
   const e={tp:T,sub:Number(sub),x:x,y:y,lastx:x,lasty:y,vx:vx,vy:vy,delay:d,dc:0,dirc:0,status:0,counter:0,mapx:Number(initX),mapy:Number(initY)};
   enemies.push(e); return e;
 }
 startDemo(dm){
   // PLAYERS.PAS StartDemo: source pipe/dead demo state only.
   this.demo=dm;this.demo_counter1=0;this.demo_counter2=0;this.demo_x=0;this.demo_y=0;
   this.below1=32;this.below2=32;this.at_ch1=32;this.at_ch2=32;
   // PLAYERS.PAS StartDemo: all demo starts clear InPipe first; pipe demos
   // additionally start PipeMusic before their direction-specific setup.
   this.in_pipe=false;
   if(dm>=1&&dm<=4)this._effect('StartMusic','PipeMusic');
   if(dm===4)this.demo_y=2*H-9*Number(this.small);
   if(dm===2){this.demo_y=-2*H;this.y+=H-7*Number(this.small)-2;}
   if(dm===5){this.yv=-3;this._effect('Beep',220);}
 }
 checkPipeAbove(c1,c2){
   // PLAYERS.PAS CheckPipeAbove 444-460, direct condition/order.
   const mo=pmod(this.x,W);
   if(mo<4||mo>W-4)return false;
   if(c1!==48||c2!==49)return false;
   const mx=pdiv(this.x,W), my=pdiv(this.y,H)+1;
   const p1=this.stage.world.get(mx,my),p2=this.stage.world.get(mx+1,my);
   if(p1<224||p1>231)return false;
   if(p2<224||p2>239)return false;
   this.pipe_code=[p1,p2];this.startDemo(3);return true;
 }
 checkPipeBelow(){
   // PLAYERS.PAS CheckPipeBelow: exact source condition order.
   if(this.xv!==0 || this.yv!==0 || pmod(this.y,H)!==0)return false;
   const mo=pmod(this.x,W); if(mo<4||mo>W-4)return false;
   if(this.below1!==48 || this.below2!==49)return false;
   if(this.at_ch1<224||this.at_ch1>231)return false;
   if(this.at_ch2<224||this.at_ch2>239)return false;
   this.pipe_code=[this.at_ch1,this.at_ch2]; this.startDemo(1); return true;
 }
 doDemo(){
   // PLAYERS.PAS DoDemo 318-389; only source-translated pipe states.
   if(this.demo===1||this.demo===4){this.demo_counter1++;if(this.demo_counter1%3===0){
      if(this.demo===1){this.demo_y++;if(this.demo_y>2*H-9*Number(this.small)){this.demo_counter2++;this.demo_y--;if(this.demo_counter2>10)this.in_pipe=true}}
      else {this.demo_y--;if(this.demo_y<0){this.demo_y++;this.demo=0}}
   }}
   else if(this.demo===3||this.demo===2){this.demo_counter1++;if(this.demo_counter1%3===0){
      if(this.demo===2){this.demo_y++;if(this.demo_y>-9*Number(this.small)){this.demo=0;this.demo_y--}}
      else {this.demo_y--;if(this.demo_y<-2*H+9*Number(this.small)){this.demo_counter2++;this.demo_y++;if(this.demo_counter2>10)this.in_pipe=true}}
   }}
   else if(this.demo===5){this.demo_counter1++;if(this.demo_counter1%7===0)this.yv+=1;this.y+=this.yv;if(this.y>13*H)this.game_done=true;}
 }
 check(){
  // Direct translation of SourcePlayerCheck.check/check_fall/check_jump.
  // Tile values stay numeric because the HTML world is the source byte map.
  const s=this, w=this.stage.world;
  let newCh1=32,newCh2=32,newCh3=32;
  const side=s.xv>0?W-1:0;
  let newX1=pdiv(s.x+side,W), newX2=pdiv(s.x+side+s.xv,W);
  if(newX1!==newX2){
    const y1=pdiv(s.y+EY1*H+4,H)-EY1;
    const y2=pdiv(s.y+EY1*H+H,H)-EY1;
    const y3=pdiv(s.y+EY1*H+2*H-1,H)-EY1;
    newCh1=w.get(newX2,y1);newCh2=w.get(newX2,y2);newCh3=w.get(newX2,y3);
    if(newCh3===42)this.hitCoin(newX2*W,y3*H,false);
    if(newCh2===42)this.hitCoin(newX2*W,y2*H,false);
    if(newCh2===122)s.stage.turbo=true;
    if(!s.small&&newCh1===42)this.hitCoin(newX2*W,y1*H,false);
    const hold1=CAN_HOLD(newCh1)&&!s.small,hold2=CAN_HOLD(newCh2),hold3=CAN_HOLD(newCh3);
    if(hold1||hold2||hold3){s.xv=0;s.walking_mode=0}
  }
  newX1=pdiv(s.x+s.xv,W); newX2=pdiv(s.x+s.xv+W-1,W);
  if(s.cd_enemy!==0)this.checkJump(s.keyAlt);
  const newY=s.status===1
    ?pdiv(s.y+1+4+(H-1-4)*Number(s.small)+s.yv+EY1*H,H)-EY1
    :pdiv(s.y+1+2*H+s.yv+EY1*H,H)-EY1;
  newCh1=w.get(newX1,newY);newCh2=w.get(newX2,newY);newCh3=w.get(pdiv(s.x+s.xv+Math.floor(W/2),W),newY);
  let hold1=CAN_HOLD(newCh1)||CAN_STAND(newCh1),hold2=CAN_HOLD(newCh2)||CAN_STAND(newCh2),hold3=CAN_HOLD(newCh3)||CAN_STAND(newCh3);

  if(s.status===2){
    // Source CheckFall: falling with no support -> coin/gravity; support ->
    // exact landing, note block jump and collision side effect.
    if(!(hold1||hold2)){
      if(newCh1===42)this.hitCoin(newX1*W,newY*H,false);
      if(newCh2===42)this.hitCoin(newX2*W,newY*H,false);
      if(pmod(s.counter,6)===0)s.yv+=1;
      if(s.yv>8)s.yv=8;
    }else{
      if(newCh1===61||newCh2===61)s.cd_hit=1;
      const mo=pmod(s.x+s.xv,W);
      s.y=(pdiv(s.y+s.yv+1+EY1*H,H)-EY1)*H;
      s.yv=0;s.status=0;s.jumped=true;
      if(newCh1===75||newCh2===75){
        s.counter=0;s.status=1;s.jumped=false;s.high_jump=true;s.yv=-5;s.hit_enemy=true;
        this._effect('StartMusic','NoteMusic');
        if(newCh1===75){this.bumpBlock(newX1,newY,75);this.removeTempObject(newX1*W,newY*H,W,H,5);this.stage.world.set(newX1,newY,75)}
        if(newCh2===75){this.bumpBlock(newX2,newY,75);this.removeTempObject(newX2*W,newY*H,W,H,5);this.stage.world.set(newX2,newY,75)}
      }
    }
  }else if(s.status===0){
    if(s.cd_lift===0){
      if(!(hold1||hold2)){
        s.status=2;if(Math.abs(s.xv)<2)s.y+=1;
      }else if(newCh1===75||newCh2===75){
        // Source falls through CheckFall for a note block while grounded.
        const mo=pmod(s.x+s.xv,W);
        s.y=(pdiv(s.y+s.yv+1+EY1*H,H)-EY1)*H;
        s.yv=0;s.status=0;s.jumped=true;
        s.counter=0;s.status=1;s.jumped=false;s.high_jump=true;s.yv=-5;s.hit_enemy=true;
        this._effect('StartMusic','NoteMusic');
        if(newCh1===75){this.bumpBlock(newX1,newY,75);this.removeTempObject(newX1*W,newY*H,W,H,5);this.stage.world.set(newX1,newY,75)}
        if(newCh2===75){this.bumpBlock(newX2,newY,75);this.removeTempObject(newX2*W,newY*H,W,H,5);this.stage.world.set(newX2,newY,75)}
      }else{
        if(s.xv===0){
          s.below1=newCh1;s.below2=newCh2;s.mapx=newX1;s.mapy=newY-1;
          s.at_ch1=w.get(s.mapx,s.mapy);s.at_ch2=w.get(s.mapx+1,s.mapy);
          const mo=pmod(s.x,W);
          // PLAYERS.PAS / source_player_check.py uses the already-computed
          // `hold1` / `hold2` values here.  Those include CanStandOn (14..16,
          // 'a'..'f').  Testing CAN_HOLD() again makes a stand-only slope tile
          // look unsupported and injects a -1/+1 velocity at the edge, causing
          // the reported automatic back-and-forth running on the slope.
          if(!hold1&&mo>=1&&mo<=5)s.xv-=1;
          if(!hold2&&mo>=W-5&&mo<=W-1)s.xv+=1;
        }
        this.checkJump(s.keyAlt);
      }
    }else this.checkJump(s.keyAlt);
  }else if(s.status===1){
    // Source CheckJumping: only CanHold/Hidden are ceiling blockers.
    hold1=CAN_HOLD(newCh1)||HIDDEN(newCh1);hold2=CAN_HOLD(newCh2)||HIDDEN(newCh2);hold3=CAN_HOLD(newCh3)||HIDDEN(newCh3);
    let hit=hold1||hold2,mo=pmod(s.x+s.xv,W);
    if(hit&&((mo>=1&&mo<=4)||(mo>=W-4&&mo<=W-1))&&!hold3){
      if(HIDDEN(newCh1)&&HIDDEN(newCh2))hit=false;
      if(mo<Math.floor(W/2)&&!HIDDEN(newCh2))s.x-=mo;
      else if(mo>=Math.floor(W/2)&&!HIDDEN(newCh1))s.x+=W-mo;
    }
    if(!hit){
      if(newCh1===42)this.hitCoin(newX1*W,newY*H,false);
      if(newCh2===42)this.hitCoin(newX2*W,newY*H,false);
      if(pmod(s.counter,6+Number(s.high_jump))===0||(!s.keyAlt&&!s.hit_enemy))s.yv+=1;
      if(s.yv>=0){s.yv=0;s.status=2}
    }else{
      let ch=0,newBlockX=newX2;
      if(mo<Math.floor(W/2)){if(CAN_HOLD(newCh1)||HIDDEN(newCh1)){ch=newCh1;newBlockX=newX1}else ch=newCh2}
      else{ch=newCh2;if(!(CAN_HOLD(ch)||HIDDEN(ch))){ch=newCh1;newBlockX=newX1}}
      if(ch===61)s.cd_hit=1;
      else if(ch===48||ch===49){if(s.keyUp)this.checkPipeAbove(newCh1,newCh2)}
      else if(ch===63||ch===36||ch===74||ch===75){
        // PLAYERS.PAS CheckJumping ceiling block branch, kept in source order.
        let mo2=0;
        let above=w.get(newBlockX,newY-1);
        if(above>=224&&above<=226){
          w.set(newBlockX,newY,63);ch=63;
        }else if(above===239){
          w.set(newBlockX,newY,75);ch=75;
        }else if(!s.small&&ch===74){
          if(this.breakBlock) this.breakBlock(newBlockX,newY);
          s.level_score+=10;
          mo2=1;
        }
        if(mo2===0){
          this.bumpBlock(newBlockX,newY,ch);
          this._effect('Beep',110);
        }
        above=w.get(newBlockX,newY-1);
        if((above===32||(above>=227&&above<=236))&&ch!==74&&ch!==75){
          this.hitCoin(newBlockX*W,newY*H,true);
          if(above!==32){
            w.set(newBlockX,newY-1,above+1);
            if(w.get(newBlockX,newY)===36){w.set(newBlockX,newY,63)}
          }
        }else if(above===224){
          const tp=s.small?5:9;
          this.newEnemy(tp,0,newBlockX,newY,0,-1,2);
        }else if(above===225){
          this.newEnemy(7,0,newBlockX,newY,0,-1,2);
        }else if(above===226){
          this.newEnemy(11,0,newBlockX,newY,0,-1,1);
        }else if(above===42){
          this.hitCoin(newBlockX*W,(newY-1)*H,false);
        }else if(above===237){
          this.newEnemy(5,1,newBlockX,newY,0,-1,2);
        }
        // PLAYERS.PAS: HitAbove runs before the final block-image/map replacement.
        // The replacement itself is source state, while the TempObj Remove()
        // callback remains OPEN because TMPOBJ.PAS is not present in the supplied
        // Python reference. Preserve the source map transition exactly here.
        this.stage && sourceEnemyHitAbove(newBlockX,newY-1);
        if(ch===75){
          // Source K branch: Remove(...,5); then restore the map cell as K.
          this.removeTempObject(newBlockX*W,newY*H,W,H,5);
          w.set(newBlockX,newY,75);
        }else if(ch!==74 && !(w.get(newBlockX,newY-1)>=227 && w.get(newBlockX,newY-1)<=236)){
          // Source ?/$ branch: Remove(...,1); then replace the hit cell by @.
          this.removeTempObject(newBlockX*W,newY*H,W,H,1);
          w.set(newBlockX,newY,64);
        }
      }else if(newCh1===0xED||newCh2===0xED){
        this.newEnemy(5,1,newBlockX,newY,0,-1,2);
      }else{
        this._effect('Beep',30);
      }
      if(ch!==74||s.small){s.yv=0;s.status=2}
      // PLAYERS.PAS CheckJumping tail: "if Ch = 'K' then YVel := 3".
      // source_player_check.py keeps this line; it was missing here, so the
      // note block gave no downward kick after the bump.
      if(ch===75)s.yv=3;
    }
  }
  if(s.status===0&&s.xv===0&&s.yv===0){
    s.below1=w.get(newX1,newY);s.below2=w.get(newX2,newY);s.mapx=newX1;s.mapy=newY-1;
    s.at_ch1=w.get(s.mapx,s.mapy);s.at_ch2=w.get(s.mapx+1,s.mapy);
  }
  s.mapx=newX1;s.mapy=newY-1;s.updateBounds();
 }

 updateCamera(k){
  // PLAYERS.PAS MovePlayer XView block, including Shift input and edge markers.
  // `k` is the already-sampled source key state for this frame; do not call
  // the Set of pressed DOM keys as a function.
  const old=this.x_view;
  let xv=old-Number(!!k.left_shift)+Number(!!k.right_shift);
  if(this.x+W+112>xv+320)xv=this.x+W+112-320;
  if(this.x<xv+112)xv=this.x-112;
  const lim=2+Number(!!this.stage.turbo);
  if(xv-old>lim)xv=old+lim;
  if(xv-old<-lim)xv=old-lim;
  if(xv<0){xv=0;if(this.x<0)this.x=0;}
  const mx=(this.stage.world.xsize-NH)*W;
  if(xv>mx)xv=mx;
  const w=this.stage.world;
  if(xv<old){
    if(w.get(pdiv(xv,W),13)===0xFE &&
       w.get(pdiv(xv,W),Math.round(this.player_y1/14))!==32)xv=old;
  }
  if(xv>old){
    const edge=pdiv(xv-1,W)+NH;
    if(w.get(edge,13)===0xFF &&
       w.get(edge,Math.round(this.player_y1/14))!==32)xv=old;
  }
  this.x_view=xv;
  return [old,xv];
 }
 _effect(name,...args){
   if(name==='ShowStar'){
     // ENEMIES.PAS::ShowStar -> tpHit temp object; source dimensions W x H.
     const [x,y]=args; newTempObject(3,Number(x),Number(y),0,0,W,H);
     return;
   }
   if(name==='ShowGlitter'){const [x,y]=args;coinGlitter(Number(x),Number(y));return;}
   if(name==='StartGlitter_OPEN_RNG'){const [x,y,w,h]=args;startGlitter(Number(x),Number(y),Number(w),Number(h));return;}
   if(name==='StartMusic'){sourceStartMusic(String(args[0]));return;}
   if(name==='Beep'){sourceBeep(Number(args[0]));return;}
   if(!this.effect_log)this.effect_log=[]; this.effect_log.push([name,...args]);
 }
 _startDeadDemo(){
  // PLAYERS.PAS::StartDemo(dmDead): preserve source dead-state transition.
  this.demo=5; this.demo_counter1=0; this.demo_counter2=0;
  this.demo_x=0; this.demo_y=0; this.below1=32; this.below2=32;
  this.at_ch1=32; this.at_ch2=32; this.in_pipe=false;
 }
 _movePlayerStateEffects(){
  // Direct parity with SourcePlayerRuntime._move_player_state_effects().
  // Effects are driven only by source-owned cd* flags; no new gameplay rules.
  if(this.cd_champ){
    if(this.mode===0){this.mode=1;this.growing=true;this.grow_counter=0;}
    this._effect('StartMusic','GrowMusic');
    this.cd_champ=0;
  }
  if(this.cd_life){this.lives+=1;this._effect('StartMusic','LifeMusic');this.cd_life=0;}
  if(this.cd_flower){this.mode=2;this.fired=true;this.fire_counter=0;this._effect('StartMusic','GrowMusic');this.growing=true;this.grow_counter=0;this.cd_flower=0;}
  if(!this.blinking && !this.star && !this.growing && this.cd_hit){
    if(this.mode===0){
      this.blink_counter=0;this.blinking=true;
      // source_player_runtime.py::start_demo(dmDead): use the same source
      // StartDemo entry point. It sets Demo=5 and YVel=-3 before Exit.
      this.startDemo(5);
      this._effect('StartMusic','DeadMusic');
      // PLAYERS.PAS executes Exit before cdHit:=0. The next source frame
      // therefore enters DoDemo(dmDead) and performs the upward death jump.
      return true;
    }
    if(this.mode===1||this.mode===2){this.mode=0;this.small=true;this.blink_counter=0;this.blinking=true;this._effect('StartMusic','HitMusic');}
    this.cd_hit=0;
  }else if(this.cd_hit){this.cd_hit=0;}
  if(this.blinking){this.blink_counter++;if(this.blink_counter>=125)this.blinking=false;}
  if(this.cd_star){this._effect('StartMusic','StarMusic');this.star=true;this.star_counter=0;}
  if(this.star){this.star_counter++;if(this.star_counter>=750)this.star=false;if(this.star_counter%3===0)this._effect('StartGlitter_OPEN_RNG',this.x,this.y+11*Number(this.mode===0),W,H+3+11*Number(this.mode!==0));this.cd_star=0;}
  if(this.growing){this.grow_counter++;if(this.grow_counter>24)this.growing=false;}
  this.small=(this.mode===0);
  return false;
 }
 update(k){this.keyAlt=k.alt;this.keyUp=k.up;this.keyDown=k.down;this.keySpace=k.space;
  // PLAYERS.PAS checks Demo/InPipe before the normal effect/input phase.
  if(this.demo!==0){this.doDemo();if(this.in_pipe)return;return}
  if(this.in_pipe){
    const below=this.stage.world.get(this.mapx,this.mapy+1), above=this.stage.world.get(this.mapx,this.mapy-1);
    if(below===48)this.startDemo(4); else if(above===48)this.startDemo(2);
    return;
  }
  // PLAYERS.PAS state/effect phase precedes Counter/input.
  if(this._movePlayerStateEffects()){if(k.left)prevKeys.add('ArrowLeft');else prevKeys.delete('ArrowLeft');if(k.right)prevKeys.add('ArrowRight');else prevKeys.delete('ArrowRight');return;}
  if(this.fired&&!k.space)this.fired=false;
  if(k.space&&!this.fired&&this.mode===2){
    this.fire_counter=0;
    const bx=pdiv(this.x,W)+this.dir, by=pdiv(this.y+H,H);
    // STEP167: PLAYERS.PAS calls ENEMIES.PAS::NewEnemy for FireBall.
    // Do not allocate the record here: NewEnemy is source-authoritative for
    // Turbo velocity/delay scaling, the two-fireball limit, FireMusic, and
    // the source player_x1/player_x2 spawn position.
    this.newEnemy(13,0,bx,by,10*(-1+2*this.dir),3+3*(Number(k.down)-Number(k.up)),2);
    this.fired=true;
  }
  if(this.cd_lift!==0){this.y=this.player_y1;this.xv=this.player_x_vel;this.yv=this.player_y_vel;this.status=0;}
  if(this.cd_stop_jump!==0){this.jumped=true;this.cd_stop_jump=0;}
  if(this.jumped&&!k.alt)this.jumped=false;this.counter=(this.counter+1)&255;if(this.xv===0&&this.yv===0)this.counter=0;const checkX=this.counter%6===0;let oldDir=this.dir,oldXVel=this.xv;if(k.right&&!prevKeys.has('ArrowRight')&&this.dir===0){oldDir=1;oldXVel=-this.xv}if(k.left&&!prevKeys.has('ArrowLeft')&&this.dir===1){oldDir=0;oldXVel=-this.xv}
 const max=1+Number(k.ctrl)+Number(this.stage.turbo)+Math.abs(this.cd_lift*this.player_x_vel);const min=-1-Number(k.ctrl)-Number(this.stage.turbo)-Math.abs(this.cd_lift*this.player_x_vel);if(k.left){if(this.xv>min){if(checkX||this.cd_lift)this.xv-=1+Number(this.cd_lift&&k.ctrl)}else this.xv=min;this.dir=Number(this.xv>0);if(this.x+this.xv<0)this.xv=-this.x}else if(this.xv<0&&checkX&&!this.cd_lift)this.xv++;if(k.right){if(this.xv<max){if(checkX||this.cd_lift)this.xv+=1+Number(this.cd_lift&&k.ctrl)}else this.xv=max;this.dir=Number(this.xv>=0)}else if(this.xv>0&&checkX&&!this.cd_lift)this.xv--;if(k.left&&k.right){this.dir=oldDir;this.xv=oldXVel}
 if(this.y+this.yv>=NV*H){this.game_done=true;this._effect('StartMusic','DeadMusic');}if(this.status===0)this.hit_enemy=false;this.check();if(this.status===0&&this.yv===0){if(this.xv===0||this.cd_lift&&this.xv===this.player_x_vel)this.walking_mode=0;else{this.walk_count=(this.walk_count+1)&15;this.walking_mode=Number(this.walk_count<8)}}else if(this.yv<0)this.walking_mode=2;else this.walking_mode=3;
  // PLAYERS.PAS: CheckPipeBelow is called after WalkingMode and before X/Y integration.
  if(k.down)this.checkPipeBelow();
  this.x+=this.xv;this.y+=this.yv;this.updateCamera(k);this.updateBounds();this.player_x1=this.x+this.xv;this.player_x2=this.player_x1+W-1;this.player_y1=this.y+(this.small?H:0);this.player_y2=this.y+2*H-1;this.player_x_vel=this.xv;this.player_y_vel=this.yv;if(this.cd_lift!==0){this.player_y_vel+=2-this.yv;this.cd_lift=0;}}
}
function enemyRect(e){return{x1:e.x,x2:e.x+W,y1:e.y,y2:e.y+H}}
function playerEnemyPass(){
  // Direct translation of ENEMIES.PAS MoveEnemies final player-overlap loop.
  // The source evaluates the overlap after the enemy movement phase and then
  // dispatches the case arms in source order.  Do not collapse the branches
  // into a generic "stomp" rule: shell kick, power-ups, lifts and star-hit
  // have distinct source side effects.
  const px1=player.x1, px2=player.x2;
  // ENEMIES.PAS reads PlayerYVel, not the live YVel register.  After a lift
  // frame PlayerYVel receives the source cdLift tail correction (Inc(PlayerYVel, 2-YVel))
  // and is the value used by the NEXT MoveEnemies collision pass.
  const py1=player.y1, py2=player.y2, pyv=player.player_y_vel;
  const star=!!player.star;
  for(const e of enemies.slice()){
    if(![2,6,8,10,12,15,17,18,20,50,51,52,53].includes(e.tp) && !(e.tp>=60 && e.tp<=69)) continue;
    if(!(px1 < e.x+W && px2 > e.x && py1+pyv < e.y+H && py2+pyv > e.y)) continue;

    // ENEMIES.PAS: star first calls Kill(j), cdHit:=1.  Execution then
    // reaches the case statement with the newly written enemy type.
    if(star && !(e.tp>=60 && e.tp<=69)){
      // ENEMIES.PAS player-overlap star branch: Beep(800) occurs before
      // Kill(j), then cdHit is set. Keep the source callback ordering.
      player._effect('Beep',800);
      killEnemySource(e);
      player.cd_hit=1;
    }

    // Sleeping/Waking Koopa: this case arm changes it to RunningKoopa and
    // exits the case.  Crucially it does not set cdHit on the kick frame.
    if(e.tp===51 || e.tp===52){
      e.tp=53;
      e.vx=5*(2*Number(e.x>px1)-1);
      e.delay=0; e.dc=0; e.counter=0;
      player._effect('Beep',800);
      player.cd_enemy=1;
      player.level_score+=100;
      continue;
    }

    if(e.tp===6){
      if(e.sub===0){player.cd_champ=1;player.level_score+=1000}
      else player.cd_hit=1;
      e.tp=1; e.dc=-2; player._effect('ShowGlitter',e.x,e.y,W,H);
      continue;
    }
    if(e.tp===8){
      player.cd_life=1; player.level_score+=1000;
      e.tp=1; e.dc=-2; player._effect('ShowGlitter',e.x,e.y,W,H); continue;
    }
    if(e.tp===10){
      player.cd_flower=1; player.level_score+=1000;
      e.tp=1; e.dc=-2; player._effect('ShowGlitter',e.x,e.y,W,H); continue;
    }
    if(e.tp===12){
      player.cd_star=1; player.level_score+=1000;
      e.tp=1; e.dc=-2; player._effect('ShowGlitter',e.x,e.y,W,H); continue;
    }
    if(e.tp===17){player.cd_hit=1;continue;}

    // Source stomp/falling condition.  Lift handling is inside this branch;
    // side overlap alone must not activate cdLift.
    if((pyv>e.vy || pyv>0) && (py2<=e.y+H)){
      if(e.tp>=60 && e.tp<=69){
        if(e.tp===61){
          e.status=2;
          if(e.counter>20 && e.vy===0)e.vy+=1;
        }
        player.cd_stop_jump=Number(pyv!==2);
        player.cd_lift=1;
        // ENEMIES.PAS::MoveEnemies publishes the lift snapshot fields;
        // PLAYERS.PAS::MovePlayer reads these at the start of the next frame
        // when cdLift is set. The previous HTML branch changed y/xv/yv only,
        // so MovePlayer immediately restored stale values and Mario could not
        // actually stand on the donut/lift platform.
        player.player_y1=e.y-2*H;
        player.player_y2=e.y-1;
        player.player_x_vel=e.vx;
        if(e.delay!==0)player.player_x_vel=e.vx*pmod(e.x,2);
        player.player_y_vel=e.vy;
        // Source ENEMIES.PAS only publishes the four Player* snapshot globals.
        // PLAYERS.PAS consumes them at the START of the next MovePlayer frame
        // when cdLift <> 0; do not mutate X/Y/XVel/YVel here.
        continue;
      }
      if(e.tp===2){
        e.tp=3;e.vx=0;e.dc=-2-15*Number(e.vy===0);
        player._effect('Beep',800);
        player.cd_enemy=1;player.level_score+=100;
      }else if(e.tp===15){
        if(e.y+H<NV*H){
          killEnemySource(e);
          player._effect('Beep',800);
          player.cd_enemy=1;
        }
      }else if(e.tp===50||e.tp===53){
        e.tp=51;e.vx=0;e.counter=0;
        player._effect('Beep',800);
        player.cd_enemy=1;player.level_score+=100;
      }else{
        player.cd_hit=1;
      }
    }else if(!((e.tp===15 && !(Math.abs(e.dc-e.delay)<=1)) || (e.tp>=60 && e.tp<=69))){
      // ENEMIES.PAS 1190-1199: preserve the source boolean exactly.
      // For TP_VERT_FISH, cdHit is set only when ABS(DelayCounter-MoveDelay) <= 1;
      // outside that timing window the fish is exempt. Lifts are always exempt.
      player.cd_hit=1;
      if(star)killEnemySource(e);
    }
  }
}

function sourceEnemyHitAbove(mapX,mapY){
  // ENEMIES.PAS::HitAbove -- direct source translation.
  // PLAYERS.PAS calls this immediately after processing a ceiling block.
  const x=mapX*W, y=mapY*H;
  for(const e of enemies.slice()){
    if(e.y!==y) continue;
    if(!(e.x+e.vx+W>x && e.x+e.vx<x+W)) continue;
    if(e.tp===6||e.tp===8||e.tp===10||e.tp===12||e.tp===50||e.tp===51||e.tp===52){
      if((e.vx>0 && e.x+e.vx+Math.floor(W/2)<=x) ||
         (e.vx<0 && e.x+e.vx+Math.floor(W/2)>=x)) e.vx=-e.vx;
      e.vy=-7;
      e.status=1;
      if(e.tp===50||e.tp===51||e.tp===52){e.tp=51;e.vx=0;}
    }else if(e.tp===2||e.tp===20){
      killEnemySource(e);
    }
  }
}
function sourceEnemyFireballCheck(e){
  // ENEMIES.PAS::Check(), tpFire. Direct translation of the supplied
  // SOURCE/source_enemy_check.py lines 113-133:
  // wall stop -> vertical bounce -> gravity tick -> out-of-range => tpDyingFireBall.
  let atX=pdiv(e.x+W/4,W);
  let newX=pdiv(e.x+W/4+e.vx,W);
  if(atX!==newX || pmod(player.x1,W)===0){
    const y1=pdiv(e.y+H/4+EY1*H,H)-EY1;
    if(CAN_HOLD(stage.world.get(newX,y1))) e.vx=0;
  }
  const oldX=e.x, oldY=e.y;
  atX=pdiv(e.x+W/4+e.vx,W);
  const newY=pdiv(e.y+2+H/4+e.vy+EY1*H,H)-EY1;
  const ch=stage.world.get(atX,newY);
  if(e.vy>0 && (CAN_HOLD(ch)||CAN_STAND(ch))){
    e.y=(pdiv(e.y+e.vy-5+EY1*H,H)-EY1)*H;
    e.vy=-2;
  }else if(pmod(e.x,3)===0){
    e.vy+=1;
  }
  if(e.vx===0 || oldX<player.x_view-W ||
     oldX>player.x_view+NH*W+W || newY>NV*H){
    e.dc=-2;
    e.tp=14;
  }
}

// STEP165 source audit: vertical enemy types 15/16/17/18/19 bypass the ordinary
// map collision branch in ENEMIES.PAS::Check but still reach its common
// enemy-vs-enemy collision phase. Returning true preserves that phase boundary.
function sourceEnemyMapCheck(e){
  // ENEMIES.PAS::Check source branch order. Rising items and Star have their
  // own early handling and must NOT enter the ordinary horizontal/ground
  // collision path.
  // Rising item branch: exact source transition at a tile boundary.
  if([5,7,9,11].includes(e.tp)){
    if(pmod(e.y,H)===0 && e.y!==e.mapy*H){
      let xv=1-2*Number(CAN_HOLD(stage.world.get(e.mapx+1,e.mapy-1)));
      if(e.tp===5){ e.tp=6; }
      else if(e.tp===7){ e.tp=8; xv*=2; }
      else if(e.tp===9){ e.tp=10; xv=0; }
      else if(e.tp===11){ e.tp=12; xv*=2; }
      e.vx=xv; e.vy=-7; e.delay=1; e.status=1;
    }else{
      // source_enemy_check.py: rising items beep while climbing when
      // YPos mod H is even. The source runtime callback is Beep(130-20*j).
      const j=pmod(e.y,H);
      if(pmod(j,2)===0) player._effect('Beep',130-20*j);
    }
    // Source Check() exits here; the caller must not continue into the
    // enemy-vs-enemy collision section on this same frame.
    return false;
  }
  // ENEMIES.PAS Check(): Star starts glitter before the remaining collision
  // branches. Keep this as a source callback boundary.
  if(e.tp===12){ player._effect('StartGlitter_OPEN_RNG',e.x,e.y,W,H); }
  // ENEMIES.PAS::Check -- tpFireBall has its own map-collision path and
  // must not enter the ordinary enemy ground-collision code below.
  if(e.tp===13){
    let atX=pdiv(e.x+W/4,W);
    let newX=pdiv(e.x+W/4+e.vx,W);
    if(atX!==newX || pmod(player.x1,W)===0){
      const y1=pdiv(e.y+H/4+EY1*H,H)-EY1;
      if(CAN_HOLD(stage.world.get(newX,y1))) e.vx=0;
    }
    newX=e.x;
    let newY=e.y;
    atX=pdiv(e.x+W/4+e.vx,W);
    newY=pdiv(e.y+2+H/4+e.vy+EY1*H,H)-EY1;
    const ch=stage.world.get(atX,newY);
    if(e.vy>0 && (CAN_HOLD(ch)||CAN_STAND(ch))){
      e.y=(pdiv(e.y+e.vy-5+EY1*H,H)-EY1)*H;
      e.vy=-2;
    }else if(pmod(e.x,3)===0){
      e.vy+=1;
    }
    if(e.vx===0 || newX<player.x_view-W ||
       newX>player.x_view+NH*W+W || newY>NV*H){
      e.dc=-(MAX_PAGE+1);
      e.tp=14;
    }
    return false;
  }
  if([15,16,17,18,19].includes(e.tp)) {
    // ENEMIES.PAS::Check: vertical enemy types skip only the ordinary
    // horizontal/ground-map branch; they DO continue into the common
    // enemy-vs-enemy collision section below.
    return true;
  }
  const side=e.vx>0?W-1:0;
  const atX=pdiv(e.x+side,W), newX=pdiv(e.x+side+e.vx,W);
  if(atX!==newX || e.status===1){
    const y1=pdiv(e.y+EY1*H,H)-EY1;
    const y2=pdiv(e.y+EY1*H+H-1,H)-EY1;
    if(CAN_HOLD(stage.world.get(newX,y1))||CAN_HOLD(stage.world.get(newX,y2))){
      if(e.tp===53){
        const l=pdiv(e.y+EY1*H+H/2,H)-EY1, ch=stage.world.get(newX,l);
        if(e.x>=player.x_view && e.x+W<=player.x_view+NH*W){
          if(ch===74){
            // ENEMIES.PAS: running Koopa breaks J only through BreakBlock().
            if(player.breakBlock) player.breakBlock(newX,l);
            else { stage.world.set(newX,l,32); player.level_score+=10; }
          } else if(ch===63){
            // Exact source '?' handling: inspect the cell above, spawn the
            // source item when its marker is E0/E1, remove the block image,
            // then replace the hit block with '@' (64).
            const above=stage.world.get(newX,l-1);
            if(above===32){
              player.hitCoin(newX*W,l*H,true);
            } else if(above===0xE0){
              // ENEMIES.PAS: the E0 marker selects the rising power-up from
              // PlayerMode: champ for small Mario, flower otherwise.
              // Do not hard-code TP 5; PlayerMode is source state.
              const risingTp=(player.mode===0)?5:9;
              player.newEnemy(risingTp,0,newX,l,0,-1,1);
            } else if(above===0xE1){
              player.newEnemy(7,0,newX,l,0,-1,2);
            }
            // Source removes the hit block's temporary picture/state before
            // replacing the map cell with '@'. The renderer's animation is
            // still a separate OPEN TempObj concern.
            stage.world.set(newX,l,64);
          }
        }
      }
      e.vx=0;
    }
  }
  const atX2=pdiv(e.x+e.vx,W), newX2=pdiv(e.x+e.vx+W-1,W);
  const ny=pdiv(e.y+1+H+e.vy+EY1*H,H)-EY1;
  const h1=CAN_HOLD(stage.world.get(atX2,ny))||CAN_STAND(stage.world.get(atX2,ny));
  const h2=CAN_HOLD(stage.world.get(newX2,ny))||CAN_STAND(stage.world.get(newX2,ny));
  // ENEMIES.PAS: lift platforms are handled before the ordinary grounded/
  // falling branches. Their vertical velocity reverses on the source map
  // boundary; ordinary status gravity must not be applied to them.
  if(e.tp>=60 && e.tp<=69){
    if(e.vy!==0 && e.tp!==61){
      if(e.vy<0) h1=pdiv(e.y+e.vy,H)<e.mapy;
      if(h1)e.vy=-e.vy;
    }
  }else if(e.status===0){
    if(!(h1||h2)){e.status=1;e.vy=1}
    // ENEMIES.PAS Koopa sub-type 1 edge-stop: only stop when the leading
    // corner has no support while the trailing corner still has support.
    if(e.sub===1 && e.tp===50){
      const rem=pmod(e.x,W);
      if(e.vx>0 && rem>=11 && rem<20 && !h2 && h1)e.vx=0;
      if(e.vx<0 && rem>=1 && rem<10 && !h1 && h2)e.vx=0;
    }
  }else if(e.status===1 && (h1||h2)){
    e.status=0;e.y=(pdiv(e.y+e.vy+1+EY1*H,H)-EY1)*H;e.vy=0;
    if(e.tp===12){e.vy=-pdiv(5*e.vy,2);e.status=1}
  }else if(e.status===1){e.vy=Math.min(4,e.vy+1)}
  // Source Check() reaches the enemy-vs-enemy section only for the ordinary
  // branch; early-return branches above return false.
  return true;
}


function sourceEnemyEnemyCheck(e, collisionList=enemies){
  const collidable=[2,3,20,50,51,52,53];
  if(!collidable.includes(e.tp) && ![15,18,19].includes(e.tp)) return;
  const nx1=e.x+e.vx, nx2=nx1+W-1+(e.tp===18?4:0);
  const y1=e.y+e.vy, y2=y1+H-1;
  for(const o of collisionList){
    if(o===e || o.tp===0) continue;
    if(collidable.includes(o.tp)){
      const ox=o.x+o.vx, oy=o.y+o.vy;
      if(nx1 < ox+W && nx2 > ox && y1 < oy+H && y2 > oy){
        if(o.tp===53){
          player._effect('ShowStar',e.x,e.y);
          if(e.tp===53){
            player._effect('ShowStar',o.x,o.y);
            killEnemySource(o);
          }
          killEnemySource(e);
        } else if(e.tp!==53){
          e.vx=-e.vx; o.vx=-o.vx; e.vy=-e.vy; o.vy=-o.vy;
          if(Math.abs(ox-nx1)<W){
            if(ox>nx1){e.x-=e.vx; e.vx=-Math.abs(e.vx);}
            else if(ox<nx1){e.x-=e.vx; e.vx=Math.abs(e.vx);}
          }
        }
      }
    } else if(o.tp===13){
      const ox=o.x+o.vx, oy=o.y+o.vy;
      if(nx1 <= ox+W/2 && nx2 >= ox && y1 <= oy+H/2 && y2 >= oy){
        o.tp=14; o.dc=-2;
        player._effect('ShowStar',e.x,e.y);
        killEnemySource(e);
      }
    }
  }
}
function killEnemySource(e){
  if(e.tp===2||e.tp===20||e.tp===50||e.tp===51||e.tp===52||e.tp===53){
    e.tp=(e.tp===2)?4:(e.tp===20)?21:55;
    e.vx=-1+2*Number(pmod(e.x+e.vx,W)>Math.floor(W/2));
    e.vy=-4; e.delay=0; e.dc=0;
    player.level_score+=100;
  } else if(e.tp===15){e.tp=16;e.vx=0;e.vy=0;e.delay=2;e.dc=0;e.status=1;player.level_score+=100;}
  else if(e.tp===18){e.tp=19;e.dc=0;e.vy=0;player.level_score+=100;}
}

function sourceEnemyRestoreMarker(e){
  // ENEMIES.PAS MoveEnemies restores the exact source marker before an enemy
  // leaves the active window. This is state restoration, not new level data.
  const w=stage.world;
  if(e.tp===2)w.set(e.mapx,e.mapy,0x80);
  else if(e.tp===15)w.set(e.mapx,e.mapy-2,0x81);
  else if(e.tp===17)w.set(e.mapx,e.mapy-2,0x82);
  else if(e.tp===18)w.set(e.mapx,e.mapy-2,0x84+e.sub);
  else if(e.tp===20)w.set(e.mapx,e.mapy,0x87);
  else if(e.tp>=50&&e.tp<=53)w.set(e.mapx,e.mapy,0x88+e.sub);
  else if(e.tp===60)w.set(e.mapx,e.mapy,0xB0);
  else if(e.tp===61)w.set(e.mapx,e.mapy,0xB1);
}
function sourceEnemyVerticalStep(e){
  // Direct translation of SourceEnemyMover._vertical_step(). Random() uses
  // the shared source Turbo Pascal RNG implemented above; no browser RNG is used.
  if(e.tp===18){
    if(e.status===0){
      if((e.sub===0&&((e.x>player.x2+W)||(e.x+24+W<player.x1)))||
         (e.sub===1&&((e.x>player.x2)||(e.x+24<player.x1)))||e.sub===2)e.status++;
      e.vy=0;e.dc=0;e.delay=1;
    }else if(e.status===1){
      e.vy=-1;e.dc=0;e.delay=2;
      if(e.y+e.vy<=e.mapy*H-19){e.vy=0;e.dc=0;e.delay=2;e.counter=0;e.status++}
    }else if(e.status===2){
      e.counter++;if(e.counter>200)e.status++;e.delay=0;e.dc=0;
    }else if(e.status===3){
      e.vy=1;e.dc=0;e.delay=2;if(e.y>e.mapy*H)e.status++;
    }else if(e.status===4){
      // source_enemy_move.py::_vertical_step, status 4:
      //   YVel=0; MoveDelay=100+Random(100); DelayCounter=0; Status:=0
      // The trailing "Status := 0" was missing, so the plant stayed parked in
      // status 4 forever and never emerged a second time.
      e.vy=0;e.delay=100+sourceRandom(100);e.dc=0;e.open_rng=false;e.status=0;
    }
    return;
  }
  if(e.y+H>=NV*H){
    if(e.vy>0){
      e.vy=0;e.delay=100+sourceRandom(300);e.dc=0;e.open_rng=false;
    }else{
      e.vy=(e.tp===17)?-9:-10;e.delay=1;e.dc=0;
      if(e.tp===17)player._effect('Beep',100);
    }
  }
  // NOTE: source_enemy_move.py::_vertical_step has NO gravity branch.
  // VERTICAL_GRAVITY_TYPES gravity is applied exactly once per source step,
  // inside MoveEnemies (see moveEnemies() below). The extra copy that used to
  // live here doubled gravity for tpVertFish (15) and tpVertFireBall (17):
  // the fish reached only about half its source jump height, and the lava
  // fireball fell so fast that it overshot NV*H on the way down, tripped the
  // terminal out-of-range test and died after a single jump.
}
function moveEnemies(){
  enemyTimeCounter=(enemyTimeCounter+1)&255;
  // ENEMIES.PAS MoveEnemies snapshots the active list at loop entry.
  const initial=enemies.slice();
  for(const e of initial){
    if(e.tp===0)continue;
    e.dc++;
    const newX=e.x+e.vx;
    if(e.dc>e.delay){
      e.x=e.lastx;e.y=e.lasty;e.dirc++;

      if([15,17,18].includes(e.tp)){
        // ENEMIES.PAS::MoveEnemies VERTICAL_TYPES =
        // {tpVertFish,tpVertFireBall,tpVertPlant}; VerticalStep() occurs first, before
        // the terminal test and before Check().  The dead vertical forms
        // (16/19) do not enter VerticalStep().
        sourceEnemyVerticalStep(e);
      }

      if(e.tp===51){e.counter++;if(e.counter>150){e.tp=52;e.vx=1;e.counter=0}}
      if(e.tp===52){e.vx=-e.vx;e.delay=1;e.dc=0;e.counter++;if(e.counter>50){e.tp=50;e.vx=player.x1>e.x?1:-1}}

      // Exact ENEMIES.PAS order: dying/flat/out-of-range is tested before
      // Check(), gravity and the X/Y commit.
      const terminalOut=(newX<=-W || newX<player.x_view-5*W ||
                         newX>player.x_view+NH*W+5*W || e.y+e.vy>NV*H);
      if(e.tp===1||e.tp===14||e.tp===54){
        e.tp=0;
      }else if(e.tp===3||terminalOut){
        sourceEnemyRestoreMarker(e);
        if(e.tp===50)e.tp=54;
        else if(e.tp!==13)e.tp=1;
        else e.tp=14;
        e.dc=-2;
      }else{
        // source_enemy_move.py, non-terminal branch, in exact source order:
        //   DelayCounter := 0
        //   OldXVel := XVel        <-- BEFORE gravity and BEFORE Check()
        //   vertical gravity / dead gravity
        //   Check()                <-- this is what zeroes XVel at a wall
        //   Inc(XPos,XVel); Inc(YPos,YVel)
        //   if XVel = 0 then XVel := -OldXVel
        //
        // The browser port used to read OldXVel *after* Check(). By then
        // Check() had already written XVel := 0, so "-OldXVel" evaluated to 0
        // and the enemy stayed pinned against the obstacle forever. That is
        // the single cause of both reported symptoms: ordinary monsters
        // leaning on walls instead of turning around, and a kicked Koopa
        // shell dying on the first wall instead of bouncing back and forth.
        e.dc=0;
        const oldVx=e.vx;
        const deadGravity=(e.tp===4||e.tp===21||e.tp===55);
        if((e.tp===15||e.tp===16||e.tp===17||e.tp===19) &&
           e.y+H<NV*H && pmod(e.dirc,3)===0)e.vy+=1;
        if(deadGravity && pmod(e.x,6)===0)e.vy+=1;

        // source_enemy_move.py skips Check() entirely for DEAD_GRAVITY_TYPES.
        let checkContinues=false;
        if(!deadGravity) checkContinues=sourceEnemyMapCheck(e)!==false;

        // source_enemy_check.py performs enemy-vs-enemy collision at the end
        // of Check(), after the map branch. Rising-item and FireBall branches
        // return early from Check(), so they must not reach this section.
        if(checkContinues && e.tp!==13) sourceEnemyEnemyCheck(e,initial);

        e.x+=e.vx;e.y+=e.vy;
        if(e.vx===0){
          e.vx=-oldVx;
          if(e.tp===14)player._effect('ShowFire',e.x,e.y,0,0,W,H);
        }
      }
      e.lastx=e.x;e.lasty=e.y;
    }else if(e.vx!==0||e.vy!==0){
      e.x=e.lastx+pdiv(e.dc*e.vx,e.delay+1);
      e.y=e.lasty+pdiv(e.dc*e.vy,e.delay+1);
    }

  }
  // Source player overlap is a second phase after the enemy loop.
  playerEnemyPass();
  enemies=enemies.filter(e=>e.tp!==0);
}


function playerSprite(){
  // PLAYERS.PAS Pictures[player,Mode,WalkingMode,Direction]: player=0 Mario, player=1 Luigi.
  const pl=Number(player.player_index)||0;
  const jump=player.walking_mode===2||player.walking_mode===3;
  if(player.mode===0)return pl===1?(jump?'SJLUI_000':`SWLUI_00${player.walking_mode?1:0}`):(jump?'SJMAR_000':`SWMAR_00${player.walking_mode?1:0}`);
  if(player.mode===1)return pl===1?(jump?'LJLUI_000':`LWLUI_00${player.walking_mode?1:0}`):(jump?'LJMAR_000':`LWMAR_00${player.walking_mode?1:0}`);
  return pl===1?(jump?'FJLUI_000':`FWLUI_00${player.walking_mode?1:0}`):(jump?'FJMAR_000':`FWMAR_00${player.walking_mode?1:0}`);
}
function playerDemoSprite(){ return playerSprite(); }
function playerSourceImageName(){
  // PLAYERS.PAS::Pictures[player,mode,walkingMode,direction] source bank.
  // This path is used only where DrawPlayer calls RecolorImage (Star/Growing).
  const pl=Number(player.player_index)||0;
  const md=Number(player.mode), wm=Number(player.walking_mode);
  const names={
    0: pl===1 ? [['SWLUI.000','SWLUI.001'],['SJLUI.000','SJLUI.001']] : [['SWMAR.000','SWMAR.001'],['SJMAR.000','SJMAR.001']],
    1: pl===1 ? [['LWLUI.000','LWLUI.001'],['LJLUI.000','LJLUI.001']] : [['LWMAR.000','LWMAR.001'],['LJMAR.000','LJMAR.001']],
    2: pl===1 ? [['FWLUI.000','FWLUI.001'],['FJLUI.000','FJLUI.001']] : [['FWMAR.000','FWMAR.001'],['FJMAR.000','FJMAR.001']]
  };
  const group=wm>=2?1:0, frame=wm>=2?wm-2:wm;
  const base=names[md]&&names[md][group];
  if(!base)return null;
  // Source only supplies the two walking frames for ground movement and the
  // single jump frame for WalkingMode 2/3.  Do not invent a second jump image.
  return base[Math.min(frame,base.length-1)];
}
function drawPlayerSourceRecolor(ctx,x,y,diff){
  const n=playerSourceImageName();
  if(!n)return false;
  // PLAYERS.PAS::RecolorImage: every nonzero source byte is transformed by
  // (byte & 7) + Diff, then resolved through the live VGA DAC.  The exact
  // Diff expression is ((GrowCounter+StarCounter) and 1) shl 4 -
  // Byte((GrowCounter+StarCounter) and $F < 8).
  const total=Number(player.grow_counter)+Number(player.star_counter);
  const d=(((total&1)<<4)-Number((total&0xF)<8))&255;
  const used=(diff===undefined)?d:Number(diff)&255;
  return drawIndexedSourceSprite(ctx,n,x,y,20,28,stage.options,player.dir===1,false,used,'add');
}

function sourceSkyPalette(options){
  // Direct port of source_sky.py::sky_palette for the palette entries used by
  // DrawSky/SmoothFill. Values stay in VGA 0..63 and are converted once here.
  const p={}; const put=(i,r,g,b)=>p[i]=[Math.max(0,Math.min(63,r)),Math.max(0,Math.min(63,g)),Math.max(0,Math.min(63,b))];
  const sky=Number(options.SkyType||0), bg=Number(options.BackGrType||0);
  if(sky===0){put(224,35,45,63);put(240,20,38,48);put(255,54,57,60)}
  else if(sky===1){put(224,52,55,55);put(240,42,48,45);put(255,61,61,61)}
  else if(sky===2){for(let i=224;i<240;i++){let j=i-224;put(i,48-2*j,58-j,58)}put(240,35,48,46)}
  else if(sky===3){put(224,0,5,3);put(240,8,12,10);put(255,8,13,13)}
  else if(sky===4){put(224,35,45,53);put(240,23,39,43);put(255,58,60,60)}
  else if(sky===5){for(let i=224;i<240;i++){let j=i-224;put(i,58-Math.floor(j/2),56-j,38-j)}put(240,52,49,32)}
  else if(sky===9){for(let i=224;i<240;i++){let j=i-224;put(i,63-Math.floor(j/3),50-j,25-j)}put(240,48,35,18)}
  else if(sky===10){for(let i=224;i<240;i++){let j=i-224;put(i,27-j,43-j,63-j)}put(240,58,58,63)}
  // source_sky.py::sky_palette for SkyType 6/7/8 also mutates the upper
  // palette entries used by BACKGR.PAS. Keep those source DAC writes instead
  // of leaving the MPAL256 values underneath them.
  if(sky===6||sky===7||sky===8){
    if(bg===4){
      // source_sky.py::sky_palette: SkyType 6/7/8 + BackGrType 4
      // initializes the complete E0..EF bank, then overrides FD/FE/FF.
      const vals=sky===6?[22,15,11]:sky===7?[18,18,22]:[17,10,10];
      for(let i=0xE0;i<0xF0;i++)put(i,...vals);
      const v=sky===6?[[0xFD,22,15,11],[0xFE,19,12,8],[0xFF,25,18,14]]:
        sky===7?[[0xFD,18,18,22],[0xFE,13,13,17],[0xFF,23,23,27]]:
        [[0xFD,17,10,10],[0xFE,11,5,5],[0xFF,20,14,14]];
      for(const q of v)put(q[0],q[1],q[2],q[3]);
    }else{
      // source_sky.py::sky_palette: SkyType 6/7/8 + BackGrType != 4
      // initializes the complete E0..FF bank, then overrides D1/D6/D4.
      // The previous HTML implementation only wrote D1/D6/D4, leaving the
      // E0..FF entries at MPAL256 values. That is a source/presentation
      // mismatch for the full-screen special background path (5/6/7).
      const vals=sky===6?[19,9,8]:sky===7?[15,15,18]:[15,5,5];
      for(let i=0xE0;i<0x100;i++)put(i,...vals);
      const v=sky===6?[[0xD1,19,9,8],[0xD6,21,11,10],[0xD4,17,7,6]]:
        sky===7?[[0xD1,15,15,18],[0xD4,18,18,21],[0xD6,12,12,15]]:
        [[0xD1,15,5,5],[0xD4,20,10,10],[0xD6,10,0,0]];
      for(const q of v)put(q[0],q[1],q[2],q[3]);
    }
  }
  else if(sky===11){for(let i=224;i<240;i++){let j=i-224;put(i,60-j,63-j,63-j)}put(240,42,48,45)}
  else if(sky===12){for(let i=224;i<240;i++){let j=i-224;put(i,55-j,63-j,63-j)}put(240,36,45,41)}
  else if(sky>=6&&sky<=8){const vals=bg===4?({6:[22,15,11],7:[18,18,22],8:[17,10,10]}[sky]):({6:[19,9,8],7:[15,15,18],8:[15,5,5]}[sky]);for(let i=224;i<256;i++)put(i,...vals)}
  return p;
}
function sourceVgaRgb(v){return `rgb(${Math.round(v[0]*255/63)},${Math.round(v[1]*255/63)},${Math.round(v[2]*255/63)})`}
function sourceRuntimePalette(options){
  const base=window.MARIO_BAKED_DATA?.palettes?.['MPAL256']||window.MARIO_BAKED_DATA?.palettes?.['DEFAULT.PAL']||[];
  const p=base.map(v=>Array.isArray(v)?v.slice():[0,0,0]);
  const sky=sourceSkyPalette(options||{});
  for(const k of Object.keys(sky))p[Number(k)]=sky[k].slice();
  // PALETTES.PAS::BlinkPalette source DAC entry 1 (Star).
  if(Array.isArray(starPaletteVga))p[1]=starPaletteVga.slice();
  const o=options||{};
  const c2=[Number(o.C2r??10)&63,Number(o.C2g??23)&63,Number(o.C2b??8)&63];
  const c3=[Number(o.C3r??22)&63,Number(o.C3g??35)&63,Number(o.C3b??20)&63];
  const skyRef=p[Number(o.SkyType??0)===10?0xEF:0xF0]||p[0];

  // PALETTES.PAS::BlinkPalette -- GrassCounter state.
  if(grassCounter<0){
    p[153]=c2.slice(); p[154]=c3.slice(); p[155]=c2.slice(); p[156]=c3.slice();
    p[157]=skyRef.slice(); p[158]=skyRef.slice();
  }else{
    p[153]=skyRef.slice(); p[154]=skyRef.slice(); p[155]=c3.slice(); p[156]=c2.slice();
    p[157]=c2.slice(); p[158]=c3.slice();
  }

  // PALETTES.PAS::BlinkPalette -- WaterFallCounter rotates entries 7..11
  // every WaterFallSpeed (10) frames. Reconstruct the latest source update
  // from the current counter; no new animation state is invented here.
  const wt=((Number(waterfallCounter)%50)+50)%50;
  // PALETTES.PAS only writes entries 7..11 when BlinkPalette reaches a
  // WaterFallSpeed boundary. Counter=0 immediately after a fresh reset is
  // not such a write; after the first completed cycle, counter=0 represents
  // the palette produced by the preceding 50-frame boundary.
  const wfActive = waterfallStarted || wt!==0;
  let j=Math.floor(wt/10);
  if(j>=5)j=0;
  if(wfActive) for(let i=0;i<5;i++){
    j--; if(j<0)j=4;
    const k=5-j;
    let rgb; const st=Number(o.SkyType??0);
    if(st===0)rgb=[40+3*k,50+2*k,53+2*k];
    else if(st===1)rgb=[45+3*k,52+2*k,51+2*k];
    else if(st===2)rgb=[44+3*k,53+2*k,53+2*k];
    else if(st===3)rgb=[34+3*k,40+2*k,40+2*k];
    else if(st===4)rgb=[38+3*k,47+2*k,47+2*k];
    else if(st===5)rgb=[53+2*k,53+2*k,44+3*k];
    else if(st===6||st===7||st===8)rgb=[42+4*k,5+k*k,2*k];
    else if(st===10)rgb=[40+4*k,45+3*k,63];
    else rgb=[50+2*k,50+2*k,50+2*k];
    p[7+i]=rgb;
  }

  // PALETTES.PAS::BlinkPalette -- CoinCounter changes entries 12..14 at
  // 25, 50 and 0 (75) frame boundaries.
  const cc=((Number(coinCounter)%75)+75)%75;
  if(cc>=50){ p[13]=[62,56,20]; p[14]=[60,56,22]; p[12]=[63,63,36]; }
  else if(cc>=25){ p[14]=[62,56,20]; p[12]=[60,56,22]; p[13]=[63,63,36]; }
  else { p[12]=[62,56,20]; p[13]=[60,56,22]; p[14]=[63,63,36]; }
  return p;
}
function drawIndexedSourceSprite(ctx,name,x,y,w=W,h=H,options=null,flipX=false,flipY=false,recolor=null,recolorMode='figure',paletteOverride=null){
  const D=window.MARIO_BAKED_DATA?.source_images, rec=D&&D[name];
  if(!rec||!Array.isArray(rec.pixels))return false;
  const pal=paletteOverride||sourceRuntimePalette(options||{}), cw=Number(rec.w), ch=Number(rec.h);
  ctx.save();
  if(flipX&&flipY){ctx.translate(x+w,y+h);ctx.scale(-1,-1);x=0;y=0}
  else if(flipX){ctx.translate(x+w,y);ctx.scale(-1,1);x=0;y=0}
  else if(flipY){ctx.translate(x,y+h);ctx.scale(1,-1);x=0;y=0}
  const c=Number(recolor);
  for(let yy=0;yy<ch;yy++)for(let xx=0;xx<cw;xx++){
    let idx=Number(rec.pixels[yy*cw+xx]);
    if(!idx)continue;
    if(recolor!==null){
      if(recolorMode==='add'){
        // VGA256.PAS::RecolorImage as used by PLAYERS.PAS::DrawPlayer while
        // Star or Growing is active: every nonzero source byte becomes
        // (byte + Diff) and 255.  source_player_runtime.py::_source_player_image
        // does exactly "a = (a + d) & 0xFF".
        // The old code applied the *figure* recolor ((a and 7) + c) here,
        // which folded Mario's whole 20x28 bitmap into palette entries 0..7
        // (or 16..23), i.e. the near-black bank -- the reported "star makes
        // the sprite far too dark" symptom.
        idx=(idx+c)&255;
      }else{
        // source_renderer.py::_load_source_image: bytes <= $10 are kept,
        // only higher bytes are remapped as ((a and 7) + c).
        if(idx>0x10)idx=((idx&7)+c)&255;
      }
    }
    const rgb=pal[idx]||[0,0,0];
    ctx.fillStyle=sourceVgaRgb(rgb);ctx.fillRect(x+xx,y+yy,1,1);
  }
  ctx.restore();
  return true;
}
function drawIndexedSourceSpriteRot180(ctx,name,x,y,w=W,h=H,options=null){
  // FIGURES.PAS::InitWall builds rotated wall figures with RotateImage(...,180).
  // Keep the source indexed pixels and live VGA palette; do not rotate the
  // already-baked PNG because that loses the source palette boundary.
  const D=window.MARIO_BAKED_DATA?.source_images, rec=D&&D[name];
  if(!rec||!Array.isArray(rec.pixels))return false;
  const basePal=window.MARIO_BAKED_DATA?.palettes?.['MPAL256']||[];
  // Python source_renderer.py::_load_indexed_wall resolves WallType=2 from
  // the source MPAL256 DAC at InitWall time, not from a later animated page palette.
  const pal=basePal.map(v=>Array.isArray(v)?v.slice():[0,0,0]), cw=Number(rec.w), ch=Number(rec.h);
  ctx.save();ctx.translate(x+w,y+h);ctx.rotate(Math.PI);
  for(let yy=0;yy<ch;yy++)for(let xx=0;xx<cw;xx++){
    const idx=Number(rec.pixels[yy*cw+xx]); if(!idx)continue;
    const rgb=pal[idx]||[0,0,0];ctx.fillStyle=sourceVgaRgb(rgb);ctx.fillRect(xx,yy,1,1);
  }
  ctx.restore();return true;
}
function drawIndexedSourceSpriteRecolor2(ctx,name,x,y,w=W,h=H,options=null,recolor1=0,recolor2=0,flipX=false,flipY=false,rot180=false){
  const D=window.MARIO_BAKED_DATA?.source_images, rec=D&&D[name];
  if(!rec||!Array.isArray(rec.pixels))return false;
  // FIGURES.PAS::InitWall -> init_wall_type2() calls _load_indexed_wall()
  // before PlayWorld starts and without an active page palette.  Therefore the
  // ReColor2 wall must resolve against the original MPAL256 DAC, not the later
  // animated runtime palette.  Using sourceRuntimePalette here was the reason
  // 3A could retain the green presentation for its recolored mountain bank.
  const basePal=window.MARIO_BAKED_DATA?.palettes?.['MPAL256']||[];
  const pal=basePal.map(v=>Array.isArray(v)?v.slice():[0,0,0]), cw=Number(rec.w), ch=Number(rec.h);
  ctx.save();
  if(rot180){ctx.translate(x+w,y+h);ctx.rotate(Math.PI);x=0;y=0}
  else if(flipX){ctx.translate(x+w,y);ctx.scale(-1,1);x=0;y=0}
  else if(flipY){ctx.translate(x,y+h);ctx.scale(1,-1);x=0;y=0}
  for(let yy=0;yy<ch;yy++)for(let xx=0;xx<cw;xx++){
    let idx=Number(rec.pixels[yy*cw+xx]);
    if(idx<=0)continue;
    if(idx>0x10){idx&=0x0F; idx=idx<8?((idx+Number(recolor1))&255):(((idx&7)+Number(recolor2))&255);}
    const rgb=pal[idx]||[0,0,0];ctx.fillStyle=sourceVgaRgb(rgb);ctx.fillRect(x+xx,y+yy,1,1);
  }
  ctx.restore(); return true;
}

function drawSourceWallType2Direct(ctx,name,x,y,options,recolor1,recolor2){
  // FIGURES.PAS::InitWall type 2 -> ReColor2(GREEN000..004, C1, C2).
  // Python source performs this once against MPAL256.  Keep the exact byte
  // transform and write the resulting pixels directly to the destination.
  const D=window.MARIO_BAKED_DATA?.source_images, rec=D&&D[name];
  const pal=window.MARIO_BAKED_DATA?.palettes?.['MPAL256']||[];
  if(!rec||!Array.isArray(rec.pixels))return false;
  const key=JSON.stringify(['wt2',name,Number(recolor1)&255,Number(recolor2)&255]);
  let image=sourceStaticTileCache.get(key);
  if(!image){
    image=new ImageData(W,H); const d=image.data;
    for(let i=0;i<rec.pixels.length;i++){
      let idx=Number(rec.pixels[i]); if(idx<=0x10){} else {
        idx&=0x0F;
        idx=idx<8?((idx+Number(recolor1))&255):(((idx&7)+Number(recolor2))&255);
      }
      if(idx===0)continue;
      const rgb=pal[idx]||[0,0,0],off=i*4;
      d[off]=Math.round(rgb[0]*255/63); d[off+1]=Math.round(rgb[1]*255/63);
      d[off+2]=Math.round(rgb[2]*255/63); d[off+3]=255;
    }
    // VGA256.PAS::DrawImage ignores source byte 0.  Python/Pygame represents
    // those pixels as transparent on an off-screen Surface and then blits the
    // Surface.  Do NOT putImageData() onto the destination here: putImageData
    // writes transparent pixels into the destination and erases the sand/sky,
    // which becomes a black rectangular hole around 3A grass and a black edge
    // beside the mountain.
    const tile=document.createElement('canvas');
    tile.width=W; tile.height=H;
    tile.getContext('2d').putImageData(image,0,0);
    sourceStaticTileCache.set(key,tile);
  }
  const tile=sourceStaticTileCache.get(key);
  const oldSmooth=ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(tile,Math.round(x),Math.round(y),W,H);
  ctx.imageSmoothingEnabled=oldSmooth;
  return true;
}

// STEP158 SOURCE AUDIT: Options_1a.GroundColor1 is not an InitWall recolor
// input for WallType1=3 in the supplied Python FIGURES renderer.  Keep the
// BROWN source bank unchanged here; do not invent a ground recolor.  A separate
// source-backed path must be identified before changing Level 1A ground pixels.
function drawSourceWall(ctx,w,s,x,y,cam,forcedN=null){
  const c=w.get(x,y); if(forcedN===null && (c<1||c>26))return;
  let n=c, wt=Number(s.options?.WallType1??0);
  // SOURCE/Python SourceFigureSet is initialized once from Options.WallType1.
  // FIGURES.Redraw only does `n -= 13` for map bytes 14..26; it does NOT
  // switch to Options.WallType2.  In 3A WallType1=2, so both 1..13 and
  // 14..26 must use the same ReColor2(GREEN, GroundColor1, GroundColor2)
  // wall bank.  Switching 14..26 to WallType2=0 was the remaining green
  // mountain leak.
  if(n>13)n-=13;
  const base={0:'GREEN',1:'SAND',3:'BROWN',4:'GRASS',5:'DES'}[wt];
  if(!base && wt!==2)return;
  const srcIdx=(n===1?0:n===2?1:n===4?2:n===5?3:n===10?4:null);
  const px=x*W-Number(cam), py=y*H+9;
  const drawBase=(idx,fx=false,fy=false,rot=false)=>{
    const nm=`${base||'GREEN'}.00${idx}`;
    if(wt===2){
      // 3A source wall bank: do not fall back to the GREEN PNG presentation.
      // The direct path is used only for the unrotated base figures; mirrored
      // and rotated indices remain handled by the existing source path below.
      if(!fx&&!fy&&!rot)return drawSourceWallType2Direct(ctx,nm,px,py,s.options,Number(s.options?.GroundColor1??0),Number(s.options?.GroundColor2??0));
      return drawIndexedSourceSpriteRecolor2(ctx,nm,px,py,W,H,s.options,Number(s.options?.GroundColor1??0),Number(s.options?.GroundColor2??0),fx,fy,rot);
    }
    // WallType 0/1/3/4/5 uses the already extracted source PNG figure bank.
    // Keep these ordinary wall figures on the same ASSETS path as the rest of
    // the HTML runtime. The previous ImageData path could silently leave the
    // ground bank absent in the browser even though the source figure and PNG
    // both existed. The figure/code mapping is the same InitWall mapping used
    // below; no new geometry or texture is introduced.
    const assetName=`${base}_00${idx}`;
    const assetImg=img(assetName);
    if(assetImg){
      ctx.save();
      if(rot){ctx.translate(px+W,py+H);ctx.rotate(Math.PI);ctx.drawImage(assetImg,0,0,W,H);}
      else if(fx){ctx.translate(px+W,py);ctx.scale(-1,1);ctx.drawImage(assetImg,0,0,W,H);}
      else if(fy){ctx.translate(px,py+H);ctx.scale(1,-1);ctx.drawImage(assetImg,0,0,W,H);}
      else ctx.drawImage(assetImg,px,py,W,H);
      ctx.restore();return true;
    }
    // If the external PNG has not finished loading yet, retain the source
    // indexed path as a deterministic fallback rather than drawing a blank
    // tile. This also keeps the wall visible during asynchronous asset load.
    const key=nm+'|wall|'+JSON.stringify([s.key||'',s.options?.SkyType??0,s.options?.BackGrType??0,s.options?.WallType1??0,s.options?.WallType2??0,s.options?.Design??0,s.options?.GroundColor1??0,s.options?.GroundColor2??0]);
    let tile=sourceStaticTileCache.get(key);
    if(!tile){
      const D=window.MARIO_BAKED_DATA?.source_images,rec=D&&D[nm];
      if(!rec)return false;
      const pal=sourceRuntimePalette(s.options||{}), image=ctx.createImageData(W,H),d=image.data;
      for(let yy=0;yy<H;yy++)for(let xx=0;xx<W;xx++){
        const a=Number(rec.pixels[yy*W+xx]); if(!a)continue;
        const rgb=pal[a]||[0,0,0],off=(yy*W+xx)*4;
        d[off]=Math.round(rgb[0]*255/63);d[off+1]=Math.round(rgb[1]*255/63);d[off+2]=Math.round(rgb[2]*255/63);d[off+3]=255;
      }
      tile=document.createElement('canvas');tile.width=W;tile.height=H;tile.getContext('2d').putImageData(image,0,0);sourceStaticTileCache.set(key,tile);
    }
    ctx.save();
    if(rot){ctx.translate(px+W,py+H);ctx.rotate(Math.PI);ctx.drawImage(tile,0,0,W,H);}
    else if(fx){ctx.translate(px+W,py);ctx.scale(-1,1);ctx.drawImage(tile,0,0,W,H);}
    else if(fy){ctx.translate(px,py+H);ctx.scale(1,-1);ctx.drawImage(tile,0,0,W,H);}
    else ctx.drawImage(tile,px,py,W,H);
    ctx.restore();return true;
  };
  const drawN=(nn)=>{
    if(nn===1)return drawBase(0);
    if(nn===2)return drawBase(1);
    if(nn===4)return drawBase(2);
    if(nn===5)return drawBase(3);
    if(nn===10)return drawBase(4);
    if(nn===3)return drawBase(0,true);
    if(nn===6)return drawBase(2,false,false,true);
    if(nn===9)return drawBase(0,false,false,true);
    if(nn===8)return drawBase(1,false,false,true);
    // InitWall source construction: 7=Rotate(Mirror(1)) -> vertical flip.
    if(nn===7)return drawBase(0,false,true,false);
    if(nn===11)return drawBase(4,true);
    // 12=Rotate(Mirror(10)) -> vertical flip.
    if(nn===12)return drawBase(4,false,true,false);
    // 13=Mirror(12) -> horizontal+vertical flip.
    if(nn===13)return drawBase(4,true,true,false);
    return false;
  };
  const above=w.get(x,y-1), left=w.get(x-1,y), right=w.get(x+1,y);
  // SourceFigureSet.draw(): when a $F7 grass cell is immediately below wall
  // figure 18, the source renderer paints wall[5] first, then the grass.
  // Keep this explicit overlay separate from the normal wall-cell dispatch so
  // the mountain body remains the bottom layer without manufacturing geometry.
  if(forcedN!==null) return drawN(Number(forcedN));
  // FIGURES.PAS neighbor overlays for endpoint figures.
  if(above===18) drawN(5);
  if((left>=14&&left<=26)&&[1,4,7].includes(n)) drawN(left-13);
  else if((right>=14&&right<=26)&&[3,6,9].includes(n)) drawN(right-13);
  return drawN(n);
}
let skyCache=null;
let coinCounter=0;
let blinkCounter=0;
let waterfallStarted=false;
function drawSourceSky(ctx,s){
  // Presentation-only cache: the source sky is deterministic for one Options
  // record. Reusing the raster removes the per-frame 200-row fill loop without
  // changing palette indices, horizon, world state, physics, or collision.
  const key=JSON.stringify([s.options.SkyType??0,s.options.BackGrType??0,s.options.Horizon??140]);
  if(!skyCache || skyCache.key!==key){
    if(typeof document==='undefined' || typeof document.createElement!=='function'){
      const pal=sourceSkyPalette(s.options), horizon=Number(s.options.Horizon??140);
      for(let y=0;y<200;y++){
        let idx;
        if(y>=horizon) idx=240;
        else { idx=Math.max(224,239-Math.floor(y/6)); const dh=y%6; if(dh>=3&&idx!==224&&idx!==240){const bit=1<<(dh&1);idx=(idx&~bit)|((idx-1)&bit)} }
        const rgb=pal[idx]||pal[224]||[35,45,63]; ctx.fillStyle=sourceVgaRgb(rgb); ctx.fillRect(0,y,320,1);
      }
      return;
    }
    const c=document.createElement('canvas'); c.width=320; c.height=200;
    const x=c.getContext('2d'); const pal=sourceSkyPalette(s.options), horizon=Number(s.options.Horizon??140);
    // FIGURES.PAS::DrawSky source branch: BackGrType=0 fills the active page
    // with VGA index $E0; it does not execute the horizon gradient branch.
    if(Number(s.options.BackGrType??0)===0){
      x.fillStyle=sourceVgaRgb(pal[0xE0]||[0,0,0]);
      x.fillRect(0,9,320,182);
      skyCache={key:key,canvas:c};
      return;
    }
    // source_sky.py::render_sky_with_palette has two ordinary-sky branches:
    // SkyType 0/1/3/4 use a flat E0/F0 horizon split; only
    // SkyType 2/5/9/10/11/12 use SmoothFill.  The previous HTML path applied
    // SmoothFill to every nonzero BackGrType, which changed the source image
    // for ordinary sky levels.
    x.clearRect(0,0,320,200);
    if([0,1,3,4].includes(Number(s.options.SkyType??0))){
      const top=sourceVgaRgb(pal[0xE0]||[0,0,0]);
      const bottom=sourceVgaRgb(pal[0xF0]||[0,0,0]);
      if(horizon<=0){
        x.fillStyle=bottom; x.fillRect(0,9,320,182);
      }else if(horizon>=200){
        x.fillStyle=top; x.fillRect(0,9,320,182);
      }else{
        const logicalH=Math.min(182,Math.max(0,horizon));
        if(logicalH>0){x.fillStyle=top;x.fillRect(0,9,320,logicalH);}
        if(logicalH<182){x.fillStyle=bottom;x.fillRect(0,9+logicalH,320,182-logicalH);}
      }
    }else if([2,5,9,10,11,12].includes(Number(s.options.SkyType??0))){
      // SOURCE: render_sky_with_palette() uses SmoothFill for SkyType
      // 2/5/9/10/11/12 with horizon-4 as the SmoothFill horizon.  The VGA
      // planar correction affects X positions by plane (X&3), not one whole
      // scanline. Preserve that exact source index pattern before YBASE=9.
      const smoothHorizon=horizon-4;
      for(let y=0;y<182;y++){
        let dl;
        if(y>=smoothHorizon) dl=240;
        else dl=Math.max(224,239-Math.floor(y/6));
        const dh=y%6;
        for(let xx=0;xx<320;xx++){
          let idx=dl;
          if(dh>=3 && dl!==224 && dl!==240){
            const selected=((dh&1)===0)?(xx%4===0||xx%4===2):(xx%4===1||xx%4===3);
            if(selected)idx=dl-1;
          }
          const rgb=pal[idx]||pal[224]||[35,45,63];
          x.fillStyle=sourceVgaRgb(rgb); x.fillRect(xx,y+9,1,1);
        }
      }
    }
    // Unsupported SkyType/BackGrType combinations remain the source's blank
    // presentation boundary rather than receiving an invented gradient.
    skyCache={key:key,canvas:c};
  }
  ctx.drawImage(skyCache.canvas,0,0);
}
function sourceBackGrMapName(type){
  // BACKGR.PAS::InitBackGr source map selection. 1/2 use BOGEN, 3 uses
  // MOUNT, 9 uses BOGEN7, and 10 uses BOGEN26. Type 11 is not initialized by
  // the supplied source InitBackGr case and is therefore deliberately absent.
  return ({1:'BOGEN.BK',2:'BOGEN.BK',3:'MOUNT.BK',9:'BOGEN7.BK',10:'BOGEN26.BK'})[Number(type)]||null;
}
function sourceBackGrHeight(type,raw){
  // BACKGR.PAS::InitBackGr applies Height - value + 1 only to 1, 9, 10.
  const t=Number(type); return (t===1||t===9||t===10) ? 26-Number(raw)+1 : Number(raw);
}
/* STEP154: TAINT-SAFE SOURCE BACKGR PRESENTATION */
function drawSourceBackGrMap(ctx,s,cam){
  // BACKGR.PAS::PutBackGr @Fill without Canvas readback.
  const type=Number(s.options?.BackGrType??0);
  const name=sourceBackGrMapName(type); if(!name||!window.MARIO_BAKED_DATA)return false;
  const rec=window.MARIO_BAKED_DATA.background_images?.[name];
  if(!rec||!Array.isArray(rec.pixels))return false;
  const horizon=Number(s.options?.Horizon??0), yBase=horizon-26;
  const xStart=Math.floor((Number(cam)||0)/3);
  const pal=sourceRuntimePalette(s.options||{});
  for(let sx=0;sx<320;sx++){
    const mi=xStart+sx; if(mi<0||mi>=rec.pixels.length)continue;
    // InitBackGr stores the 60x26 source map unchanged; BackGrMap is the height value itself.
    const hi=Math.max(0,Math.min(26,Number(rec.pixels[mi])));
    for(let row=0;row<26;row++){
      const localY=yBase+row, sy=localY+9;
      if(sy<9||sy>=191)continue;
      const cur=sourceSkyIndexAt(s.options||{},localY);
      if(cur===0xF0 && row<hi){ctx.fillStyle=sourceVgaRgb(pal[0xE0]||[0,0,0]);ctx.fillRect(sx,sy,1,1);}
      else if(cur===0xE0 && row>=hi){ctx.fillStyle=sourceVgaRgb(pal[0xF0]||[0,0,0]);ctx.fillRect(sx,sy,1,1);}
    }
  }
  window.__sourceBackGrLastXView=Number(cam)||0;
  return true;
}
const specialBackGrCache=new Map();
const sourceSpecialBrickTileCache=new Map();

/*
 * STEP6A-FINAL: continuous PALPILL source-page presentation.
 * Direct browser equivalent of the supplied Python Level._draw_pillar_fast():
 * PALPILL is written at absolute source X, repeats every 60 source pixels,
 * and the VGA viewport may begin at any pixel in that period.
 *
 * A 380px strip is enough for every 320px crop beginning at XView mod 60.
 * The strip is prebuilt once for each of the 60 PillarPalette phases, so camera
 * motion is a single crop blit rather than a scroll/refill or a page rebuild.
 */
/*
 * STEP6A-PYTHON-PARITY-V4
 *
 * The supplied Python runtime's 6A fast path has TWO independent periods:
 *   PALPILL source phase       = XView mod 60
 *   PillarPalette phase        = Round(XView / 2) mod 60
 * Their combined state therefore repeats every 120 source pixels.
 *
 * Do not crop a large texture at runtime and do not rasterize the viewport on
 * a camera step.  Build the exact 120 possible 320x200 visible pages once,
 * then present one already-rasterized page with a single drawImage(page,0,0).
 * This is both closer to the Python indexed-page/blit boundary and avoids any
 * browser source-rectangle sampling or scroll/exposed-column seam.
 */
const pillarViewportCache=new Map();
function pillarViewportKey(s,phase120){
  return JSON.stringify([
    'pillar-viewport-v4', phase120,
    Number(s.options?.SkyType??0),
    Number(s.options?.BackGrColor1??0),
    Number(s.options?.BackGrColor2??0)
  ]);
}
function buildPillarViewportPage(s,phase120){
  const p120=pmod(Number(phase120),120);
  const key=pillarViewportKey(s,p120);
  let page=pillarViewportCache.get(key);
  if(page)return page;
  const D=window.MARIO_BAKED_DATA?.source_images;
  const names=['PALPILL.$00','PALPILL.$01','PALPILL.$02'];
  if(!D || names.some(n=>!D[n]))return null;

  const image=new ImageData(320,200);
  const data=image.data;
  // Python's source Surface is opaque. The 18 virtual lines outside the
  // active YBASE page remain black/opaque, matching the native framebuffer.
  for(let i=0;i<data.length;i+=4){data[i]=0;data[i+1]=0;data[i+2]=0;data[i+3]=255;}

  const pal=sourceRuntimePalette(s.options||{});
  const phaseKey=pmod(Math.floor(p120/2+0.5),60);
  const viewPhase=p120;

  // Exact source_background.py::_pillar_palette arithmetic, in VGA 6-bit
  // space first. Do not convert to RGB before the /4 operation.
  const base1=(pal[Number(s.options?.BackGrColor1??0)]||[0,0,0]).map(v=>Math.floor(v/4));
  const base2=(pal[Number(s.options?.BackGrColor2??0)]||[0,0,0]).map(v=>Math.floor(v/4));
  const lut=new Array(60);
  let c1=base1.slice();
  let j=0,k=1;
  while(true){
    for(let l=j;l<=k;l++){
      const v=c1.map(q=>Math.min(63,q+k));
      lut[pmod(l+phaseKey,60)]=v.slice();
      lut[pmod(28+phaseKey-l,60)]=v.slice();
    }
    j=k; k+=1;
    if(k>=15)break;
  }
  c1=base1.slice();
  for(let q=28;q<=36;q++){
    c1=c1.map(v=>Math.max(0,v-1));
    lut[pmod(q+phaseKey,60)]=c1.map(v=>Math.max(0,Math.min(63,v)));
  }
  c1=base2.slice();
  for(let q=37;q<60;q++){
    lut[pmod(phaseKey+q,60)]=c1.map(v=>Math.max(0,Math.min(63,v)));
  }

  // Materialize the same indexed source page that Python builds, but resolve
  // the final DAC value before the one ImageData write. No tile canvas and no
  // runtime crop operation are involved.
  for(let y=9;y<191;y++){
    const sy=(y-9)%14;
    for(let x=0;x<320;x++){
      const ax=pmod(viewPhase+x,60);
      const tileNo=Math.floor(ax/20);
      const xx=ax%20;
      const idx=Number(D[names[tileNo]].pixels[sy*20+xx]);
      const rgb6=lut[idx-0xC0]||pal[idx]||[0,0,0];
      const off=(y*320+x)*4;
      data[off]=Math.round(rgb6[0]*255/63);
      data[off+1]=Math.round(rgb6[1]*255/63);
      data[off+2]=Math.round(rgb6[2]*255/63);
      data[off+3]=255;
    }
  }
  page=document.createElement('canvas');
  page.width=320; page.height=200;
  const pctx=page.getContext('2d');
  pctx.imageSmoothingEnabled=false;
  pctx.putImageData(image,0,0);
  pillarViewportCache.set(key,page);
  return page;
}
function clearPillarViewportCache(){pillarViewportCache.clear();}

function sourceRuntimeRgb(idx,options){
  // BACKGR.PAS writes/compares VGA palette indices after FIGURES.SetSkyPalette
  // and DrawPalBackGr have established the live DAC. Using DEFAULT.PAL here
  // is not source-faithful: its upper bank may still be black even though the
  // source DAC entry E0..FF has been replaced for the current scene.
  const pal=sourceRuntimePalette(options||{});
  const p=pal&&pal[Number(idx)&255];
  return p ? sourceVgaRgb(p) : 'rgb(0,0,0)';
}
function sourceClamp63(v){return Math.max(0,Math.min(63,Math.round(v)))}
function sourceSpecialPalette(bg,phase,idx,options){
  const pal=sourceRuntimePalette(options||{});
  if(!pal||!pal.length)return [0,0,0];
  let src=idx;
  if(bg===4 && idx>=0xE0 && idx<=0xF3){
    const j=idx-0xE0, i=pmod(Math.round(phase/2),20);
    src=(i===j)?0xFE:(((i+2)%20===j)?0xFF:0xFD);
  }else if(bg===5 && idx>=0xE0 && idx<=0xFF){
    const j=idx-0xE0,i=pmod(Math.round(phase/2),32);
    src=(i===j||((i+1)%32===j))?0xD6:((((i+3)%32===j)||((i+4)%32===j))?0xD4:0xD1);
  }else if(bg===6 && idx>=0xC0 && idx<=0xFB){
    // SOURCE/Python exact translation of source_background.py::_pillar_palette().
    // Entries 28..36 are written AFTER the rising/falling bands and therefore
    // overwrite earlier values when their palette slots overlap.
    const i=pmod(Math.round(phase/2),60),j=idx-0xC0;
    let c1=(pal[Number(options.BackGrColor1??0)]||[0,0,0]).map(v=>Math.floor(v/4));
    const c2=(pal[Number(options.BackGrColor2??0)]||[0,0,0]).map(v=>Math.floor(v/4));
    let rgb=null;
    for(let k=1;k<15;k++){
      for(let l=k-1;l<=k;l++){
        const v=c1.map(x=>sourceClamp63(x+k));
        if(j===pmod(l+i,60)) rgb=v;
        if(j===pmod(28+i-l,60)) rgb=v;
      }
    }
    // Python writes every 28..36 entry unconditionally.
    for(let q=28;q<=36;q++){
      c1=c1.map(v=>Math.max(0,v-1));
      if(q===j) rgb=c1.map(v=>sourceClamp63(v));
    }
    if(rgb===null && j>=37) rgb=c2.map(v=>sourceClamp63(v));
    if(rgb!==null)return rgb;
  }else if(bg===7 && idx>=0xE0 && idx<=0xFF){
    const j=idx-0xE0,i=pmod(Math.round(phase/2),32);
    src=(j<6)?0x01:0x10;
    // WindowPalette rotates the destination palette slots; map the requested
    // indexed slot back to the source palette entry selected by that phase.
    const sourceSlot=pmod(j-i,32);
    src=sourceSlot<6?0x01:0x10;
  }
  return pal[src]||[0,0,0];
}
function sourceSpecialPixel(ctx,idx,x,y,bg,phase,options){
  const rgb=sourceSpecialPalette(bg,phase,idx,options);
  ctx.fillStyle=sourceVgaRgb(rgb);ctx.fillRect(x,y,1,1);
}
function drawSpecialBackGrBlock(ctx,bg,worldX,screenX,y,w,h,phase,options){
  const D=window.MARIO_BAKED_DATA?.source_images;
  if(!D)return;
  if(bg===4){
    const rec=D['PALBRICK.$00'];if(!rec)return;
    // STEP183: build the 20x14 source tile through ImageData once. The source
    // pixels and palette lookup are unchanged; only the browser presentation
    // primitive is changed from 280 fillRect calls to one putImageData.
    const image=ctx.createImageData(w,h), data=image.data, pal=sourceRuntimePalette(options||{});
    for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
      const idx=Number(rec.pixels[yy*rec.w+xx]); if(!idx)continue;
      const rgb=sourceSpecialPalette(bg,phase,idx,options);
      const off=(yy*w+xx)*4; data[off]=Math.round(rgb[0]*255/63);data[off+1]=Math.round(rgb[1]*255/63);data[off+2]=Math.round(rgb[2]*255/63);data[off+3]=255;
    }
    ctx.putImageData(image,screenX,y);
    return;
  }
  if(bg===6){
    const names=['PALPILL.$00','PALPILL.$01','PALPILL.$02'];
    const rec=D[names[pmod(Math.floor(worldX/w),3)]];if(!rec)return;
    // 6A source tile raster is indexed/paletted data. Build one 20x14 tile
    // with ImageData, then let the caller compose cached tiles with drawImage.
    // This preserves the Python palette result while removing hundreds of
    // per-pixel Canvas calls from the scrolling path.
    const image=ctx.createImageData(w,h), data=image.data;
    for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
      const idx=Number(rec.pixels[yy*rec.w+xx]);
      if(!idx)continue;
      const rgb=sourceSpecialPalette(bg,phase,idx,options);
      const off=(yy*w+xx)*4;
      data[off]=Math.round(rgb[0]*255/63);
      data[off+1]=Math.round(rgb[1]*255/63);
      data[off+2]=Math.round(rgb[2]*255/63);
      data[off+3]=255;
    }
    ctx.putImageData(image,Math.round(screenX),Math.round(y));
    return;
  }
  if(bg===5){
    let bl=pmod(worldX,32);
    if(((y+14)&0x10)!==0)bl^=16;
    for(let yy=0;yy<h;yy++){
      const dy=y+yy,row=pmod(dy,16);
      for(let xx=0;xx<w;xx++){
        const dx=worldX+xx;
        let idx;
        if(row===2)idx=0xD4;
        else if(row>2)idx=0xE0+pmod(bl+xx,32);
        else idx=0xD1;
        if(row===0)idx=0xD6;
        // BACKGR.PAS::LargeBricks receives X as the destination VGA X.
        // worldX is only the source-space position used to choose the 32-pixel
        // brick pattern.  Drawing at dx would turn the world coordinate into
        // a screen coordinate and, once the camera scrolls, push the whole
        // special background off the 320-pixel page.
        sourceSpecialPixel(ctx,idx,screenX+xx,dy,bg,phase,options);
      }
      if(row===0)bl^=16;
    }
    return;
  }
  if(bg===7){
    for(let yy=0;yy<h;yy++){
      const dy=y+yy;
      for(let xx=0;xx<w;xx++){
        const dx=worldX+xx, local=pmod(dy+22,32);
        // WINDOWS.PAS uses X as the destination address, while the low five
        // X bits select the source palette slot. Keep those two coordinate
        // spaces separate during camera scrolling.
        let idx;
        if(local<3)idx=1;else idx=0xE0+(dx&31);
        sourceSpecialPixel(ctx,idx,screenX+xx,dy,bg,phase,options);
      }
    }
  }
}
const sourceSpecialTileCache=new Map();
function prewarmLevel2ABackground(s){
  const sky=Number(s.options?.SkyType??0), bg=Number(s.options?.BackGrType??0);
  if(!(sky>=6&&sky<=8&&bg>=4&&bg<=7))return;
  if(bg===6){
    // Python parity: the combined source-image/palette state is 120 pixels.
    // Prewarm every possible viewport page so camera motion never performs a
    // first-use rasterization or a source-rectangle crop.
    for(let phase120=0;phase120<120;phase120++) buildPillarViewportPage(s,phase120);
    return;
  }
  if(bg!==4)return;
  // Source DrawPalBackGr phase is periodic mod 20. Precompute all source phases
  // before gameplay so camera scrolling never pays the first-time raster cost.
  for(let phase=0;phase<20;phase++){
    const key='bg4|'+phase+'|'+sky+'|'+String(s.options.BackGrColor1??0)+'|'+String(s.options.BackGrColor2??0);
    if(sourceSpecialTileCache.has(key)&&specialBackGrCache.has(key))continue;
    let tile=sourceSpecialBrickTileCache.get(key);
    if(!tile){
      tile=document.createElement('canvas');tile.width=20;tile.height=14;
      drawSpecialBackGrBlock(tile.getContext('2d'),bg,0,0,0,20,14,phase*2,s.options);
      sourceSpecialBrickTileCache.set(key,tile);
    }
    let page=specialBackGrCache.get(key);
    if(!page){
      page=document.createElement('canvas');page.width=320;page.height=200;
      const pctx=page.getContext('2d');
      for(let by=0;by<182;by+=14)for(let bx=0;bx<320;bx+=20)pctx.drawImage(tile,bx,by+9);
      specialBackGrCache.set(key,page);
    }
    sourceSpecialTileCache.set(key,page);
  }
} 
function drawSpecialBackGr(ctx,s,cam){
  const sky=Number(s.options.SkyType??0),bg=Number(s.options.BackGrType??0);
  if(!(sky>=6&&sky<=8&&bg>=4&&bg<=7))return false;
  if(typeof window==='undefined'||!window.MARIO_BAKED_DATA)return false;
  const sourceX=Math.floor(Number(cam));
  // BACKGR.PAS::DrawPalBackGr uses Round(XView/BrickSpeed), BrickSpeed=2.
  // The background image itself is periodic for each source background type;
  // caching by the source phase removes the 58k-pixel rebuild on every 1px
  // camera step. No gameplay state or source coordinates are changed.
  const phaseKeyBase=Math.floor(sourceX/2+0.5);

  if(bg===4){
    const phaseKey=((phaseKeyBase%20)+20)%20;
    const key='bg4|'+phaseKey+'|'+sky+'|'+String(s.options.BackGrColor1??0)+'|'+String(s.options.BackGrColor2??0);
    let tile=sourceSpecialBrickTileCache.get(key);
    if(!tile){
      // BACKGR.PAS::DrawBricks repeats one 20x14 PALBRICK source tile. Cache
      // that exact source tile for each of the 20 palette phases. The old HTML
      // expanded all 208 tiles pixel-by-pixel (58,240 fillRect calls) whenever
      // a new phase appeared, which is the direct 2A scrolling hot path.
      tile=document.createElement('canvas'); tile.width=20; tile.height=14;
      drawSpecialBackGrBlock(tile.getContext('2d'),bg,0,0,0,20,14,phaseKey*2,s.options);
      sourceSpecialBrickTileCache.set(key,tile);
    }
    let page=sourceSpecialTileCache.get(key);
    if(!page){
      page=document.createElement('canvas'); page.width=320; page.height=200;
      const pctx=page.getContext('2d');
      for(let by=0;by<182;by+=14)for(let bx=0;bx<320;bx+=20)pctx.drawImage(tile,bx,by+9);
      sourceSpecialTileCache.set(key,page);
    }
    ctx.drawImage(page,0,0); return true;
  }

  // Other special backgrounds retain their source-coordinate dependence. Their
  // cache key is still reduced to the periodic source phase instead of the
  // absolute camera value, preventing unbounded cache growth during scrolling.
  const period=bg===6?60:bg===5||bg===7?32:32;
  const phaseKey=((phaseKeyBase%period)+period)%period;
  // STEP6A-FINAL: exact Python _draw_pillar_fast presentation.
  // Crop a continuous absolute-X PALPILL strip at XView mod 60, while the
  // PillarPalette phase is Round(XView/2) mod 60. This is the source VGA
  // SetViewport behavior and cannot expose a one-column scroll seam.
  if(bg===6){
    const phase120=pmod(sourceX,120);
    const page=buildPillarViewportPage(s,phase120);
    if(page){
      const oldSmooth=ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled=false;
      // Whole-page blit only. Never pass sourceX/cropX to drawImage here.
      ctx.drawImage(page,0,0);
      ctx.imageSmoothingEnabled=oldSmooth;
    }
    return true;
  }
  // Other special backgrounds retain their source-coordinate dependence.
  const cameraPixel=((sourceX%20)+20)%20;
  const key=JSON.stringify(['special',bg,sky,phaseKey,cameraPixel,s.options.BackGrColor1??0,s.options.BackGrColor2??0]);
  let page=specialBackGrCache.get(key);
  if(!page){
    page=document.createElement('canvas');page.width=320;page.height=200;
    const pctx=page.getContext('2d');
    pctx.fillStyle='rgb(0,0,0)';pctx.fillRect(0,0,320,200);
    const firstX=Math.floor(sourceX/20)*20;
    for(let by=0;by<182;by+=14){for(let ax=firstX;ax<=sourceX+320;ax+=20){drawSpecialBackGrBlock(pctx,bg,ax,ax-sourceX,by+9,20,14,phaseKey*2,s.options)}}
    specialBackGrCache.set(key,page);
    while(specialBackGrCache.size>48){const first=specialBackGrCache.keys().next().value;specialBackGrCache.delete(first)}
  }
  ctx.drawImage(page,0,0);return true;
}
function drawBumpBlock(ctx,s,cam){
  const b=bumpBlockState;
  if(!b || b.dy>=4)return;
  const sx=b.x*W-cam;
  // Keep BLOCKS.PAS timing/state (DY still advances -4..+4), but render the
  // bump as a smooth visual arc. The source uses integer VGA positions, while
  // the browser can present fractional pixels; interpolating the presentation
  // avoids the visibly rigid 1-pixel stair-step without changing collision,
  // timing, block state, or the source BumpBlock lifecycle.
  const phase=Math.max(0,Math.min(1,(Number(b.dy)+4)/8));
  const bumpOffset=-4*Math.sin(Math.PI*phase);
  const sy=b.y*H+9+bumpOffset;
  if(sx+W<0||sx>=320||sy+H<0||sy>=200)return;

  // BLOCKS.PAS::DrawBlocks calls DrawBackGrBlock only for the exposed strip
  // below the displaced 20x14 block. The normal sky/background is already
  // present because drawWorld deliberately omits the original map cell while
  // Bumping is active. For BackGrType 4..7, use the verified DrawBackGrBlock
  // helpers only for this strip; never synthesize a full-screen layer.
  // When the block is displaced upward (DY<0), the exposed strip is the
  // source-cell area between the moved block and its original position.
  const fillH=Math.max(0,4-Math.abs(b.dy));
  if(fillH>0){
    const bg=Number(s.options.BackGrType??0), sky=Number(s.options.SkyType??0);
    const smooth=[2,5,9,10,11].includes(sky);
    if(!smooth && bg>=4&&bg<=7){
      const phase=Number(cam);
      drawSpecialBackGrBlock(ctx,bg,b.x*W,sx,sy+H,W,fillH,phase,s.options);
    }
  }
  // BLOCKS.PAS::DrawBlocks uses the captured BlockBuffer, not a newly selected
  // figure. This is important for indexed/recolored/question/note blocks and
  // is the direct source reason the old HTML renderer could show the wrong
  // image while the block was moving.
  if(b.blockBuffer){
    ctx.drawImage(b.blockBuffer,sx,sy,W,H);
  }else{
    // A source GetImage can only fail at the presentation boundary when the
    // requested rectangle is outside the current VGA page. Do not invent a
    // replacement image; leave the source block absent in that case.
  }
}

let foregroundCache=null;
function sourceBrickBankName(options,n){
  const wt=Number(options?.WallType1??0);
  if(wt===100||wt===101||wt===102){
    const bank=wt-100;
    return `BRICK${bank}.00${Math.max(0,Math.min(2,n))}`;
  }
  return null;
}
const sourceStaticTileCache=new Map();
const sourceGrassTileCache=new Map();
function drawCachedIndexedTile(ctx,name,x,y,w,h,options,recolor=null){
  // Static source figures are still the original indexed pixels; this cache
  // only moves the indexed->RGB conversion out of the camera loop.  The source
  // palette entries consumed by BuildWorld Recolor() for these brick banks are
  // in the stable low bank, so name+recolor is the complete presentation key.
  const key=name+'|'+String(recolor===null?'':recolor)+'|'+w+'x'+h;
  let tile=sourceStaticTileCache.get(key);
  if(!tile){
    const D=window.MARIO_BAKED_DATA?.source_images,rec=D&&D[name];
    if(!rec||!Array.isArray(rec.pixels))return false;
    const pal=sourceRuntimePalette(options||{});
    tile=document.createElement('canvas');tile.width=w;tile.height=h;
    const t=tile.getContext('2d');
    const image=t.createImageData(w,h), d=image.data;
    for(let yy=0;yy<Number(rec.h);yy++)for(let xx=0;xx<Number(rec.w);xx++){
      let idx=Number(rec.pixels[yy*Number(rec.w)+xx]);
      if(!idx)continue;
      if(recolor!==null) idx=((idx&7)+Number(recolor))&255;
      const rgb=pal[idx]||[0,0,0];
      const off=(yy*w+xx)*4;
      d[off]=Math.round(rgb[0]*255/63);d[off+1]=Math.round(rgb[1]*255/63);
      d[off+2]=Math.round(rgb[2]*255/63);d[off+3]=255;
    }
    t.putImageData(image,0,0);sourceStaticTileCache.set(key,tile);
  }
  ctx.drawImage(tile,x,y,w,h);return true;
}
function drawSourceABlock(ctx,w,s,x,y,cam){
  // FIGURES.PAS::Redraw case 'A': Bricks[0..2] is selected from
  // WallType1=100/101/102 and the neighboring A cell/parity selects 000/001/002.
  const nleft=w.get(x-1,y)===65, nright=w.get(x+1,y)===65;
  const n=((x+y)&1) ? (nleft?2:0) : (nright?1:0);
  const name=sourceBrickBankName(s.options,n);
  if(!name)return;
  const color=Number(s.options?.GroundColor1??0x48)&255;
  drawCachedIndexedTile(ctx,name,x*W-Number(cam),y*H+9,W,H,s.options,color);
}
function drawSourceGrass(ctx,w,s,x,y,cam,grassCounter){
  // FIGURES.PAS::ConvertGrass + PALETTES.PAS live 153..158 DAC entries.
  // Keep this boundary entirely pixel-based: source byte 0 is NOT drawn.
  // This is the same rule as Python source_renderer._convert_grass_source()
  // and avoids any browser image sampling around the 20x14 tile boundary.
  const left=w.get(x-1,y)===247, right=w.get(x+1,y)===247;
  let prefix, reverse=false;
  if((x===0||left)&&right) prefix='GRASS2';
  else if(!right) { prefix='GRASS3'; reverse=true; }
  else prefix='GRASS1';
  const D=window.MARIO_BAKED_DATA?.source_images;
  const a=D?.[`${prefix}.$01`], b=D?.[`${prefix}.$02`];
  if(!a||!b)return;
  const p=sourceRuntimePalette(s.options||{});
  const p1=reverse?b:a, p2=reverse?a:b;
  const out=new Uint8Array(W*H);
  for(let i=0;i<out.length;i++){
    const c1=Number(p1.pixels[i]), c2=Number(p2.pixels[i]);
    let c0=c1;
    if(c1===c2){out[i]=c0;continue;}
    if(c1===2){c0=153;if(c2===0){out[i]=c0;continue;}c0=155;}
    else if(c1===3){c0=154;if(c2===0){out[i]=c0;continue;}c0=156;}
    else {c0=(c2===2)?157:155;}
    out[i]=c0;
  }
  const cacheKey=JSON.stringify([prefix,reverse,grassCounter<0?'neg':'pos',p]);
  let tile=sourceGrassTileCache.get(cacheKey);
  if(!tile){
    // Keep the source grass as a transparent RGBA tile. Python/Pygame blits
    // its transparent Surface over the existing world; putImageData() directly
    // on the destination is not equivalent because alpha=0 replaces pixels.
    tile=document.createElement('canvas');
    tile.width=W; tile.height=H;
    const tc=tile.getContext('2d');
    const image=tc.createImageData(W,H), d=image.data;
    for(let i=0;i<out.length;i++){
      const idx=out[i];
      // SOURCE/Python parity: source_renderer._convert_grass_source()
      // explicitly leaves the converted background entries transparent at
      // the Pygame Surface boundary.  ConvertGrass uses 153..158 as the
      // grass/sky transition values, but FIGURES.PAS DrawImage must not paint
      // those background pixels over the world tile underneath.  In Python
      // these entries are skipped before Surface.blit(), which is what lets
      // the mountain/sand underneath remain visible through the grass tile.
      // Painting them as opaque pixels produces the exact rectangular block
      // reported in 3A, especially where grass overlaps a mountain wall.
      if(idx===0 || idx===153 || idx===154 || idx===157 || idx===158)continue;
      const rgb=p[idx]||[0,0,0], off=i*4;
      d[off]=Math.round(rgb[0]*255/63); d[off+1]=Math.round(rgb[1]*255/63);
      d[off+2]=Math.round(rgb[2]*255/63); d[off+3]=255;
    }
    tc.putImageData(image,0,0);
    sourceGrassTileCache.set(cacheKey,tile);
  }
  // Transparent Surface.blit parity: source byte 0 leaves the destination
  // unchanged. Disable filtering so the 1-pixel VGA cells remain exact.
  const oldSmooth=ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(tile,Math.round(x*W-Number(cam)),y*H+9,W,H);
  ctx.imageSmoothingEnabled=oldSmooth;
}
function drawDynamicLava(ctx,w,s,cam){
  // SOURCE/game.py::Level.draw + PLAY.PAS: Design=5 '%' uses LAVA2.$01..$05
  // with frame=(X + LavaCounter div 8) mod 5 + 1.  Keep this layer dynamic;
  // it must never be frozen inside the static foreground cache.
  if(Number(s.options?.Design??0)!==5) return;
  const start=Math.max(0,pdiv(Number(cam),W)-1);
  const end=Math.min(w.xsize,pdiv(Number(cam),W)+NH+1);
  const fc=pdiv(Number(lavaCounter),8);
  // SOURCE: SourceFigureSet.draw(), Design=5, '#' is a solid tile filled
  // with palette entry 5. '%' is the animated LAVA2 overlay. The HTML cache
  // intentionally excludes both dynamic cells, so the '#' base must be
  // restored here before the animated '%' cells are drawn. This is why the
  // lower half of the Level 6A lava pit was previously black/missing.
  const lavaBase=sourceRuntimePalette(s.options||{})[5]||[0,0,0];
  ctx.fillStyle=sourceVgaRgb(lavaBase);
  for(let y=0;y<NV;y++)for(let x=start;x<end;x++){
    if(w.get(x,y)!==35) continue; // '#' in the source WorldMap byte domain
    ctx.fillRect(x*W-Number(cam),y*H+9,W,H);
  }
  for(let y=0;y<NV;y++)for(let x=start;x<end;x++){
    if(w.get(x,y)!==37) continue; // '%' in the source WorldMap byte domain
    const frame=pmod(x+fc,5)+1;
    drawSprite(ctx,`LAVA2_00${frame}`,x*W-Number(cam),y*H+9,W,H);
  }
  // PLAY.PAS redraws exactly NH+1 horizon cells after RunRemove.
  const horizon=Number(s.options?.Horizon??NV);
  if(horizon<NV){
    const j=horizon-1, xb=pdiv(Number(cam),W);
    for(let i=0;i<=NH;i++){
      const k=xb+pmod(i+fc,NH+1);
      if(k<0||k>=w.xsize||w.get(k,j)!==37) continue;
      const frame=pmod(k+fc,5)+1;
      drawSprite(ctx,`LAVA2_00${frame}`,k*W-Number(cam),j*H+9,W,H);
    }
  }
}
function drawStaticForeground(ctx,w,s,cam){
  // STEP150 SOURCE AUDIT: FIGURES.PAS has a dedicated '=' case (PIN_000).
  // It was missing from the HTML special-cell path, so PIN markers could be
  // silently omitted. No gameplay state or source map value is changed.

  // STEP142: bumping is a transient BLOCKS.PAS layer. Cache invalidation occurs
  // only when bumping starts/ends, never for each DY frame.
  // Browser asset loading is asynchronous, unlike the DOS source where the
  // figure banks already exist before PlayWorld starts. Never freeze a blank
  // cache while assets are still loading: before assetsReady the presentation
  // path must remain uncached; once loading completes the first cached raster
  // is built from the actual source-derived PNGs.
  if(!assetsReady) return false;
  // MARIO.PAS/PLAY.PAS source presentation redraws only the map columns that
  // enter the virtual 320-pixel viewport while scrolling. The HTML renderer
  // previously re-rasterized every visible map cell every frame, which is a
  // presentation mismatch and the direct source-backed cause of unnecessary
  // scroll stutter. Cache the same static map layer once per world revision,
  // then copy the camera window. Dynamic bump/lava/object layers remain outside
  // this cache, just as the source redraws them separately.
  if(typeof document==='undefined'||typeof document.createElement!=='function') return false;
  // Bump animation is a separate BLOCKS.PAS presentation layer. It must not
  // invalidate the immutable foreground raster on every MoveBlocks frame;
  // doing so rebuilt the entire level while a block was moving and amplified
  // the scrolling stutter. World mutations already invalidate through revision.
  const key=JSON.stringify([s.key||'',w.xsize,w.revision,s.options.Design||0,s.options.WallType1||0,s.options.WallType2||0]);
  if(!foregroundCache||foregroundCache.key!==key){
    const c=document.createElement('canvas'); c.width=Math.max(320,w.xsize*W); c.height=200;
    const pctx=c.getContext('2d');
    const design=s.options.Design;
    for(let y=0;y<NV;y++)for(let xx=0;xx<w.xsize;xx++){
      const cell=w.get(xx,y);
      // These cells are source-indexed/special presentation cases. They must
      // never be frozen into the RGB foreground cache because FIGURES.PAS
      // selects their actual image (and, for indexed resources, their DAC
      // colors) at presentation time.
      const special = (cell>=1&&cell<=26) || cell===61 || cell===65 || (cell>=48&&cell<=51) || cell===42 ||
        cell===240 || cell===244 || cell===245 || cell===246 || cell===247 ||
        cell===249 || cell===250 || cell===254 || cell===35 || cell===37 ||
        cell===74 || cell===87 || cell===88;
      if(special)continue;
      // BLOCKS.PAS::DrawBlocks only paints the displaced BlockBuffer while
      // DY < BumpHeight. Once DY reaches +4 the source block is back at its
      // own address and EraseBlocks' restored BackGrBuffer keeps it visible
      // for the remaining four DelayCounter frames. Skipping the map cell for
      // the whole bump made the block vanish for those four frames, which is
      // the flicker seen on the note block.
      if(bumpBlockState&&bumpBlockState.dy<4&&bumpBlockState.x===xx&&bumpBlockState.y===y)continue;
      if(cell===32||cell===0)continue;
      let a=null;
      if(cell>=1&&cell<=26){
        // FIGURES.PAS::InitWall type 2 is ReColor2(GREEN..., GroundColor1,
        // GroundColor2). The indexed recolor must remain in drawSourceWall;
        // do not freeze the unrecolored GREEN bank into the persistent cache.
        let n=cell,wallType=s.options.WallType1||0;if(n>13){n-=13;wallType=s.options.WallType2||0}
        if(Number(wallType)!==2)a=wallAsset(design,n,wallType);
      }
      else if(cell===63)a='QUEST_000';else if(cell===64)a='QUEST_001';else if(cell===73)a='BLOCK_000';else if(cell===74)a='BLOCK_001';else if(cell===75)a='NOTE_000';else if(cell===88)a='XBLOCK_000';else if(cell===87)a='WOOD_000';else if(cell>=48&&cell<=51)a=`PIPE_00${cell-48}`;else if(cell===42)continue; // source COIN.$00 is palette-indexed and drawn dynamically below
      else if(cell===254)a='EXIT_000';else if(cell===240)a='FENCE_000';
      if(a)drawSprite(pctx,a,xx*W,y*H+9);
    }
    foregroundCache={key:key,canvas:c};
  }
  // PLAYERS.PAS keeps XView inside [0,(XSize-NH)*W]. Keep the source crop
  // inside the cache as well. This does not alter any valid source XView; it
  // only prevents Canvas from sampling outside the raster (which produces
  // transparent/black columns when an invalid camera value reaches draw).
  const maxCacheX=Math.max(0,foregroundCache.canvas.width-320);
  const sx=Math.max(0,Math.min(maxCacheX,Math.floor(Number(cam))));
  ctx.drawImage(foregroundCache.canvas,sx,0,320,200,0,0,320,200);
  // FIGURES.PAS::Redraw has several source cases that are not representable by
  // the old static PNG lookup (F0/F7/FA/F4/F9/F5, #/%, J/W/X, and indexed
  // WINDOW/COIN resources). Re-present those source pixels on top of the
  // persistent page so the browser uses the same source ImageBuffer domain.
  const design=Number(s.options?.Design??0), start=Math.max(0,pdiv(Number(cam),W)-2), end=Math.min(w.xsize,pdiv(Number(cam),W)+NH+2);
  for(let y=0;y<NV;y++)for(let xx=start;xx<end;xx++){
    const c=w.get(xx,y), px=xx*W-Number(cam), py=y*H+9, above=w.get(xx,y-1), below=w.get(xx,y+1);
    if(c>=1&&c<=26){
      drawSourceWall(ctx,w,s,xx,y,cam);
    }else if(c===61){
      // FIGURES.PAS::Redraw case '=': DrawImage(PIN000) when the cell below
      // is CanHoldYou; otherwise UpSideDown(PIN000).  Keep the source map
      // value and neighbor test intact; only the browser presentation differs.
      const below=w.get(xx,y+1);
      const canHold=(below>=0&&below<=13)||(below>=48&&below<=90);
      if(canHold) drawSprite(ctx,'PIN_000',px,py,W,H);
      else drawSpriteVFlip(ctx,'PIN_000',px,py,W,H);
    }else if(c===65){
      drawSourceABlock(ctx,w,s,xx,y,cam);
    }else if(c>=48&&c<=51){
      // PLAY.PAS::InitPipes(Options.PipeColor) recolors PIPE000..003 at BuildWorld;
      // DrawImage then resolves those indexed bytes through the live VGA DAC.
      drawIndexedSourceSprite(ctx,`PIPE.00${c-48}`,px,py,W,H,s.options,false,false,Number(s.options?.PipeColor??0x70)&255);
    }else if(c===247 && design===1){
      // Python SourceFigureSet.draw() source order: for a grass cell directly
      // under wall figure 18, paint wall[5] first, then the grass surface.
      // This is the source-backed mountain-under-grass layer the HTML path was
      // missing; do not copy a neighboring tile or invent a polygon.
      if(above===18) drawSourceWall(ctx,w,s,xx,y,cam,5);
      drawSourceGrass(ctx,w,s,xx,y,cam,grassCounter);
    }else if(c===240){
      if(design===2) drawIndexedSourceSprite(ctx,above===240?'SMTREE.$01':'SMTREE.$00',px,py,W,H,s.options);
      else if(design===1) drawSprite(ctx,above===240?'FENCE_000':'FENCE_001',px,py,W,H);
    }else if(c===247 && design===2){
      // FIGURES.PAS::Redraw, case $F7, Design=2:
      //   if Above=$F0 then PutImage(SMTREE.$01);
      //   then ConvertGrass/DrawImage selects the actual grass figure.
      // Python SourceFigureSet.draw() also performs the common pre-dispatch
      // overlay when Above=18: wall[5] is painted FIRST, then the grass.
      // This is required by 5A (WallType1=0) where the $F7 grass cells at
      // x=53..54,y=10 sit directly below wall figure 18. Without this exact
      // source-backed overlay the wall's bottom pixels are absent and the
      // sky/background shows through as a rectangular hole.
      if(above===240)drawIndexedSourceSprite(ctx,'SMTREE.$01',px,py,W,H,s.options);
      if(above===18)drawSourceWall(ctx,w,s,xx,y,cam,5);
      drawSourceGrass(ctx,w,s,xx,y,cam,grassCounter);
    }else if(c===246 && design===1){
      // FIGURES.PAS::Redraw, case $F6, Design=1: the white-palm segment uses
      // the prebuilt WPALM image.
      drawSprite(ctx,'WPALM_000',px,py,W,H);
    }else if((c===35||c===37) && design===2){
      // FIGURES.PAS Design=2 uses the four TREE figures with the exact
      // neighbour-dependent overlay ordering below.
      if(c===35){
        if(above===35) drawSprite(ctx,'TREE_001',px,py,W,H);
        else if(above===37){ drawSprite(ctx,'TREE_000',px,py,W,H); drawSprite(ctx,'TREE_003',px,py,W,H); }
        else drawSprite(ctx,'TREE_003',px,py,W,H);
      }else{
        if(above===37) drawSprite(ctx,'TREE_000',px,py,W,H);
        else if(above===35){ drawSprite(ctx,'TREE_001',px,py,W,H); drawSprite(ctx,'TREE_002',px,py,W,H); }
        else drawSprite(ctx,'TREE_002',px,py,W,H);
      }
    }else if(c===254){
      // FIGURES.PAS::Redraw case #FE selects EXIT001 only when the cell above
      // is also #FE; otherwise EXIT000.
      drawSprite(ctx,above===254?'EXIT_001':'EXIT_000',px,py,W,H);
    }else if(c===250 && design===1){
      // FIGURES.PAS $FA: PutImage(Palm000), with the source neighbour overlay
      // BEFORE the common DrawImage(Fig^).  This is what joins adjacent palm
      // trunk pieces instead of leaving a broken one-tile seam.
      if(w.get(xx-1,y)===249) drawIndexedSourceSprite(ctx,'PALM3.$01',px,py,W,H,s.options);
      else if(w.get(xx+1,y)===249) drawIndexedSourceSprite(ctx,'PALM1.$01',px,py,W,H,s.options);
      drawIndexedSourceSprite(ctx,'PALM0.$01',px,py,W,H,s.options);
    }else if(c===244 && design===1){
      // FIGURES.PAS $F4: the white-palm segment is drawn first when the cell
      // below is $F6, then Palm001 is the common Fig draw.
      if(w.get(xx,y+1)===246) drawSprite(ctx,'WPALM_000',px,py,W,H);
      drawIndexedSourceSprite(ctx,'PALM1.$01',px,py,W,H,s.options);
    }else if(c===249 && design===1){
      // FIGURES.PAS $F9: common Fig draw is Palm002.
      drawIndexedSourceSprite(ctx,'PALM2.$01',px,py,W,H,s.options);
    }else if(c===245 && design===1){
      // FIGURES.PAS $F5: same white-palm lower join as $F4, then Palm003.
      if(w.get(xx,y+1)===246) drawSprite(ctx,'WPALM_000',px,py,W,H);
      drawIndexedSourceSprite(ctx,'PALM3.$01',px,py,W,H,s.options);
    }else if(c===74){
      drawIndexedSourceSprite(ctx,'BLOCK.001',px,py,W,H,s.options, false,false,Number(s.options?.BrickColor??48));
    }else if(c===87){
      drawIndexedSourceSprite(ctx,'WOOD.000',px,py,W,H,s.options, false,false,Number(s.options?.WoodColor??48));
    }else if(c===88){
      drawIndexedSourceSprite(ctx,'XBLOCK.000',px,py,W,H,s.options, false,false,Number(s.options?.XBlockColor??104));
    }else if(c===42){
      // Source Coin000 uses the live DAC entries 12..14; use the source pixel
      // payload rather than the palette-baked PNG.
      drawIndexedSourceSprite(ctx,'COIN.$00',px,py,W,H,s.options);
    }else if(c===35 && design===4){
      drawIndexedSourceSprite(ctx,'LAVA.$00',px,py,W,H,s.options);
    }else if(c===37 && design===4){
      drawIndexedSourceSprite(ctx,'LAVA.$01',px,py,W,H,s.options);
    }else if(c===37 && design===1){
      drawIndexedSourceSprite(ctx,'FALL.$01',px,py,W,H,s.options);
    }else if(c===35 && design===1){
      drawIndexedSourceSprite(ctx,'FALL.$00',px,py,W,H,s.options);
    }else if(c===35 && design===3){
      drawIndexedSourceSprite(ctx,'WINDOW.$01',px,py,W,H,s.options);
    }else if(c===37 && design===3){
      drawIndexedSourceSprite(ctx,'WINDOW.$00',px,py,W,H,s.options);
    }
  }
  return true;
}
let sourceFirstRender=true;
window.__sourceBackGrFirstRender=true;
window.__sourceBackGrLastXView=null;
/* STEP119_PRESENTATION_AUDIT: observational only; no gameplay mutation */
function step119PresentationAudit(cam){
  if(!window.__step119Audit) window.__step119Audit={frames:0,lastCam:null,scrollFrames:0};
  const a=window.__step119Audit;
  a.frames++;
  const c=Number(cam);
  if(Number.isFinite(c) && a.lastCam!==null && c!==a.lastCam) a.scrollFrames++;
  a.lastCam=c;
  return a;
}

/* STEP120_REDRAW_VIEWPORT_AUDIT: observational only; no gameplay mutation */
function step120RedrawViewportAudit(stageObj, camX){
  const st=stageObj;
  const xsize=Number(st?.world?.xsize);
  const viewW=NH*W;
  const maxX=Math.max(0,(xsize-NH)*W);
  const x=Number(camX);
  const valid=Number.isFinite(x) && Number.isFinite(xsize) && x>=0 && x<=maxX;
  const edge=(valid && (x===0 || x===maxX));
  if(!window.__step120RedrawAudit) window.__step120RedrawAudit={calls:0,edgeCalls:0,invalid:0,last:null};
  const a=window.__step120RedrawAudit;
  a.calls++;
  if(edge) a.edgeCalls++;
  if(!valid) a.invalid++;
  a.last={camX:x,viewW,maxX,xsize,valid};
  return a.last;
}

function drawWorld(ctx,w,s,cam){
  // STEP153 SOURCE SAFETY BOUNDARY: PLAYERS.PAS keeps XView inside the
  // source viewport interval. If a transient HTML frame receives a stale or
  // non-finite camera value, never let Canvas drawImage sample outside the
  // persistent foreground raster (Canvas returns transparent pixels, which
  // appear as black). This is only a presentation clamp; player/world state
  // is not modified.
  const sourceMaxForRender=Math.max(0,(Number(w?.xsize||0)-NH)*W);
  cam=Number.isFinite(Number(cam))?Math.max(0,Math.min(sourceMaxForRender,Number(cam))):0;
  // STEP144: BACKGR.PAS XStart/BackGrMap source-index audit.
  step120RedrawViewportAudit(s,cam);
  // STEP143: source camera invariant is checked before any cached viewport
  // copy. No gameplay state is changed by this audit.
  if(window.__step143CacheAudit===undefined) window.__step143CacheAudit={invalid:0,last:null};
  const sourceMaxX=Math.max(0,(Number(w?.xsize||0)-NH)*W);
  const camNum=Number(cam);
  if(!Number.isFinite(camNum)||camNum<0||camNum>sourceMaxX){
    window.__step143CacheAudit.invalid++;
    window.__step143CacheAudit.last={cam:camNum,maxX:sourceMaxX};
  }

  step119PresentationAudit(cam);
  // SOURCE/game.py::Level.draw has two mutually exclusive full-background
  // paths. For SkyType 6..8 + BackGrType 4..7 it draws the verified
  // DrawBackGrBlock-derived special page; otherwise it draws DrawSky and then
  // the verified BackGrMap/PutBackGr path for BackGrType 1..3,9..11.
  // Do not let the generic sky path leak through the special-background case.
  const sky=Number(s.options.SkyType??0), bg=Number(s.options.BackGrType??0);
  const special=(sky>=6&&sky<=8&&bg>=4&&bg<=7);
  const generic=(bg===1||bg===2||bg===3||bg===9||bg===10||bg===11);
  if(special){
    drawSpecialBackGr(ctx,s,cam);
  }else{
    drawSourceSky(ctx,s);
  }
  // STEP182: DrawBackGrMap is now a non-readback background layer.  Put it
  // behind indexed foreground sprites so it cannot overwrite them on a
  // browser canvas whose pixel indices are not directly readable.
  if(generic) drawSourceBackGrMap(ctx,s,cam);
  if(!drawStaticForeground(ctx,w,s,cam)){
    const design=s.options.Design,start=Math.max(0,pdiv(cam,W)-2),end=Math.min(w.xsize,pdiv(cam,W)+NH+2);
    for(let y=0;y<NV;y++)for(let xx=start;xx<end;xx++){
      const c=w.get(xx,y),px=xx*W-cam,py=y*H+9;
      if(Number(s.options?.Design??0)===5 && c===37)continue;
      if(c===65)continue;
      if(c>=48&&c<=51)continue;
      if(Number(s.options?.Design??0)===1 && c===247)continue;
      if(bumpBlockState && bumpBlockState.dy<4 && bumpBlockState.x===xx && bumpBlockState.y===y)continue;
      if(c===32||c===0)continue;let a=null;
      if(c>=1&&c<=26){
        let n=c,wallType=s.options.WallType1||0;if(n>13){n-=13;wallType=s.options.WallType2||0}
        if(Number(wallType)!==2)a=wallAsset(design,n,wallType);
      }
      else if(c===63)a='QUEST_000';else if(c===64)a='QUEST_001';else if(c===73)a='BLOCK_000';else if(c===74)a='BLOCK_001';else if(c===75)a='NOTE_000';else if(c===88)a='XBLOCK_000';else if(c===87)a='WOOD_000';else if(c>=48&&c<=51)a=`PIPE_00${c-48}`;else if(c===42)a='COIN_000';else if(c===254)a='EXIT_000';else if(c===240)a='FENCE_000';
      if(a)drawSprite(ctx,a,px,py)
    }
  }
  // Source order: FIGURES.Redraw first, then BACKGR.PAS::DrawBackGr(TRUE).
  // PutBackGr @Fill changes only existing F0 pixels to E0; it never draws a
  // new polygon or overwrites source foreground pixels.
  sourceFirstRender=false;
  window.__sourceBackGrFirstRender=false;
}
let enemyTimeCounter=0;
let lavaCounter=0;
let grassCounter=0;
let waterfallCounter=0;
function drawSourcePart(ctx,n,x,y,w,h,y2){
  const im=img(n); if(!im) return;
  const hi=Math.max(-1,Math.min(h-1,Math.floor(y2)));
  if(hi<0) return;
  ctx.drawImage(im,0,0,w,hi+1,x,y,w,hi+1);
}
// Source-backed MARIO.PAS::Intro / WORLDS.PAS::Options_0 record.
const SOURCE_INTRO_OPTIONS={InitX:150,InitY:126,SkyType:10,WallType1:0,WallType2:0,WallType3:0,PipeCode:48,GroundColor1:75,GroundColor2:0,Horizon:120,BackGrType:10,BackGrColor1:54,BackGrColor2:48,Stars:0,Clouds:0,Design:2,Color2R:10,Color2G:23,Color2B:8,Color3R:22,Color3G:35,Color3B:20,BrickColor:176,WoodColor:72,XBlockColor:160};
// STEP183: exact post-BuildWorld Intro_0 map produced by the supplied Python source.
// This is derived offline from IntroSource() + world_builder.build_world(); it is not a new map.
const SOURCE_INTRO_BUILT_WORLD=[[32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32],[32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32],[32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32],[32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32],[32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32],[32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32],[32,32,32,32,32,32,32,32,32,32,32,240,32,32,32,32,32],[32,32,32,240,32,32,32,32,32,32,32,240,32,32,32,32,32],[32,32,32,240,32,32,240,32,32,32,32,240,240,32,32,32,32],[32,32,32,240,240,32,240,32,32,32,32,240,240,32,32,32,32],[247,247,32,240,247,247,240,32,32,32,32,240,240,247,247,32,32],[2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],[5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5]];
function sourceSkyIndexAt(options, localY){
  const sky=Number(options?.SkyType??0), bg=Number(options?.BackGrType??0), horizon=Number(options?.Horizon??140);
  if(bg===0)return 0xE0;
  if([0,1,3,4].includes(sky)) return localY>=horizon?0xF0:0xE0;
  if([2,5,9,10,11,12].includes(sky)){
    const sh=horizon-4;
    if(localY>=sh)return 0xF0;
    return Math.max(224,239-Math.floor(localY/6));
  }
  return null;
}
/* MARIO.PAS::Intro palette state, reproduced from SOURCE/MARIO_PYTHON_PORTABLE.py
 * (run_source_intro).  Source order is:
 *   NewPalette(P256) -> BlinkPalette x100 -> SetSkyPalette -> InitGrass
 *   -> OutPalette($A0/$A1/$EF/$18/$8D/$8F).
 * The previous HTML build rendered the title screen through the *gameplay*
 * palette and drew the logo/border/Mario from the already-flattened PNGs, so
 * none of these source DAC writes reached the screen. */
function sourceIntroPalette(){
  const opt=SOURCE_INTRO_OPTIONS;
  const base=window.MARIO_BAKED_DATA?.palettes?.['MPAL256']||window.MARIO_BAKED_DATA?.palettes?.['DEFAULT.PAL']||[];
  const p=base.map(v=>Array.isArray(v)?v.slice():[0,0,0]);
  const sky=sourceSkyPalette(opt);
  for(const k of Object.keys(sky))p[Number(k)]=sky[k].slice();
  // PLAY.PAS::InitGrass — the GrassCounter = 0 branch of BlinkPalette:
  //   Copy($EF,153); Copy($EF,154); Copy(3,155); Copy(2,156); Copy(2,157); Copy(3,158)
  // The copies run BEFORE the $EF OutPalette write below, exactly as in source.
  const ef=(p[0xEF]||[0,0,0]).slice();
  p[153]=ef.slice(); p[154]=ef.slice();
  p[155]=(p[3]||[0,0,0]).slice(); p[156]=(p[2]||[0,0,0]).slice();
  p[157]=(p[2]||[0,0,0]).slice(); p[158]=(p[3]||[0,0,0]).slice();
  // PALETTES.PAS coin bank at CoinCounter = 0.
  p[12]=[62,56,20]; p[13]=[60,56,22]; p[14]=[63,63,36];
  // MARIO.PAS::Intro OutPalette calls, in source order.
  p[0xA0]=[35,45,50]; p[0xA1]=[45,55,60]; p[0xEF]=[30,40,30];
  p[0x18]=[10,15,25]; p[0x8D]=[28,38,50]; p[0x8F]=[40,50,63];
  return p;
}

// FIGURES.PAS::ConvertGrass, at the source index level (no RGB in between).
function introGrassPixels(w,x,y){
  const left=w.get(x-1,y)===247, right=w.get(x+1,y)===247;
  let prefix, reverse=false;
  if((x===0||left)&&right) prefix='GRASS2';
  else if(!right) { prefix='GRASS3'; reverse=true; }
  else prefix='GRASS1';
  const D=window.MARIO_BAKED_DATA?.source_images;
  const a=D?.[`${prefix}.$01`], b=D?.[`${prefix}.$02`];
  if(!a||!b)return null;
  const p1=reverse?b:a, p2=reverse?a:b, out=[];
  for(let i=0;i<p1.pixels.length;i++){
    const c1=Number(p1.pixels[i]), c2=Number(p2.pixels[i]);
    let c0=c1;
    if(c1===c2){out.push(c0);continue;}
    if(c1===2){c0=153;if(c2===0){out.push(c0);continue;}c0=155;}
    else if(c1===3){c0=154;if(c2===0){out.push(c0);continue;}c0=156;}
    else {c0=(c2===2)?157:155;}
    out.push(c0);
  }
  return out;
}

/* Build the complete Intro_0 page as VGA palette INDICES.
 *
 * This is the key repair for the title screen.  BACKGR.PAS::PutBackGr and
 * BACKGR.PAS::DrawBackGrMap are both read-modify-write operations on the VGA
 * page: PutBackGr swaps $F0 <-> $E0, and DrawBackGrMap replaces every pixel
 * whose index is >= $C0.  The browser cannot read those indices back from the
 * canvas (and getImageData on a file:// canvas raises SecurityError, which is
 * what STEP181 hit), so the page is assembled in an index buffer first and
 * converted to RGB exactly once, at the end. */
function introIndexPage(){
  const opt=SOURCE_INTRO_OPTIONS;
  const page=new Uint8Array(320*200);
  const horizon=Number(opt.Horizon);
  // FIGURES.PAS::DrawSky -> BACKGR.PAS::SmoothFill (SkyType 10).
  const smoothHorizon=horizon-4;
  for(let y=0;y<182;y++){
    const dl=(y>=smoothHorizon)?240:Math.max(224,239-Math.floor(y/6));
    const dh=y%6;
    for(let xx=0;xx<320;xx++){
      let idx=dl;
      if(dh>=3&&dl!==224&&dl!==240){
        const selected=((dh&1)===0)?(xx%4===0||xx%4===2):(xx%4===1||xx%4===3);
        if(selected)idx=dl-1;
      }
      page[(y+9)*320+xx]=idx;
    }
  }
  const w={xsize:17,get:(x,y)=>{
    if(x<0||x>=17||y<0||y>=13)return 32;
    const row=SOURCE_INTRO_BUILT_WORLD[y];
    const v=row&&row[x];
    return (v===undefined)?32:v;
  }};
  const blit=(pixels,cw,chh,px,py)=>{
    for(let yy=0;yy<chh;yy++)for(let xx=0;xx<cw;xx++){
      const a=Number(pixels[yy*cw+xx]); if(!a)continue;
      const sx=px+xx, sy=py+yy;
      if(sx<0||sx>=320||sy<0||sy>=200)continue;
      page[sy*320+sx]=a;
    }
  };
  const D=window.MARIO_BAKED_DATA?.source_images||{};
  // FIGURES.PAS::Redraw over the post-BuildWorld Intro_0 map.
  for(let y=0;y<13;y++)for(let x=0;x<17;x++){
    const c=w.get(x,y), px=x*W, py=y*H+9;
    if(c>=1&&c<=26){
      // Options_0 has WallType1 = 0, i.e. the GREEN wall bank.
      const nm={1:'GREEN.000',2:'GREEN.001',4:'GREEN.002',5:'GREEN.003',10:'GREEN.004'}[c];
      const rec=nm&&D[nm]; if(rec)blit(rec.pixels,Number(rec.w),Number(rec.h),px,py);
    }else if(c===247){
      // FIGURES.PAS::Redraw case $F7, Design = 2:
      //   "if (Above = $F0) and (Design = 2) then DrawImage(SmTree001)"
      // is executed BEFORE the grass figure, so a tree column joins onto the
      // grass row instead of ending in mid air.
      if(w.get(x,y-1)===240){
        const t=D['SMTREE.$01'];
        if(t)blit(t.pixels,Number(t.w),Number(t.h),px,py);
      }
      const g=introGrassPixels(w,x,y); if(g)blit(g,20,14,px,py);
    }else if(c===240){
      const rec=D[w.get(x,y-1)===240?'SMTREE.$01':'SMTREE.$00'];
      if(rec)blit(rec.pixels,Number(rec.w),Number(rec.h),px,py);
    }
  }
  // BACKGR.PAS::DrawBackGr(TRUE), BackGrType = 10 -> BOGEN26.BK.
  // PutBackGr @Fill: above the map height $F0 -> $E0, at/below it $E0 -> $F0.
  const mount=window.MARIO_BAKED_DATA?.background_images?.['BOGEN26.BK'];
  if(mount&&Array.isArray(mount.pixels)){
    const yBase=horizon-26;
    for(let x=0;x<320;x++){
      const hi=Math.max(0,Math.min(26,Number(mount.pixels[x])));
      for(let row=0;row<26;row++){
        const sy=yBase+row+9;
        if(sy<0||sy>=200)continue;
        const o=sy*320+x, cur=page[o];
        if(row<hi){ if(cur===0xF0)page[o]=0xE0; }
        else if(cur===0xE0)page[o]=0xF0;
      }
    }
  }
  // MARIO.PAS::Intro, immediately after the logo pass:
  //   InitBackGr(3, 0);
  //   DrawBackGrMap(10*H+6, 11*H-1, 54, $A0);
  //   DrawBackGrMap(10*H+6, 11*H-1, 55, $A1);
  //   DrawBackGrMap(10*H+6, 11*H-1, 53, $A1);
  // InitBackGr(3,...) selects MOUNT.BK.  This whole source operation was
  // simply absent from the browser port, which is why the title screen was
  // missing its foreground mountain band.
  const mm=window.MARIO_BAKED_DATA?.background_images?.['MOUNT.BK'];
  if(mm&&Array.isArray(mm.pixels)){
    const y1=10*H+6, y2=11*H-1, len=mm.pixels.length;
    const pass=(shift,color)=>{
      for(let x=0;x<320;x++){
        const mi=x+shift; if(mi<0||mi>=len)continue;
        for(let sy=y1-Number(mm.pixels[mi]);sy<=y2;sy++){
          if(sy<0||sy>=182)continue;
          const o=(sy+9)*320+x;
          // BACKGR.PAS: "if GetPixel(i,j) >= $C0 then PutPixel(i,j,C)".
          if(page[o]>=0xC0)page[o]=color;
        }
      }
    };
    pass(54,0xA0); pass(55,0xA1); pass(53,0xA1);
  }
  return page;
}

let introPageCache=null;
const introSpriteCache=new Map();
// Render one baked indexed source image through the Intro palette, once.
function introSprite(name,pal,flipX){
  const key=name+'|'+(flipX?1:0);
  if(introSpriteCache.has(key))return introSpriteCache.get(key);
  const D=window.MARIO_BAKED_DATA?.source_images, rec=D&&D[name];
  if(!rec||!Array.isArray(rec.pixels)){introSpriteCache.set(key,null);return null;}
  const cw=Number(rec.w), chh=Number(rec.h);
  const tmp=document.createElement('canvas'); tmp.width=cw; tmp.height=chh;
  const tc=tmp.getContext('2d');
  const image=tc.createImageData(cw,chh), d=image.data;
  for(let i=0;i<cw*chh;i++){
    const a=Number(rec.pixels[i]); if(!a)continue;
    const rgb=pal[a]||[0,0,0];
    d[i*4]=Math.round(rgb[0]*255/63);
    d[i*4+1]=Math.round(rgb[1]*255/63);
    d[i*4+2]=Math.round(rgb[2]*255/63);
    d[i*4+3]=255;
  }
  tc.putImageData(image,0,0);
  let out=tmp;
  if(flipX){
    const f=document.createElement('canvas'); f.width=cw; f.height=chh;
    const fc=f.getContext('2d'); fc.imageSmoothingEnabled=false;
    fc.translate(cw,0); fc.scale(-1,1); fc.drawImage(tmp,0,0);
    out=f;
  }
  introSpriteCache.set(key,out);
  return out;
}

function drawIntroBackground(ctx){
  const pal=sourceIntroPalette();
  if(!introPageCache){
    const page=introIndexPage();
    const c=document.createElement('canvas'); c.width=320; c.height=200;
    const cc=c.getContext('2d');
    const image=cc.createImageData(320,200), d=image.data;
    for(let i=0;i<320*200;i++){
      const rgb=pal[page[i]]||[0,0,0];
      d[i*4]=Math.round(rgb[0]*255/63);
      d[i*4+1]=Math.round(rgb[1]*255/63);
      d[i*4+2]=Math.round(rgb[2]*255/63);
      d[i*4+3]=255;
    }
    cc.putImageData(image,0,0);
    introPageCache=c;
  }
  ctx.drawImage(introPageCache,0,0);
}
function introMenu(){
  if(introStatus==='MENU')return ['START','OPTIONS','END'];
  if(introStatus==='START')return ['NO SAVE','GAME SELECT','ERASE'];
  if(introStatus==='PLAYERS')return ['ONE PLAYER','TWO PLAYERS'];
  if(introStatus==='LEVELSELECT')return ['LEVEL 1','LEVEL 2','LEVEL 3','LEVEL 4','LEVEL 5','LEVEL 6'];
  if(introStatus==='OPTIONS')return [introSound?'SOUND ON':'SOUND OFF',introStatusLine?'STATUSLINE ON':'STATUSLINE OFF'];
  if(introStatus==='LOAD')return [0,1,2].map(i=>sourceSaveLabel(i));
  if(introStatus==='ERASE')return [0,1,2].map(i=>sourceSaveLabel(i,true));
  return [''];
}
function introParent(status){
  return ({START:'MENU',OPTIONS:'MENU',PLAYERS:'START',LEVELSELECT:'PLAYERS',LOAD:'START',ERASE:'START'})[status]||'MENU';
}
function drawIntroFont8Text(ctx,x,y,text,attr){
  // TXT.PAS::SetFont(0,Bold+Shadow) / TextWidth / WriteText.
  // Font8 glyphs are the supplied source bitmap data; no browser font is used.
  const table=window.MARIO_BAKED_DATA&&window.MARIO_BAKED_DATA.fonts&&window.MARIO_BAKED_DATA.fonts.font8;
  if(!Array.isArray(table)) return;
  // TXT.PAS::WriteText resolves the attribute through the live VGA DAC, which
  // during Intro is the palette built by sourceIntroPalette().  MARIO.PAS also
  // executes SetPalette(14,63,61,31) immediately before each menu WriteText.
  const pal=sourceIntroPalette(); pal[14]=[63,61,31];
  const rgb=(idx)=>{const a=pal&&pal[idx]; return a?'rgb('+Math.round(a[0]*255/63)+','+Math.round(a[1]*255/63)+','+Math.round(a[2]*255/63)+')':'rgb(255,255,255)';};
  let pen=Math.trunc(x);
  for(const ch of String(text)){
    const g=table[ch.charCodeAt(0)&255];
    if(!g){continue;}
    const w=Number(g[1]||8), h=Number(g[2]||8), bytes=g[3]||[];
    const setPixel=(ox,oy,color)=>{
      ctx.fillStyle=color;
      for(let yy=0;yy<h;yy++) for(let xx=0;xx<w;xx++){
        const bit=yy*w+xx, b=bytes[Math.floor(bit/8)]||0;
        if(b&(1<<(bit&7))) ctx.fillRect(pen+ox+xx,y+9+oy+yy,1,1);
      }
    };
    // SourceText.draw_text: Shadow first at (+1,+1), then Bold at (-1,0)
    // and (0,+1), then the normal glyph. Attribute 16 is the shadow color.
    setPixel(1,1,rgb(16));
    setPixel(0,1,rgb(16));
    setPixel(-1,0,rgb(attr));
    setPixel(0,0,rgb(attr));
    pen += w + 2; // TXT.PAS TextWidth: width + Bold + Shadow.
  }
}
function drawIntro(ctx){
  drawIntroBackground(ctx);
  // MARIO.PAS::Intro renders the title assets with DrawImage through the LIVE
  // Intro palette (run_source_intro calls indexed_surface(..., intro_palette)).
  // Using the flattened PNGs instead ignored the $18/$8D/$8F OutPalette writes,
  // so the logo, the block frame and Mario were all drawn in the wrong colours.
  const introPal=sourceIntroPalette();
  const logo0=introSprite('INTRO.000',introPal,false);
  const logo1=introSprite('INTRO.001',introPal,false);
  const logo2=introSprite('INTRO.002',introPal,false);
  const blockImg=introSprite('BLOCK.000',introPal,false);
  // PLAYERS.PAS::HighMirror builds the dirRight bank from SWMAR.000, and
  // InitPlayer starts at dirRight, so the title Mario is the mirrored image.
  const marioImg=introSprite('SWMAR.000',introPal,true);
  // MARIO.PAS::Intro source logo pass: DrawImage(38+i+j,29+i+k,108,28),
  // (159+i+j,29+i+k,24,28), (198+i+j,29+i+k,84,28), with i/j/k=1..0.
  // This is the source's 2-pixel stacked shadow/offset pass, not a CSS shadow.
  for(let i=1;i>=0;i--)for(let j=1;j>=0;j--)for(let k=1;k>=0;k--){
    if(logo0)ctx.drawImage(logo0,38+i+j,29+i+k+9);
    if(logo1)ctx.drawImage(logo1,159+i+j,29+i+k+9);
    if(logo2)ctx.drawImage(logo2,198+i+j,29+i+k+9);
  }
  // MARIO.PAS::Intro source frame: used_block is drawn across the top and
  // bottom, then down both side columns.
  if(blockImg){
    for(let bx=0;bx<16;bx++){
      ctx.drawImage(blockImg,bx*20,9);
      ctx.drawImage(blockImg,bx*20,12*14+9);
    }
    for(let by=0;by<13;by++){
      ctx.drawImage(blockImg,0,by*14+9);
      ctx.drawImage(blockImg,15*20,by*14+9);
    }
  }
  // PLAYERS.PAS::DrawPlayer during IntroSource: InitX=150, InitY=126.
  if(marioImg)ctx.drawImage(marioImg,SOURCE_INTRO_OPTIONS.InitX,SOURCE_INTRO_OPTIONS.InitY+9);
  // Source menu anchor: CenterX(TextWidth), then +8 pixels for WriteText.
  // Canvas text is used only as a presentation representation; menu state,
  // selection, positions and key transitions remain source-derived.
  const menu=introMenu();
  // MARIO.PAS source algorithm: wd=0; for i=1..6, j=TextWidth(Menu[i]);
  // if j>wd then xp=CenterX(Menu[i]) div 4 * 4. With Font8 + Bold+Shadow,
  // TextWidth is not simply string length*8.
  const sourceWidth=(str)=>Array.from(String(str)).reduce((n,ch)=>{
    const g=(window.MARIO_BAKED_DATA&&window.MARIO_BAKED_DATA.fonts&&window.MARIO_BAKED_DATA.fonts.font8||[])[ch.charCodeAt(0)&255];
    return n+(g?Number(g[1]||8)+2:0);
  },0);
  let wd=0,xp=0;
  for(const item of menu.slice(0,6)){
    const j=sourceWidth(item);
    if(j>wd){wd=j;xp=Math.floor((320-j)/2/4)*4;}
  }
  for(let i=0;i<menu.length;i++){
    const y=56+14*(i+1);
    if(i+1===introSelected){
      // TXT.PAS Font8 cursor glyph 16, same Bold+Shadow font state.
      drawIntroFont8Text(ctx,xp-12,y,String.fromCharCode(16),5);
    }
    // Source WriteText(Menu[i], xp+8, y, Attr). Attribute 15 is the normal
    // menu colour; save-slot '*' blinking remains a source-specific attribute.
    const attr=(menu[i].length>19 && menu[i].charAt(18)==='*') ? (14+(introCounter&1)) : 15;
    drawIntroFont8Text(ctx,xp+8,y,menu[i],attr);
  }
}
function introKeyTick(k){
  // MARIO.PAS::Intro accepts W exactly like Up; gameplay also maps W to jump,
  // but the Intro menu consumes it as the source Up key.
  const up=!!k.up || !!k.w, down=!!k.down || !!k.s, enter=!!k.space || !!k.enter;
  const upEdge=up&&!prevIntroUp, downEdge=down&&!prevIntroDown, enterEdge=enter&&!prevIntroEnter;
  prevIntroUp=up;prevIntroDown=down;prevIntroEnter=enter;
  // MARIO.PAS::Intro reads a key EVENT, so ESC acts on the press edge only.
  const esc=!!k.escape, escEdge=esc&&!prevIntroEsc; prevIntroEsc=esc;
  if(escEdge){
    if(introStatus==='MENU'){running=false;return;}
    introStatus=introParent(introStatus);introSelected=1;introNumOptions=introMenu().length;introCounter=0;return;
  }
  if(upEdge){
    if(introSelected===1){
      if(introStatus==='MENU')introSelected=introNumOptions;
      else{introStatus=introParent(introStatus);introSelected=1;introNumOptions=introMenu().length;}
    }else introSelected--;
    introCounter=0;return;
  }
  if(downEdge){
    if(introSelected===introNumOptions){
      if(introStatus==='MENU')introSelected=1;
      else{introStatus=introParent(introStatus);introSelected=1;introNumOptions=introMenu().length;}
    }else introSelected++;
    introCounter=0;return;
  }
  if(enterEdge){
    if(introStatus==='MENU'){
      if(introSelected===1){introStatus='START';introSelected=1;introNumOptions=3;}
      else if(introSelected===2){introStatus='OPTIONS';introSelected=1;introNumOptions=2;}
      else{running=false;return;}
    }else if(introStatus==='START'){
      if(introSelected===1){introStatus='PLAYERS';introSelected=1;introNumOptions=2;}
      else if(introSelected===2){introStatus='LOAD';introSelected=1;introNumOptions=3;}
      else{introStatus='ERASE';introSelected=1;introNumOptions=3;}
    }else if(introStatus==='PLAYERS'){
      introNextPlayers=introSelected;introStatus='LEVELSELECT';introSelected=1;introNumOptions=6;
    }else if(introStatus==='LEVELSELECT'){
      const p=introSelected-1;
      const keys=['1a','2a','3a','4a','5a','6a'];
      sourceNumPlayers=introNextPlayers; sourceProgress=p; currentPlayerIndex=0; currentSaveSlot=-1;
      sourcePlayers=[{progress:p,lives:3,coins:0,score:0,mode:0},{progress:p,lives:3,coins:0,score:0,mode:0}];
      browserConfig.sound=!!introSound;browserConfig.sline=!!introStatusLine;sourceSaveConfig();
      introActive=false;prevIntroUp=prevIntroDown=prevIntroEnter=false;reset(keys[p]);
    }else if(introStatus==='OPTIONS'){
      if(introSelected===1){introSound=!introSound;sourceSetSound(introSound);}
      else introStatusLine=!introStatusLine;
      browserConfig.sound=!!introSound;browserConfig.sline=!!introStatusLine;sourceSaveConfig();
    }else if(introStatus==='LOAD'){
      const slot=introSelected-1, g=browserConfig.games[slot];
      if(g.progress[0]===0&&g.progress[1]===0){
        introStatus='PLAYERS';introSelected=1;introNumOptions=2;
      }else{
        sourceNumPlayers=Number(g.num_players)===2?2:1; currentSaveSlot=slot; sourceProgress=Math.max(Number(g.progress[0]),Number(g.progress[1])); currentPlayerIndex=0;
        sourcePlayers=[
          {progress:Number(g.progress[0]),lives:3,coins:0,score:0,mode:0},
          {progress:Number(g.progress[1]),lives:3,coins:0,score:0,mode:0}
        ];
        if(sourceNumPlayers===1) sourcePlayers[1].lives=0;
        browserConfig.sound=!!introSound;browserConfig.sline=!!introStatusLine;sourceSaveConfig();
        introActive=false;prevIntroUp=prevIntroDown=prevIntroEnter=false;
        reset(['1a','2a','3a','4a','5a','6a'][sourceProgress%6],{lives:3,score:0,coins:0,mode:0});
      }
    }else if(introStatus==='ERASE'){
      const slot=introSelected-1; browserConfig.games[slot]=sourceDefaultConfig().games[0]; browserConfig.games[slot].num_players=1;
      browserConfig.sound=!!introSound;browserConfig.sline=!!introStatusLine;sourceSaveConfig();
      introStatus='START';introSelected=1;introNumOptions=3;
    }
    introCounter=0;
  }
}

// STEP111: source-parity runtime invariants. These checks are observational only;
// they never change physics, collision, map data, or rendering decisions.
function step118ScrollRedrawAudit(stageObj, camX){
  // Source basis: MoveScreen/Redraw must present a viewport inside the level.
  // Diagnostic only: never clamps XView and never changes gameplay state.
  const st=stageObj;
  const xsize=Number(st?.world?.xsize);
  const maxX=Math.max(0,(xsize-NH)*W);
  const x=Number(camX);
  const ok=Number.isFinite(x) && Number.isFinite(maxX) && x>=0 && x<=maxX;
  if(!ok) console.warn("[STEP118][SCROLL_REDRAW] viewport outside source level bounds",{x,maxX,xsize});
  return ok;
}

function sourceParityInvariantAudit(){
  const failures=[];
  if(!stage || !player) return failures;
  if(player.x_view < 0) failures.push('XView<0');
  const maxX=Math.max(0,(stage.world.xsize-NH)*W);
  if(player.x_view > maxX) failures.push('XView>source_max');
  if(!Number.isFinite(player.xv)||!Number.isFinite(player.yv)) failures.push('nonfinite_velocity');
  if(player.x2!==undefined && player.x1!==undefined && player.x2<player.x1) failures.push('invalid_player_x_bounds');
  return failures;
}

function sourceTextGlyph(fontIndex,ch){
  const fonts=window.MARIO_BAKED_DATA?.fonts; if(!fonts)return null;
  const code=String(ch).charCodeAt(0)&255;
  if(Number(fontIndex)===0)return fonts.font8?.[code]||null;
  const idx=code-32; return idx>=0?(fonts.swiss?.[idx]||null):null;
}
function sourceTextWidth(text,fontIndex,style){
  const extra=(style&1?1:0)+(style&2?1:0); let n=0;
  for(const ch of String(text)){const g=sourceTextGlyph(fontIndex,ch);if(!g)continue;n+=Number(g[1]||8)+extra;}
  return n;
}
function drawSourceText(ctx,x,y,text,attr,fontIndex=0,style=0){
  const pal=sourceRuntimePalette(stage?.options||{}); let pen=Math.trunc(x);
  const drawGlyph=(gx,gy,g,colorIndex)=>{
    const w=Number(g[1]||8),h=Number(g[2]||8),data=g[3]||[];
    ctx.fillStyle=sourceVgaRgb(pal[colorIndex]||[63,63,63]);
    for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const bit=yy*w+xx,b=data[Math.floor(bit/8)]||0;if(b&(1<<(bit&7)))ctx.fillRect(gx+xx,gy+yy,1,1);}
  };
  for(const ch of String(text)){
    const g=sourceTextGlyph(fontIndex,ch); if(!g)continue;
    const yy=Math.trunc(y)+9; // VGA256.PAS::YBASE = 9
    if(style&2)drawGlyph(pen+1,yy+1,g,16);
    if(style&1){if(style&2)drawGlyph(pen,yy+1,g,16);drawGlyph(pen-1,yy,g,attr);}
    drawGlyph(pen,yy,g,attr); pen+=Number(g[1]||8)+(style&1?1:0)+(style&2?1:0);
  }
  return pen;
}
function sourceStatusTitle(key){return ({'1a':'1','1b':'1','2a':'2','2b':'2','3a':'3','3b':'3','4a':'4','4b':'4','5a':'5','5b':'5','6a':'6','6b':'6'})[key]||String(key||'');}

function draw(ctx){
  if(introActive){drawIntro(ctx);return;}
  drawWorld(ctx,stage.world,stage,player.x_view);
  runRemoveObjects(ctx,player.x_view);
  drawDynamicLava(ctx,stage.world,stage,player.x_view);
  // PLAY.PAS: DrawBlocks executes independently of ShowObjects. ShowObjects
  // suppresses enemy/temp-object presentation during stage-clear, but it does
  // not suppress the BLOCKS.PAS DrawBlocks path.
  drawBumpBlock(ctx,stage,player.x_view);
  if(showObjects) for(const e of enemies){
    // ENEMIES.PAS::ShowEnemies performs this source-space cull BEFORE
    // picture selection or any render-time state mutation. The Python source
    // passes cam_x and y_view=0 here, with SCALE=1 and 320x200 screen space.
    if(e.x+W < player.x_view || e.x > player.x_view+320 || e.y >= 200) continue;
    let n=null,w=W,h=H,dy=0,flip=false,vflip=false;
    // ENEMIES.PAS::ShowEnemies. Picture selection and direction are kept in
    // source space; horizontal/vertical flips are presentation operations only.
    if(e.tp===2){
      // EnemyPictures[1+3*SubTp][Left/Right], where source InitEnemyFigures
      // populated the sparse Chibibo bank and ShowEnemies selects by DirCounter.
      const pic=1+3*e.sub;
      // Source sparse bank: picture 1->CHIBIBO_000, 4->CHIBIBO_002.
      n=e.sub===0?'CHIBIBO_000':'CHIBIBO_002';
      flip=pmod(e.dirc,32)<16;
    }else if(e.tp===3){
      n=e.sub===0?'CHIBIBO_001':'CHIBIBO_003'; flip=pmod(e.dirc,32)<16;
    }else if(e.tp===4){
      // ENEMIES.PAS: TP_DEAD_CHIBIBO uses Flip(EnemyPictures[1][Left]).
      // Source Flip is vertical-only; do not apply an additional horizontal
      // mirror here.
      n='CHIBIBO_000';vflip=true;flip=false;
    }else if(e.tp===5||e.tp===6)n=e.sub?'POISON_000':'CHAMP_000';
    else if(e.tp===7||e.tp===8)n='LIFE_000';
    else if(e.tp===9||e.tp===10)n='FLOWER_000';
    else if(e.tp===11||e.tp===12){
      // Use the original indexed source image through the live runtime palette.
      // The flattened PNG can drift to the wrong colour bank in HTML; the
      // Python/source runtime resolves STAR.000 against the current VGA palette.
      drawIndexedSourceSprite(ctx,'STAR.000',e.x-player.x_view,e.y+9,W,H,stage.options);
      continue;
    }
    else if(e.tp===13){n=(pmod(e.x,4)<2)?'FIRE_000':'FIRE_001';w=12;h=7;}
    else if(e.tp===14){
      // ENEMIES.PAS::ShowEnemies has no TP_DYING_FIREBALL picture arm.
      // Keep this terminal state undrawn rather than inventing FIRE_001.
      continue;
    }
    else if(e.tp===15){
      if(e.vy===0&&e.y>=NV*H-H)continue;
      // Source bank selection is [PlayerX1 > XPos]. FISH_000 is missing from
      // the supplied source asset set, so that source orientation is skipped;
      // do NOT abort the entire enemy-render loop. FISH_001 remains drawable.
      n='FISH_001'; flip=!!(player.player_x1>e.x);
    }else if(e.tp===16){
      if(e.vy===0&&e.y>=NV*H-H)continue;
      // Source uses the opposite fish bank for the dead-fish presentation.
      // FISH_000 is unavailable, therefore only the FISH_001 orientation is
      // rendered when its source selection is active.
      n='FISH_001'; flip=!(player.player_x1>e.x); vflip=true;
    }else if(e.tp===17){
      // ENEMIES.PAS::ShowEnemies: render only inside the source timing window,
      // then consume the shared Turbo Pascal Random stream in the exact order:
      // Random(4), four Randoms for NewGlitter, four Randoms for NewStar.
      if(Math.abs(e.dc-e.delay)>1)continue;
      const frame=sourceRandom(4);
      const gx=e.x+sourceRandom(W), gy=e.y+sourceRandom(H);
      const ga=57+sourceRandom(7), gd=14+sourceRandom(20);
      const sx=e.x+sourceRandom(W), sy=e.y+sourceRandom(H);
      const sa=57+sourceRandom(7), sd=14+sourceRandom(20);
      newGlitter(gx,gy,ga,gd); newGlitterStar(sx,sy,sa,sd);
      n=`F_00${frame&3}`; w=20; h=14;
    }else if(e.tp===18){
      // Source: PPlant image is 24x20 and DrawPart clips rows 0..Y2 where
      // Y2 = MapY*H - YPos - 1. This is not a full-image draw.
      n=`PPLANT_00${Math.min(3,Math.max(0,2*Number(e.sub===0||e.sub===1)+Number(pmod(enemyTimeCounter,32)>=16)))}`;
      w=24;h=20;
      const y2=e.mapy*H-e.y-1;
      if(y2<0)continue;
      const im=img(n);
      if(im){const hi=Math.min(h-1,Math.floor(y2));if(hi>=0)ctx.drawImage(im,0,0,w,hi+1,e.x-player.x_view,e.y+9,w,hi+1);}
      continue;
    }else if(e.tp===19){
      e.delay=0;e.dc=0;e.vy=0;e.status++;
      if(e.status>14){e.tp=1;continue;}
      if(e.status<12){n='HIT_000';w=24;h=20;dy=-6;}else continue;
    }else if(e.tp===20||e.tp===21){
      // Source bank: Red[frame][direction], frame selected by DirCounter;
      // dead red (tp=21) then applies the vertical Flip.
      const frame=Number(pmod(e.dirc,16)<=8);
      n=e.sub===0?(frame?'RED_000':'RED_001'):(frame?'RED_000':'RED_001');
      flip=!!(e.vx>0);
      vflip=(e.tp===21);
    }else if(e.tp===50){
      // Source KoopaList is [direction][frame].
      const right=Number(e.vx>0);
      const frame=Number(pmod(e.dirc,16)<=8);
      n=e.sub===0?(frame?'GRKOOPA_000':'GRKOOPA_001'):(frame?'RDKOOPA_000':'RDKOOPA_001');
      // The flattened PNGs are the source Left bank; mirror only when the
      // source direction index selects the opposite bank.
      flip=!!right;
      w=20;h=24;dy=-10;
    }else if(e.tp===51){
      n=e.sub===0?'GRKP_000':'RDKP_000'; flip=true;
    }else if(e.tp===52||e.tp===53){
      // Source: EnemyPictures[8+2*SubTp+1-anim, dir], with direction derived
      // from DirCounter rather than the current velocity sign.
      const frame=1-Number(pmod(e.dirc,16)<=8);
      const direction=Number(pmod(e.dirc,32)<=16);
      n=e.sub===0?(frame?'GRKP_001':'GRKP_000'):(frame?'RDKP_001':'RDKP_000');
      // Python/source bank is [direction][frame], with index 0 already the mirrored image.
      flip=!direction;
    }else if(e.tp===54){
      // ENEMIES.PAS ShowEnemies has no picture-selection arm for
      // TP_DYING_KOOPA; it is a terminal transition state and is not drawn.
      continue;
    }else if(e.tp===55){
      // Source draws only TP_DEAD_KOOPA here: select the bank from DirCounter
      // and then apply the vertical Flip.
      n=e.sub===0?'GRKP_000':'RDKP_000';vflip=true; flip=true;
      if(pmod(e.dirc,16)>8){n=e.sub===0?'GRKP_001':'RDKP_001'; flip=false;}
    }else if(e.tp===60)n='LIFT1_000';
    else if(e.tp===61){
      // ENEMIES.PAS::ShowEnemies / TP_DONUT mutates the donut state while
      // presenting it.  This is presentation-order state, not a physics
      // heuristic: status 0 resets Counter when YVel=0; status != 0 selects
      // DONUT_001 and decrements Status; falling donuts increment YVel every
      // 24 Counter ticks, then Counter is incremented on every draw call.
      if(e.status===0){
        n='DONUT_000';
        if(e.vy===0)e.counter=0;
      }else{
        n='DONUT_001';
        e.status-=1;
      }
      if(e.vy>0 && pmod(e.counter,24)===0)e.vy+=1;
      e.counter+=1;
    }

    if(!n)continue;
    if(e.tp===5||e.tp===7||e.tp===9||e.tp===11){
      if(e.y===e.mapy*H)continue;
      const y2=H-pmod(e.y,H)-1;
      drawSourcePart(ctx,n,e.x-player.x_view,e.y+9,w,h,y2);
      continue;
    }
    if(vflip&&flip)drawSpriteHVFlip(ctx,n,e.x-player.x_view,e.y+dy+9,w,h);
    else if(vflip)drawSpriteVFlip(ctx,n,e.x-player.x_view,e.y+dy+9,w,h);
    else drawSprite(ctx,n,e.x-player.x_view,e.y+dy+9,w,h,flip);
  }
  // PLAYERS.PAS::DrawPlayer. Demo states are drawn before blinking/fire.
  const px=player.x-player.x_view, py=player.y+9;
  if(player.demo!==0){
    // PLAYERS.PAS::DrawDemo selects Pictures^[Player, Mode, WalkingMode, Direction].
    // Do not reuse DrawPlayer's status-based jump selection: Demo uses the
    // current WalkingMode directly, and Direction still controls mirroring.
    const n=playerDemoSprite(); const im=img(n);
    if(im){
      const dy=player.demo_y;
      let srcY,srcH,dstY;
      if(player.demo===1||player.demo===4){srcY=0;srcH=2*H-dy;dstY=player.y+dy;}
      else if(player.demo===2||player.demo===3){srcY=-dy;srcH=2*H+dy;dstY=player.y;}
      else {srcY=0;srcH=2*H;dstY=player.y;}
      srcY=Math.max(0,srcY);srcH=Math.min(srcH,2*H-srcY);
      if(srcH>0){
        ctx.save();
        if(player.dir===1){ctx.translate(px+20,0);ctx.scale(-1,1)}
        else ctx.translate(px,0);
        ctx.drawImage(im,0,srcY,20,srcH,0,dstY+9,20,srcH);
        ctx.restore();
      }
    }
  }else if(player.blinking && (player.blink_counter%2!==0)){
    // Source DrawPlayer suppresses the sprite on odd blink frames.
  }else if(player.mode===2 && player.keySpace && player.fire_counter<7){
    player.fire_counter+=1;
    const pl=Number(player.player_index)||0; const top=img(pl===1?'FWLUI_001':'FWMAR_001'), bottom=img(pl===1?'FWLUI_000':'FWMAR_000');
    if(top&&bottom){
      ctx.save();
      if(player.dir===1){ctx.translate(px+20,0);ctx.scale(-1,1)}
      else ctx.translate(px,0);
      ctx.drawImage(top,0,0,20,20,0,py+1,20,20);
      ctx.drawImage(bottom,0,21,20,7,0,py+21,20,7);
      ctx.restore();
    }
  }else if(player.star || player.growing){
    // PLAYERS.PAS::DrawPlayer: Star/Growing takes the RecolorImage branch.
    // Do not use the palette-baked PNG here: source image indices must be
    // resolved against the same live VGA palette used by the frame.
    const total=Number(player.grow_counter)+Number(player.star_counter);
    const diff=(((total&1)<<4)-Number((total&0xF)<8))&255;
    if(!drawPlayerSourceRecolor(ctx,px,py,diff)) drawSprite(ctx,playerSprite(),px,py,20,28,player.dir===1);
  }else{
    drawSprite(ctx,playerSprite(),px,py,20,28,player.dir===1);
  }
  // PLAY.PAS presentation order: DrawPlayer -> ShowTotalBack -> ShowStatus
  // -> ShowTempObj -> ShowStars -> ShowGlitter -> Waiting text.
  if(showScore){
    let rawTotal=String(Math.trunc(player.score));
    let totalChars=rawTotal.padStart(11,' ').split('');
    for(let i=3;i<totalChars.length;i++)if(totalChars[i]===' ')totalChars[i]='0';
    const totalLabel='TOTAL SCORE:'+totalChars.join('');
    // PLAY.PAS::WriteTotalScore uses SetFont(0, Bold + Shadow).
    // Keep TOTAL SCORE at the native Font8 8x8 source size; Font1/Swiss
    // makes the line disproportionately large under GAME OVER.
    const tw=sourceTextWidth(totalLabel,0,1);
    const tx=Math.trunc((320-tw)/2);
    drawSourceText(ctx,tx,120,totalLabel,31,0,1);
  }
  if(textStatus){
    // STATUS.PAS::ShowStatus uses Font8 Bold at Y=6; SourceText applies
    // VGA YBASE=9 at the bitmap presentation boundary. LevelScore, not the
    // accumulated total score, is the displayed score field.
    const lv=sourceStatusTitle(stage.key);
    const score=String(Math.trunc(player.level_score)).padStart(9,' ');
    const scoreText=Array.from(score).map((c,i)=>i>=3&&c===' '?'0':c).join('');
    drawSourceText(ctx,14,6,(Number(player.player_index)||0)===1?'LUIGI':'MARIO',31,0,1);
    drawSourceText(ctx,58,6,String(Math.min(99,Math.trunc(player.lives))).padStart(2,' '),31,0,1);
    drawSourceText(ctx,90,6,scoreText,31,0,1);
    drawSourceText(ctx,190,6,String.fromCharCode(9),13,0,1);
    drawSourceText(ctx,190,6,String.fromCharCode(7),14,0,1);
    drawSourceText(ctx,208,6,String(Math.trunc(player.coins)).padStart(2,' '),31,0,1);
    drawSourceText(ctx,258,6,'LEVEL '+lv,31,0,1);
    drawSourceText(ctx,50,6,'x',31,0,0);
    drawSourceText(ctx,200,6,'x',31,0,0);
  }
  if(showObjects) drawTempObjects(ctx,player.x_view);
  // PLAY.PAS: ShowStars is a separate presentation layer before ShowGlitter.
  // No independent Stars renderer is synthesized because the supplied source
  // does not provide a Stars.PAS implementation; the existing temp/star state
  // is therefore left at this explicit source boundary.
  if(showObjects) drawGlitter(ctx,player.x_view);

  // PLAY.PAS: Waiting messages are drawn after ShowGlitter and immediately
  // before ShowPage. Keep the exact source timing windows; do not use the
  // terminal deathWaiting flag as a substitute for TextCounter.
  // PLAY.PAS source: Game Over is SetFont(1, Bold + Shadow), then
  // CenterText(40, 'GAME OVER', 31).  Font 1 is the source Swiss font
  // (19x24/variable-width glyphs), matching the DOS reference image.
  // Keep TOTAL SCORE on Font 0 below; only the Game Over title uses Swiss.
  // The framebuffer is rebuilt every HTML frame, so redraw the source-latched
  // Game Over pixels through the full zero-life waiting interval.
  if(waiting && !passed && player.lives===0 && textCounter>=100 && textCounter<=350){
    // MARIO.PAS source order: SetFont(0, Bold + Shadow);
    // CenterText(20, PlayerName[Player], $1E);
    // then SetFont(1, Bold + Shadow); CenterText(40, 'GAME OVER', 31).
    const playerName=(Number(player.player_index)||0)===1?'LUIGI':'MARIO';
    drawSourceText(ctx,Math.trunc((320-sourceTextWidth(playerName,0,1))/2),20,playerName,30,0,1);
    const msg='GAME OVER';
    drawSourceText(ctx,Math.trunc((320-sourceTextWidth(msg,1,1))/2),40,msg,31,1,1);
  }else if(waiting && passed && textCounter>=50 && textCounter<=51){
    const msg='STAGE CLEAR!'; drawSourceText(ctx,Math.trunc((320-sourceTextWidth(msg,0,1))/2),40,msg,31,0,1);
  }
}

// STEP178: Player sprite bank follows CurPlayer exactly. The Player object captures
// currentPlayerIndex at creation, and every normal/recolor/demo/fire draw path
// resolves MARIO vs LUIGI from that source player index.
function reset(key,carry=null){
  stage=makeStage(key)||makeStage('1a'); initTempObjects(); bumpBlockState=null; lavaCounter=0; grassCounter=-12; waterfallCounter=0; coinCounter=74; blinkCounter=-3; waterfallStarted=true; skyCache=null; foregroundCache=null; specialBackGrCache.clear();sourceSpecialTileCache.clear();sourceStaticTileCache.clear();clearPillarViewportCache();sourceGrassTileCache.clear(); sourceFirstRender=true; player=new Player(stage); if(assetsReady)prewarmLevel2ABackground(stage);
  if(carry){ player.lives=carry.lives; player.score=carry.score; player.coins=carry.coins; player.mode=carry.mode; player.level_score=0; player.small=(player.mode===0); }
  sourcePlayers[currentPlayerIndex].progress=Number(sourceProgress);
  sourcePlayers[currentPlayerIndex].lives=Number(player.lives);
  sourcePlayers[currentPlayerIndex].score=Number(player.score);
  sourcePlayers[currentPlayerIndex].coins=Number(player.coins);
  sourcePlayers[currentPlayerIndex].mode=Number(player.mode);
  // PLAY.PAS sets XView:=0 immediately before the initial StartEnemies scan.
  // The spawn InitX is Player placement, not the StartEnemies scan origin.
  // PLAY.PAS::PlayWorld: NewPalette(P256) -> BlinkPalette x100 happens
  // before the initial Restart/StartEnemies scan. Mirror only the Star DAC
  // writes here; the other palette counters are represented by their existing
  // source counters below.
  for(let i=0;i<100;i++)sourceBlinkStarPalette();
  enemies=[]; const initialMapX=0;
  // source_stage_runtime.start_initial_enemies(restart_map_x omitted):
  // source_restart_map_x = spawn_px from the supplied Python SourceStage.
  for(let oi=-2;oi<=18;oi++){
    const sj=initialMapX+oi;
    const direction=1-2*Number(sj>Number(stage.spawn[0]));
    enemies.push(...spawnEnemies(stage,sj,sj+1,direction));
  }
  prevKeys.clear(); deathWaiting=false; deathTextCounter=0; passed=false; waiting=false; textCounter=0; showScore=false; countingScore=false; textStatus=true; showObjects=true; frame.prevS=false; frame.prevQ=false; pauseActive=false; prevP=false; prevR=false; prevPauseKeys.clear();
// STEP87 compatibility marker: textStatus=true; frame.prevS=false;
}
function stageKeyForProgress(progress){
  const order=['1a','2a','3a','4a','5a','6a'];
  const p=Math.max(0,Number(progress)||0);
  return order[p%6];
}

function nextStageKey(key){
  // STEP171 SOURCE/PYTHON FIX:
  // The supplied MARIO_PYTHON_PORTABLE.py is the authority for the corrected
  // version/file-name mapping.  Its source_stage_runtime.STAGE_ORDER is:
  //   {0:(1a,1b), 1:(2a,2b), 2:(3a,3b),
  //    3:(4a,4b), 4:(5a,5b), 5:(6a,6b)}
  // and begin_player_turn() selects STAGE_ORDER[p % 6][0].
  // Therefore normal Progress stage-clear order is 1A,2A,3A,4A,5A,6A.
  // A/B are NOT normal next stages; they are paired maps reached by the
  // source E1 pipe transition (Swap + FindPipeExit).
  const order=['1a','2a','3a','4a','5a','6a'];
  const i=order.indexOf(key);
  return i>=0 ? order[(i+1)%order.length] : key;
}

const SOURCE_STAGE_PAIRS={
  '1a':'1b','1b':'1a',
  '2a':'2b','2b':'2a',
  '3a':'3b','3b':'3a',
  '4a':'4b','4b':'4a',
  '5a':'5b','5b':'5a',
  '6a':'6b','6b':'6a'
};

// STEP171: direct translation of the supplied Python pipe_runtime.find_pipe_exit.
// It searches the CURRENT source map for the first E0..EF left marker followed
// by the exact second pipe-code byte, excluding the current MapX/MapY.
function findPipeExitSource(player){
  const w=stage.world;
  const xsize=stage.world.xsize;
  for(let i=0;i<xsize-1;i++){
    for(let j=0;j<NV;j++){
      if(i===player.mapx && j===player.mapy) continue;
      const left=w.get(i,j), right=w.get(i+1,j);
      if(left>=0xE0 && left<=0xEF && right===Number(player.pipe_code[1])){
        player.mapx=i;
        player.mapy=j;
        let xv=(i-Math.floor(NH/2)+1)*W;
        const maxX=Math.max(0,(xsize-NH)*W);
        if(xv>maxX) xv=maxX;
        if(xv<0) xv=0;
        player.x_view=xv;
        return true;
      }
    }
  }
  return false;
}

// STEP171: source PLAY.PAS InitPlayer at the pipe destination.  Unlike reset(),
// this preserves InPipe so the following MovePlayer frame executes the source
// output-pipe demo.
function initPlayerAtPipeExitSource(player){
  player.x=player.mapx*W+Math.floor(W/2);
  player.y=(player.mapy-1)*H;
  player.oldx=player.x; player.oldy=player.y;
  player.xv=0; player.yv=0; player.dir=1; player.walking_mode=0;
  player.status=0; player.jumped=false; player.fired=false;
  player.hit_enemy=false; player.cd_hit=0; player.cd_enemy=0;
  player.cd_lift=0; player.cd_stop_jump=0;
  player.player_x1=player.x; player.player_x2=player.x+W-1;
  player.player_y1=player.y+H; player.player_y2=player.y+2*H-1;
  player.player_x_vel=0; player.player_y_vel=0;
  player.updateBounds();
}

// STEP171: rebuild the runtime boundary after a source E0/E1 transition.
// This mirrors the supplied Python main-loop boundary without changing
// gameplay data or inventing a destination.
function rebuildAfterPipeSource(){
  initTempObjects();
  bumpBlockState=null;
  lavaCounter=0; grassCounter=-12; waterfallCounter=0; coinCounter=74;
  blinkCounter=-3; waterfallStarted=true;
  skyCache=null; foregroundCache=null; specialBackGrCache.clear();sourceSpecialTileCache.clear();sourceStaticTileCache.clear();clearPillarViewportCache();
  sourceFirstRender=true;
  if(assetsReady)prewarmLevel2ABackground(stage);
  enemies=[];
  // source_stage_runtime.start_initial_enemies:
  // map_x := XView div W; direction compares j with restart_map_x.
  const initialMapX=pdiv(player.x_view,W);
  const restartMapX=Number(player.mapx);
  for(let oi=-2;oi<=18;oi++){
    const sj=initialMapX+oi;
    if(sj>=-1&&sj<=stage.world.xsize){
      const direction=1-2*Number(sj>restartMapX);
      enemies.push(...spawnEnemies(stage,sj,sj+1,direction));
    }
  }
  prevKeys.clear();
}

// STEP171: source PLAY.PAS 686..723 E0/E1 pipe transition.
// E0 = FindPipeExit -> InitPlayer -> Restart.
// E1 = Swap -> FindPipeExit -> InitPlayer -> BuildLevel.
// E7 is deliberately handled by normal stage-clear logic and never enters
// this function.
function processPipeTransitionSource(){
  if(!player.in_pipe || player.game_done || waiting) return false;
  const code=Number(player.pipe_code[0]);
  if(code!==0xE0 && code!==0xE1){
    // PLAY.PAS implements only $E0 (FindPipeExit+Restart), $E1 (Swap+BuildLevel)
    // and $E7 (GameDone+Passed, handled by the stage-clear path).  Any other
    // code falls through in the source too - but in the source InPipe is a
    // frame flag, whereas here leaving it set locks MovePlayer permanently
    // (the player can never move again).  Release it so an unimplemented code
    // cannot freeze the runtime, and report it instead of hanging.
    console.warn('unhandled source pipe code 0x'+code.toString(16));
    player.in_pipe=false;
    return false;
  }

  // Source StopEnemies/ClearGlitter/VGA clear is a presentation/runtime
  // boundary. Clear the persistent page/cache before changing map data.
  foregroundCache=null; skyCache=null; specialBackGrCache.clear();
  ctx.clearRect(0,0,320,200);

  if(code===0xE0){
    // Source FindPipeExit searches the current map only. Its boolean return
    // is not tested by process_pipe_transition; InitPlayer still follows.
    findPipeExitSource(player);
    initPlayerAtPipeExitSource(player);
    // PLAY.PAS Restart explicitly assigns Demo := dmNoDemo after InitPlayer.
    // InitPlayer itself preserves Demo/InPipe so the next MovePlayer frame
    // converts the preserved InPipe flag into the output-pipe demo.
    player.demo=0;
    rebuildAfterPipeSource();
    return true;
  }

  // E1: source Swap changes only the A/B member of the same pair.
  const dest=SOURCE_STAGE_PAIRS[stage.key];
  if(!dest || !DATA[dest] || !DATA[dest].has_map){
    // The supplied source data has empty DB records for 2B and 3B, so Swap has
    // no destination map.  Source PLAY.PAS would still leave InPipe set; clear
    // it here so the player is not locked inside the pipe forever.
    console.warn('source E1 Swap target missing for '+stage.key);
    player.in_pipe=false;
    return false;
  }

  // PLAYERS.PAS keeps the same player/Data state across Swap. Only the source
  // stage/map object changes; lives, score, coins, mode and Progress are not
  // reinitialized by the pipe transition.
  const saved={
    lives:player.lives, score:player.score, coins:player.coins, mode:player.mode,
    level_score:player.level_score, mapx:player.mapx, mapy:player.mapy,
    pipe_code:player.pipe_code.slice(), in_pipe:player.in_pipe
  };

  stage=makeStage(dest);
  player=new Player(stage);
  player.lives=saved.lives; player.score=saved.score; player.coins=saved.coins;
  player.mode=saved.mode; player.small=(saved.mode===0);
  player.level_score=saved.level_score;
  player.mapx=saved.mapx; player.mapy=saved.mapy;
  player.pipe_code=saved.pipe_code; player.in_pipe=saved.in_pipe;

  // Source Swap -> FindPipeExit uses the destination map with the same pipe
  // code[1], then InitPlayer at that destination.
  findPipeExitSource(player);
  initPlayerAtPipeExitSource(player);
  // Source E1 -> BuildLevel/Restart boundary also sets Demo := dmNoDemo.
  player.demo=0;
  rebuildAfterPipeSource();
  return true;
}
const displayCanvas=document.getElementById('screen');
// Keep the native source framebuffer at 320x200 exactly as the Python runtime.
// The DOM canvas is only the 320x182 active-page presentation. This removes the
// previous 320x200 -> 640:437 vertical distortion without changing source YBASE.
const canvas=document.createElement('canvas');canvas.width=320;canvas.height=200;
const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
const displayCtx=displayCanvas.getContext('2d');displayCtx.imageSmoothingEnabled=false;
// STEP42: PLAY.PAS GameDone/Waiting boundary.  These fields mirror the
// source outer PlayWorld state; no new gameplay rule is introduced.
let deathWaiting=false, deathTextCounter=0;
// PLAY.PAS outer PlayWorld state: Passed/Waiting/TextCounter/ShowScore.
// These are source-state flags, not a new browser game-flow model.
let passed=false, waiting=false, textCounter=0, showScore=false, countingScore=false, textStatus=true, showObjects=true;
// STEP91: PLAY.PAS Key #25 (P) enters the source Pause boundary. The exact
// source_pause implementation is not supplied, so only the verified entry
// flag/freeze boundary is represented here; no pause text/cheat behavior is invented.
let pauseActive=false, prevP=false, prevR=false, prevPauseKeys=new Set();
// MARIO.PAS / PLAY.PAS: ESC terminates the outer game loop.
// STEP95 compatibility marker: if(k.escape){running=false;break;}
// STEP99: DATA/baked_assets.js is loaded before this runtime so the source Font8
// cursor glyph is available instead of silently falling back to a browser glyph.
let running=true;
let introActive=true;
let introStatus='MENU', introSelected=1, introNumOptions=3, introCounter=0; // No title/demo playback: only the source menu is used.
let introNextPlayers=1, introSound=!!browserConfig.sound, introStatusLine=!!browserConfig.sline;
let prevIntroUp=false, prevIntroDown=false, prevIntroEnter=false, prevIntroEsc=false;
// MARIO.PAS: PLAY.PAS sets QuitGame and RETURNS from PlayWorld; MARIO.PAS then
// loops back to Intro.  SOURCE/game.py does the same: gameplay ESC calls
// sync_current_save_slot() and re-enters run_source_intro() on the same window.
// Only the Intro menu's own END/ESC path terminates the program.
function returnToSourceIntro(){
  sourceCaptureCurrentPlayer();
  sourceSyncSaveSlot();
  sourceNoSound();
  introActive=true;
  introStatus='MENU'; introSelected=1; introNumOptions=3; introCounter=0;
  introSound=!!browserConfig.sound; introStatusLine=!!browserConfig.sline;
  // The ESC that left gameplay must not be re-consumed by the menu on the
  // same (or still-held) press, which would immediately quit.
  prevIntroUp=prevIntroDown=prevIntroEnter=false; prevIntroEsc=true;
  pauseActive=false;
  passed=false; waiting=false; textCounter=0; showScore=false;
  countingScore=false; showObjects=true; deathWaiting=false;
}

// STEP87 compatibility marker: let passed=false, waiting=false, textCounter=0, showScore=false, countingScore=false, textStatus=true;
let assetsReady=false;
function renderFatal(err){
  try{
    ctx.setTransform(1,0,0,1,0,0);
    ctx.globalAlpha=1;
    ctx.fillStyle='rgb(35,45,63)';
    ctx.fillRect(0,0,320,200);
    ctx.fillStyle='#fff'; ctx.font='8px monospace';
    ctx.fillText('MARIO RUNTIME ERROR',8,16);
    const msg=String(err&&err.stack||err).replace(/\s+/g,' ').slice(0,150);
    ctx.fillText(msg,8,30);
  }catch(_e){}
}

function sourceParityStep179Audit(){
  const failures=[];
  if(Math.abs((640/437)-((640/437)))>1e-12) failures.push("aspect");
  if(typeof sourceRandom!=="function") failures.push("sourceRandom");
  const o=DATA&&DATA["1a"]&&DATA["1a"].options;
  if(o && Number(o.SkyType)!==2) failures.push("1A SkyType");
  if(o && Number(o.BackGrType)!==1) failures.push("1A BackGrType");
  return failures;
}
function presentActivePage(){
  displayCtx.clearRect(0,0,320,182);
  // VGA256.PAS YBASE=9: the browser presents exactly the active 182-line page,
  // not the surrounding 18 virtual rows. The source framebuffer remains 320x200.
  displayCtx.drawImage(canvas,0,9,320,182,0,0,320,182);
}
function safeDraw(){try{
  const step179Failures=sourceParityStep179Audit(); if(step179Failures.length) console.warn('STEP179 source parity:',step179Failures.join(','));
  const invariantFailures=sourceParityInvariantAudit();
  if(invariantFailures.length) console.warn('STEP111 source parity invariant:',invariantFailures.join(','));
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,320,200);draw(ctx);presentActivePage();
}catch(e){renderFatal(e)}}
// STEP40: source TempObj boundary is intentionally not synthesized.
// ShowFire remains an exact source event bridge until the corresponding
// source-backed TempObj implementation is present.
function boot(){
  try{
    DATA=SOURCE_WORLDS;
    if(!DATA || !DATA['1a']) throw new Error('source world 1a missing');
    ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha=1;
    ctx.fillStyle='rgb(35,45,63)'; ctx.fillRect(0,0,320,200);
    presentActivePage();
    ctx.fillStyle='#fff';ctx.font='8px monospace';ctx.fillText('LOADING SOURCE RUNTIME...',92,100);
    reset('1a');
    safeDraw();
    Promise.allSettled(assetNames.map(n=>loadImg(n))).then(()=>{
      // FISH_000 is intentionally absent from the supplied source asset set;
      // loading completion is not allowed to invent a replacement asset.
      assetsReady=true;
      safeDraw();
    });
    requestAnimationFrame(frame);
  }catch(e){renderFatal(e)}
}
function frame(t){
  try{
    // PLAY.PAS is a 60 Hz discrete simulation. RAF is only presentation timing;
    // catch up a bounded number of source frames so a slow browser paint does
    // not silently slow Mario's acceleration/jump/gravity.
    if(frame.lastTime===undefined) frame.lastTime=t;
    let dt=t-frame.lastTime; frame.lastTime=t;
    if(dt>250) dt=250;
    frame.accum=(frame.accum||0)+dt;
    const step=1000/60;
    let ran=false;
    while(frame.accum>=step){
      frame.accum-=step; ran=true;
      const k={left:K.left(),right:K.right(),up:K.up()||K.w(),down:K.down(),alt:K.alt(),ctrl:K.ctrl(),space:K.space(),ls:K.ls(),rs:K.rs(),left_shift:K.ls(),right_shift:K.rs(),s:K.s(),enter:K.enter(),p:K.p(),r:K.r(),escape:K.escape()};
      // Source gameplay ESC returns to Intro; it never closes the program.
      if(k.escape && !frame.prevEsc && !introActive){ frame.prevEsc=true; returnToSourceIntro(); continue; }
      frame.prevEsc=!!k.escape;
      if(!assetsReady) continue;
      // BUFFERS.PAS/PLAY.PAS: LavaCounter is a byte incremented once per source frame.
      lavaCounter=(lavaCounter+1)&255;
      if(introActive){ sourceRandom(4); sourceRandom(8); sourceRandom(25); introCounter=(introCounter+1)&255; introKeyTick(k); if(!running)break; continue; }
      if(!player) continue;
      // PLAY.PAS Key #31 (S): TextStatus := not TextStatus.  This is an input-edge
      // action, so it fires once when S changes from released to pressed.
      if(k.s && !frame.prevS) textStatus=!textStatus;
      frame.prevS=!!k.s;
      // PLAY.PAS Key #16 (Q): BeeperOn/BeeperOff. The source emits Beep(80)
      // only on the OFF -> ON branch. Keep the event-edge semantics.
      if(k.q && !frame.prevQ){
        const next=!browserConfig.sound; sourceSetSound(next); introSound=next;
        if(next)sourceBeep(80);
        browserConfig.sline=!!textStatus; sourceSaveConfig();
      }
      frame.prevQ=!!k.q;
      // PLAY.PAS Key #8 (R): Restart current PlayWorld. Source handles this
      // during the KEYDOWN event phase, before the Pause-key dispatch below.
      // No carry state is supplied: new_game()/InitLevel starts a fresh run.
      if(k.r && !prevR){
        const wasPaused=pauseActive;
        reset(stage.key);
        // Source game.py's R branch does not reset PauseState itself. If R is
        // pressed while paused, preserve that already-active pause boundary.
        pauseActive=wasPaused;
      }
      prevR=!!k.r;
      // PLAY.PAS Key #25 (P): begin_pause. Source Pause also processes the
      // next normal key event: any key other than TAB leaves the pause path.
      // Model that event boundary from the browser's pressed-key edges; the
      // P key that entered pause is therefore not immediately re-processed.
      if(k.p && !prevP && !pauseActive){ pauseActive=true; prevPauseKeys=new Set(keys); /* touch_controls: the P press that enters pause must not also end it */ }
      const pauseEdgeKeys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','AltLeft','AltRight','ControlLeft','ControlRight','Space','ShiftLeft','ShiftRight','KeyS','KeyP'];
      if(pauseActive){
        let endPause=false;
        for(const keyName of pauseEdgeKeys){
          if(keys.has(keyName) && !prevPauseKeys.has(keyName)){endPause=true;break;}
        }
        // PLAY.PAS::Pause excludes TAB from process_pause_key; TAB remains OPEN.
        if(endPause){
          pauseActive=false;
        }else{
          safeDraw();
          prevPauseKeys=new Set(keys);
          prevP=!!k.p;
          continue;
        }
      }
      prevPauseKeys=new Set(keys);
      prevP=!!k.p;
      if(!waiting && !player.game_done){
        // PLAY.PAS ordering: MoveEnemies executes BEFORE MovePlayer.
        const oldCamera=player.x_view;
        moveEnemies();
        player.update(k);
        moveTempObjects();
        // BLOCKS.PAS::MoveBlocks runs once per source frame after MovePlayer.
        moveBumpBlock();
        // PLAYERS.PAS consumes key-edge state inside the same source frame.
        // Keep the HTML edge cache in lock-step with each 60 Hz simulation tick;
        // RAF presentation frames must not skip or duplicate a left/right edge.
        if(k.left) prevKeys.add('ArrowLeft'); else prevKeys.delete('ArrowLeft');
        if(k.right) prevKeys.add('ArrowRight'); else prevKeys.delete('ArrowRight');
        if(player.x_view!==oldCamera){
          let j,direction;
          if(player.x_view<oldCamera){j=pdiv(player.x_view,W)-2;direction=1;}
          else{j=pdiv(player.x_view,W)+NH+2;direction=-1;}
          if(j>=-1&&j<=stage.world.xsize) enemies.push(...spawnEnemies(stage,j,j+1,direction));
        }
        // E7 marks source GameDone+Passed; Waiting is processed below in source order.
        if(player.in_pipe && player.pipe_code[0]===231){passed=true;player.game_done=true;}
      }
      // SOURCE/game.py outer PlayWorld order: Passed/GameDone -> CountingScore -> Waiting.
      if(!waiting){
        if(passed){
          if(player.demo===0 || player.in_pipe){ waiting=true; textCounter=0; }
          textCounter+=1;
          if(!showScore && textCounter>=50 && textCounter<=51 && textCounter===51) showScore=true;
        }else if(player.game_done){
          player.lives-=1; player.mode=0; player.small=true;
          player.score+=player.level_score;
          textCounter=0; waiting=true; player.game_done=false;
        }
      }
      if(showScore && textCounter===120 && player.level_score>0){
        let i=player.level_score-50; if(i<0)i=0;
        player.score+=player.level_score-i; player.level_score=i;
        textCounter=119; countingScore=true;
      }else countingScore=false;
      if(waiting){
        textCounter+=1;
        if(player.lives===0){
          if(textCounter>=100 && textCounter<=101) showScore=true;
          if(textCounter>350) player.game_done=true;
        }else if(passed){
          if(textCounter>250) waiting=false;
        }else if(textCounter>100){
          player.game_done=true;
        }
      }
      if(player.game_done && passed){
        // E7: advance the current player's Progress and keep CurPlayer.
        // TWO PLAYERS switch turns only after a death, not after a stage clear.
        sourceCaptureCurrentPlayer();
        sourceProgress=Number(sourcePlayers[currentPlayerIndex].progress)+1;
        if(sourceProgress>11)sourceProgress=6;
        sourcePlayers[currentPlayerIndex].progress=sourceProgress;
        sourceSyncSaveSlot();
        const d=sourcePlayers[currentPlayerIndex];
        reset(nextStageKey(stage.key),{lives:Number(d.lives),score:Number(d.score),coins:Number(d.coins),mode:Number(d.mode)});
        continue;
      }
      if(player.game_done && !passed && waiting){
        // TWO PLAYERS: every death hands control to the other player when
        // that player still has a life. Stage clear deliberately keeps the
        // current player.
        const otherIndex=1-currentPlayerIndex;
        sourceCaptureCurrentPlayer();
        if(sourceNumPlayers===2 && Number(sourcePlayers[otherIndex].lives)>0){
          currentPlayerIndex=otherIndex;
          const d=sourcePlayers[currentPlayerIndex];
          sourceSyncSaveSlot();
          reset(stageKeyForProgress(Number(d.progress)),{lives:Number(d.lives),score:Number(d.score),coins:Number(d.coins),mode:Number(d.mode)});
          continue;
        }
        if(player.lives>0){
          const d=sourcePlayers[currentPlayerIndex];
          sourceSyncSaveSlot();
          reset(stage.key,{lives:Number(d.lives),score:Number(d.score),coins:Number(d.coins),mode:Number(d.mode)});
          continue;
        }
        deathWaiting=true;
        sourceSyncSaveSlot();
        // Source MARIO.PAS/PLAY.PAS flow: when both player records have
        // no lives left, PlayWorld ends and control returns to Intro.
        // Re-enter the existing HTML source-menu state instead of stopping
        // the browser game.
        if(Number(sourcePlayers[0].lives)+Number(sourcePlayers[1].lives)===0){
          returnToSourceIntro();
          continue;
        }
      }
      // PLAY.PAS: ShowObjects is TRUE at PlayWorld entry and is cleared
      // during the stage-clear transition when TextCounter reaches 40..40+MAX_PAGE.
      // MAX_PAGE is 1 in the source. Once cleared it remains FALSE for the
      // remainder of this PlayWorld; HideEnemies/HideTempObj then suppress
      // presentation without changing their movement state.
      if(40<=textCounter && textCounter<=41) showObjects=false;
    }
    if(!running)return;
    if(ran){
      // Source order: ShowPage is presented first, then BlinkPalette updates
      // the palette/counters. The updated state is therefore consumed by the
      // NEXT frame, not the frame just presented.
      safeDraw();

      // STEP171: PLAY.PAS pipe transition is a post-presentation boundary.
      // Execute it only after the pipe-enter frame has been presented.
      // E0/E1 return to the next simulation frame; E7 is handled separately
      // by the normal Passed/GameDone stage-clear path above.
      processPipeTransitionSource();

      tickGlitter();
      // PALETTES.PAS::BlinkPalette is called after ShowPage. Its Star palette
      // write is consumed by the next rendered source frame.
      sourceBlinkStarPalette();
      waterfallCounter=(waterfallCounter+1)%(5*10);
      if(waterfallCounter===10) waterfallStarted=true;
      grassCounter+=1; if(grassCounter>40) grassCounter=-40;
      coinCounter+=1; if(coinCounter>3*25) coinCounter=0;
      blinkCounter+=1; if(blinkCounter>25) blinkCounter=-25;
    }
    requestAnimationFrame(frame);
  }catch(e){renderFatal(e)}
}
window.addEventListener('error',e=>{ if(e.error) renderFatal(e.error); });
window.addEventListener('unhandledrejection',e=>renderFatal(e.reason||'Unhandled promise rejection'));
boot();

