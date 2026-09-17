/* WinMine HTML reconstruction.
   Gameplay/state formulas are translated only from the supplied WinMine.py.
   SOLITAIRE_HTML_python.zip is used only as a web-application packaging/layout reference. */
const CELL=16, BOARD_X=0x07, BOARD_Y=0x27;
const COVERED=0x0F, FLAG=0x0E, QUESTION=0x0D, MINE_REVEALED=0x0C, WRONG_FLAG=0x0B, LOSS_MINE=0x0A;
const PRESETS=[
  {name:"初學者",mines:10,width:8,height:8},
  {name:"中級者",mines:40,width:16,height:16},
  {name:"進階者",mines:99,width:30,height:16}
];
// Same numeric string-table keys as WinMine_source.py's SOURCE_STRINGS dict
// (2..15). Keeping identical keys means every SOURCE_STRINGS[n] lookup in
// this file resolves the same string the Python source resolves, instead of
// re-deriving a parallel named-key table that could silently drift.
const SOURCE_STRINGS={
  2:"踩地雷", 3:"WINMINE.HLP", 4:"踩地雷錯誤",
  5:"計時資源不足以供踩地雷使用.\n\n請結束一或多個應用程式, 然後再試一次.",
  6:"記憶體不足", 7:"錯誤: %d", 8:"%d 秒", 9:"不具名的",
  10:"在初學者這一級, 你的速度最快.\n請留下您的大名.",
  11:"在中級者這一級, 你的速度最快.\n請留下您的大名.",
  12:"在進階者這一級, 你的速度最快.\n請留下您的大名.",
  13:"踩地雷", 14:"經由 Robert Donner 和 Curt Johnson ", 15:"踩地雷"
};

class SourceRNG{
  constructor(seed=0){this.low=seed&0xffff;this.high=0}
  next15(){
    const low=this.low&0xffff, high=this.high&0xffff;
    const product=low*0x43fd;
    let lowWord=product&0xffff;
    let highWord=((product>>>16)+high*0x43fd+low*3)>>>0;
    lowWord+=0x9ec3;
    const carry=lowWord>0xffff?1:0;
    lowWord&=0xffff;
    highWord=(highWord+0x26+carry)&0xffff;
    this.low=lowWord;this.high=highWord;
    return this.high&0x7fff;
  }
  mod(n){return this.next15()%n}
}

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
async function loadImage(src){return await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src})}

class WinMineGame{
  constructor(){
    this.width=8;this.height=8;this.mine_total=10;
    this.preset_index=0;this.custom=false;this.mark_enabled=true;this.color_mode=true;this.menu_mode=2;this.sound_state_code=3;this.sound_enabled=true;this.tick_enabled=true;this.config_tick=0;this.xpos=0x50;this.ypos=0x50;
    this.best=[999,999,999];this.best_names=["","",""];
    this.mine_remaining=this.mine_total;this.started=false;this.finished=false;this.won=false;
    this.elapsed=0;this.timer_subtick=0;this.revealed_safe=0;this.hover_x=-1;this.hover_y=-1;
    this.left_down=false;this.chord=false;this.press_face=false;this.press_face_button=false;this.cheat_index=0;
    this._rng=new SourceRNG((Date.now()>>>0)&0xffff);
    this.boardCanvas=document.getElementById("board");this.bctx=this.boardCanvas.getContext("2d");
    this.bctx.imageSmoothingEnabled=false;
    this.counterCanvas=document.getElementById("counter");this.cctx=this.counterCanvas.getContext("2d");this.cctx.imageSmoothingEnabled=false;
    this.timerCanvas=document.getElementById("timer");this.tctx=this.timerCanvas.getContext("2d");this.tctx.imageSmoothingEnabled=false;
    this.faceCanvas=document.getElementById("face");this.fctx=this.faceCanvas.getContext("2d");this.fctx.imageSmoothingEnabled=false;
    this.assets={};
  }
  async init(){
    // The native source loads WinMine preferences before creating the bitmap
    // resources, because Color is one of those preferences.  Loading sheets
    // first would make a persisted Color=0 setting use the color BMPs for the
    // first frame.
    this.loadPreferences();
    this.color_supported = (typeof screen !== "undefined" && Number.isFinite(+screen.colorDepth)) ? (+screen.colorDepth > 2) : true;
    if(!this.color_supported)this.color_mode=false;
    await this.loadSheets();
    // Source initialization creates the window/resources before the first
    // new_game() board layout. paint() reads this.board, so do not paint
    // before reset_board() has established the source board array.
    this.new_game();
    // _create_window() attaches self.menu to CreateWindowExW unconditionally
    // and only calls _sync_menu() afterward — it never calls set_menu_mode()
    // during startup. The loaded/default menu_mode (2) only takes visual
    // effect later, when handle_key_source() dispatches T or F6. So the menu
    // bar must always start visible; do not gate it on menu_mode here.
    document.getElementById("menuBar").style.display="flex";
    this.syncMenuChecks();
    this.bind();
    setInterval(()=>this.update_timer(),100);
  }
  async loadSheets(){
    const suffix=this.color_mode?"410":"411",counter=this.color_mode?"420":"421",face=this.color_mode?"430":"431";
    this.assets.cells=await loadImage(`assets/Card_Bitmap_${suffix}.bmp`);
    this.assets.counter=await loadImage(`assets/Card_Bitmap_${counter}.bmp`);
    this.assets.faces=await loadImage(`assets/Card_Bitmap_${face}.bmp`);
  }
  loadPreferences(){
    const raw=localStorage.getItem("WinMine");
    if(!raw)return;
    try{
      const c=JSON.parse(raw);
      this.preset_index=clamp(Number.isFinite(+c.Difficulty)?+c.Difficulty:0,0,3);
      const lowResolution=!!(window.screen&&Number.isFinite(+window.screen.height)&&+window.screen.height<0x1E0),maxHeight=lowResolution?16:22;this.height=clamp(+c.Height||8,8,maxHeight);this.width=clamp(+c.Width||8,8,30);
      this.mine_total=clamp(+c.Mines||10,10,Math.min(999,(this.height-1)*(this.width-1)));
      this.mark_enabled=Number.isFinite(+c.Mark)?(+c.Mark!==0):true;this.color_mode=(Number.isFinite(+c.Color)?(+c.Color!==0):true);
      const timeValue=(v)=>{const n=Number(v);return Number.isFinite(n)?clamp(n,0,999):999};
      this.best=[timeValue(c.Time1),timeValue(c.Time2),timeValue(c.Time3)];
      // Keep the duplicated array fields only as backward compatibility with
      // earlier HTML builds; the source INI stores Name1/Name2/Name3.
      this.best_names=[String(c.Name1??""),String(c.Name2??""),String(c.Name3??"")];
      this.menu_mode=clamp(Number.isFinite(+c.Menu)?+c.Menu:1,0,2);this.sound_state_code=clamp(Number.isFinite(+c.Sound)?+c.Sound:3,0,3);this.sound_enabled=this.sound_state_code===3;this.tick_enabled=(Number.isFinite(+c.Tick)?+c.Tick:1)!==0;this.config_tick=clamp(Number.isFinite(+c.Tick)?+c.Tick:0,0,2);this.xpos=Number.isFinite(+c.Xpos)?+c.Xpos:0x50;this.ypos=Number.isFinite(+c.Ypos)?+c.Ypos:0x50;
    }catch(_){}
  }
  savePreferences(){
    localStorage.setItem("WinMine",JSON.stringify({
      Difficulty:this.preset_index,Mines:this.mine_total,Height:this.height,Width:this.width,
      Xpos:this.xpos,Ypos:this.ypos,Sound:this.sound_state_code,Color:this.color_mode?1:0,Mark:this.mark_enabled?1:0,Menu:this.menu_mode,Tick:this.config_tick,
      Time1:this.best[0],Name1:this.best_names[0],Time2:this.best[1],Name2:this.best_names[1],
      Time3:this.best[2],Name3:this.best_names[2]
    }));
  }
  reset_board(){
    this.board=Array.from({length:this.height+2},()=>Array(this.width+2).fill(0x10));
    for(let y=1;y<=this.height;y++)for(let x=1;x<=this.width;x++)this.board[y][x]=COVERED;
  }
  new_game(){
    this.reset_board();this.revealed_safe=0;this.started=false;this.finished=false;this.won=false;
    this.elapsed=0;this.timer_subtick=0;this.mine_remaining=this.mine_total;this.hover_x=this.hover_y=-1;
    const maxMines=Math.min(999,Math.max(0,(this.height-1)*(this.width-1)));
    this.mine_total=Math.min(this.mine_total,maxMines);this.mine_remaining=this.mine_total;
    let placed=0;while(placed<this.mine_total){
      const x=this._rng.mod(this.width)+1,y=this._rng.mod(this.height)+1;
      if(this.board[y][x]&0x80)continue;this.board[y][x]|=0x80;placed++;
    }
    this.resize();this.paint();
  }
  in_board(x,y){return x>=1&&x<=this.width&&y>=1&&y<=this.height}
  adjacent_mines(x,y){
    let n=0;for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++)if(this.board[yy][xx]&0x80)n++;return n
  }
  adjacent_flags(x,y){
    let n=0;for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++)
      if(this.in_board(xx,yy)&&(this.board[yy][xx]&0x1f)===FLAG)n++;return n
  }
  set_low_state(x,y,state){this.board[y][x]=(this.board[y][x]&0xe0)|state}
  normalize_mark(x,y){
    let state=this.board[y][x]&0x1f;if(state===QUESTION)state=9;else if(state===0x0f)state=0;this.set_low_state(x,y,state)
  }
  cycle_mark_preview(x,y){
    let state=this.board[y][x]&0x1f;if(state===9)state=QUESTION;else if(state===0)state=0x0f;this.set_low_state(x,y,state)
  }
  change_mine_counter(delta){this.mine_remaining+=delta;this.drawCounter()}
  toggle_mark(x,y){
    if(!this.in_board(x,y)||this.finished)return;const cell=this.board[y][x];if(cell&0x40)return;
    const state=cell&0x1f;
    if(state===FLAG){if(this.mark_enabled)this.set_low_state(x,y,QUESTION);else this.set_low_state(x,y,COVERED);this.change_mine_counter(1)}
    else if(state===QUESTION)this.set_low_state(x,y,COVERED);
    else{this.set_low_state(x,y,FLAG);this.change_mine_counter(-1)}
    if((this.board[y][x]&0x1f)===FLAG&&this.revealed_safe===this.width*this.height-this.mine_total)this.finish(true);
    this.paint()
  }
  reveal_one(x,y){
    if(!this.in_board(x,y))return;const cell=this.board[y][x],state=cell&0x1f;
    if(cell&0x40||state===0x10||state===FLAG)return;
    this.revealed_safe++;const number=this.adjacent_mines(x,y);this.board[y][x]=number|0x40;
    if(number===0)this._queue.push([x,y])
  }
  reveal_flood(x,y){
    this._queue=[];this.reveal_one(x,y);let q=0;
    while(q<this._queue.length){const [cx,cy]=this._queue[q++];for(let yy=cy-1;yy<=cy+1;yy++)for(let xx=cx-1;xx<=cx+1;xx++)this.reveal_one(xx,yy)}
  }
  open_cell(x,y){
    if(!this.in_board(x,y)||this.finished)return;let cell=this.board[y][x];
    if(cell&0x80){
      if(this.revealed_safe===0){
        let target=null;
        for(let sy=1;sy<this.height;sy++){for(let sx=1;sx<this.width;sx++)if(!(this.board[sy][sx]&0x80)){target=[sx,sy];break}if(target)break}
        if(target){const [tx,ty]=target;this.board[y][x]=COVERED;this.board[ty][tx]|=0x80}
      }else{this.set_low_state(x,y,MINE_REVEALED);this.board[y][x]|=0x40;this.finish(false);return}
    }
    this.reveal_flood(x,y);
    if(this.revealed_safe>=this.width*this.height-this.mine_total)this.finish(true);
    this.paint()
  }
  chord_cell(x,y){
    if(!this.in_board(x,y)||this.finished)return;const cell=this.board[y][x],state=cell&0x1f;
    if(!(cell&0x40)||state<0||state>8||this.adjacent_flags(x,y)!==state)return;
    let hit=false;
    for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++){
      const c=this.board[yy][xx];
      if((c&0x1f)===FLAG||!(c&0x80))this.reveal_flood(xx,yy);
      else{hit=true;this.set_low_state(xx,yy,MINE_REVEALED|0x40)}
    }
    if(hit)this.finish(false);else if(this.revealed_safe===this.width*this.height-this.mine_total)this.finish(true);this.paint()
  }
  finish(win){
    this.finished=true;this.won=!!win;
    if(win){this.mine_remaining=0;for(let y=1;y<=this.height;y++)for(let x=1;x<=this.width;x++)if((this.board[y][x]&0x80)&&!(this.board[y][x]&0x40))this.set_low_state(x,y,FLAG)}
    else for(let y=1;y<=this.height;y++)for(let x=1;x<=this.width;x++){const c=this.board[y][x];if(c&0x80&&!(c&0x40))this.set_low_state(x,y,LOSS_MINE);else if((c&0x1f)===FLAG&&!(c&0x80))this.set_low_state(x,y,WRONG_FLAG)}
    if(win&&this.preset_index<3&&this.elapsed<this.best[this.preset_index]){
      this.best[this.preset_index]=this.elapsed;
      this.savePreferences();
      // Source finish(): show the fastest-times dialog before asking for the
      // new record holder name. Keep this ordering; do not invent a browser
      // specific replacement for the source sequence.
      this.showBest();
      this.showNameEntry(this.preset_index);
    }
    this.paint()
  }
  activate_cell(x,y,chord=false){
    if(!this.in_board(x,y)||this.finished)return;const cell=this.board[y][x];
    if(this.revealed_safe===0&&this.elapsed===0&&!this.started){this.started=true;this.elapsed=1;this.timer_subtick=0}
    else if(!this.started){this.started=true;this.timer_subtick=0}
    if((cell&0x40)&&!chord)return;if(!chord&&(cell&0x1f)===FLAG)return;
    chord?this.chord_cell(x,y):this.open_cell(x,y)
  }
  update_timer(){
    if(!this.started||this.finished)return;this.timer_subtick++;
    if(this.timer_subtick===10){this.timer_subtick=0;if(this.elapsed<999){this.elapsed++;this.drawTimer()}}
  }
  board_at(px,py){
    const bx=Math.floor((px-BOARD_X)/CELL),by=Math.floor((py-BOARD_Y)/CELL);
    return this.in_board(bx,by)?[bx,by]:null
  }
  preview_move(px,py){
    const n=this.board_at(px,py),nx=n?n[0]:-1,ny=n?n[1]:-1,ox=this.hover_x,oy=this.hover_y;
    if(nx===ox&&ny===oy)return;
    const around=(cx,cy,fn)=>{if(!this.in_board(cx,cy))return;for(let yy=Math.max(1,cy-1);yy<=Math.min(this.height,cy+1);yy++)for(let xx=Math.max(1,cx-1);xx<=Math.min(this.width,cx+1);xx++)if(!(this.board[yy][xx]&0x40))fn(xx,yy)}
    if(!this.chord){
      if(this.in_board(ox,oy)&&!(this.board[oy][ox]&0x40))this.cycle_mark_preview(ox,oy);
      if(this.in_board(nx,ny)){const c=this.board[ny][nx];if(!(c&0x40)&&(c&0x1f)!==FLAG)this.normalize_mark(nx,ny)}
    }else{around(ox,oy,(x,y)=>this.cycle_mark_preview(x,y));around(nx,ny,(x,y)=>this.normalize_mark(x,y))}
    this.hover_x=nx;this.hover_y=ny;this.paint()
  }
  sourceFrameForCell(x,y){const state=this.board[y][x]&0x1f;return clamp(15-state,0,15)}
  // NativeBitmapSheet.draw(): BitBlt's src_y = index * frame_h directly. The
  // loaded bitmap is already in normalized top-down GDI coordinates (both
  // LoadImageW and a decoded browser <img> present a bottom-up-stored BMP
  // this same right-side-up way), so a visual index draws unmodified. Used
  // for cell sprites (cell_sprite()/FUN_1000_1c77) and face sprites, exactly
  // like the source's plain `draw()` calls — NOT `draw_source_frame()`.
  _drawVisualFrame(ctx,img,frame,w,h,x,y,count){
    const idx=clamp(frame,0,count-1);ctx.drawImage(img,0,idx*h,w,h,x,y,w,h)
  }
  // NativeBitmapSheet.draw_source_frame(): only FUN_1000_1d70 (the LED digit
  // renderer) indexes the DIB's raw bottom-up pixel buffer directly, so its
  // source_index 0 is the bottom visual frame. Converting that to the
  // normalized top-down index used by draw() takes count-1-index. This
  // conversion is specific to the digit sheet; it must not be reused for
  // cells or faces, which never went through FUN_1000_1d70's raw addressing.
  _drawSourceFrame(ctx,img,frame,w,h,x,y,count){
    const visual=count-1-clamp(frame,0,count-1);ctx.drawImage(img,0,visual*h,w,h,x,y,w,h)
  }
  drawCounter(){
    this.cctx.clearRect(0,0,39,23);this.cctx.fillStyle="#000";this.cctx.fillRect(0,0,39,23);
    let v=this.mine_remaining, frames;
    if(v<0){const a=-v;frames=[11,Math.floor(a/10)%10,a%10]}else{v=clamp(v,0,999);frames=[Math.floor(v/100),(Math.floor(v/10)%10),v%10]}
    frames.forEach((f,i)=>this._drawSourceFrame(this.cctx,this.assets.counter,f,13,23,i*13,0,12))
  }
  drawTimer(){
    this.tctx.clearRect(0,0,39,23);this.tctx.fillStyle="#000";this.tctx.fillRect(0,0,39,23);
    const v=clamp(this.elapsed,0,999),frames=[Math.floor(v/100),(Math.floor(v/10)%10),v%10];
    frames.forEach((f,i)=>this._drawSourceFrame(this.tctx,this.assets.counter,f,13,23,i*13,0,12))
  }
  drawFace(){
    this.fctx.clearRect(0,0,24,24);
    // _draw_face(): 1=won(sunglasses), 2=lost(X-eyes), 4=face-button-pressed,
    // 3=pressed-on-board(O-mouth), 0=resting smile. Drawn with plain draw(),
    // i.e. a direct visual index — see _drawVisualFrame above.
    let idx;if(this.finished&&this.won)idx=1;else if(this.finished)idx=2;else if(this.press_face_button)idx=4;else if(this.press_face)idx=3;else idx=0;
    this._drawVisualFrame(this.fctx,this.assets.faces,idx,24,24,0,0,5)
  }
  frameRect(ctx,l,t,r,b,raised=true,width=1,mode=null){
    // Source-grounded bevel equivalent of FUN_1000_1f6b.  Use integer-filled
    // strips instead of Canvas strokes so the 1px/2px/3px bevel remains crisp
    // after the complete app is uniformly scaled.  Raised = light top/left +
    // dark bottom/right; sunken reverses those two sides.
    const n=Math.max(1,width|0);
    const m=mode===null?(raised?1:0):mode|0;
    const outerL=l|0,outerT=t|0,outerR=r|0,outerB=b|0;
    const hi="#ffffff",dark="#404040";
    const lightFirst=(m&1)!==0;
    ctx.save();
    for(let i=0;i<n;i++){
      const L=outerL+i,T=outerT+i,R=outerR-i,B=outerB-i;
      if(R<=L||B<=T)break;
      ctx.fillStyle=lightFirst?hi:dark;
      ctx.fillRect(L,T,R-L+1,1);
      ctx.fillRect(L,T,1,B-T+1);
      ctx.fillStyle=lightFirst?dark:hi;
      ctx.fillRect(L,B,R-L+1,1);
      ctx.fillRect(R,T,1,B-T+1);
    }
    ctx.restore();
  }
  paint(){
    const W=this.width*CELL+0x2e,H=this.height*CELL+0x43;
    this.boardCanvas.width=W;this.boardCanvas.height=H;
    this.bctx.imageSmoothingEnabled=false;this.bctx.fillStyle="#c0c0c0";this.bctx.fillRect(0,0,W,H);
    // FUN_1000_20d9 / FUN_1000_201d: client frame, header recess, board
    // recess, LED recesses and face button are all drawn in client coordinates.
    this.frameRect(this.bctx,0,0,W-1,H-1,true,3);
    this.frameRect(this.bctx,0x14,0x34,W-0x15,H-9,false,3);
    this.frameRect(this.bctx,0x14,9,W-0x15,0x2d,false,2);
    this.frameRect(this.bctx,0x1b,0x0f,0x43,0x27,false,1);
    this.frameRect(this.bctx,W-0x44,0x0f,W-0x1c,0x27,false,1);
    // The face bevel is rendered by the dedicated DOM button overlay.  This
    // avoids the old Canvas 1px-stroke/scale interaction that made raised and
    // sunken states look almost identical in the browser.  The source face
    // sprite remains unchanged; only the web presentation of its bevel is
    // separated from the game canvas.
    const faceButton=document.getElementById("faceButton");
    if(faceButton)faceButton.classList.toggle("facePressed",!!this.press_face_button);
    for(let y=1;y<=this.height;y++)for(let x=1;x<=this.width;x++)
      this._drawVisualFrame(this.bctx,this.assets.cells,this.sourceFrameForCell(x,y),16,16,BOARD_X+x*CELL,BOARD_Y+y*CELL,16);
    document.getElementById("window").style.width=W+"px";
    document.getElementById("window").style.height=H+"px";
    this.drawCounter();this.drawTimer();this.drawFace();
    this.fitToViewport();
  }
  fitToViewport(){
    const app=document.getElementById("app"), bar=document.getElementById("menuBar"), win=document.getElementById("window");
    if(!app||!win)return;
    // CSS transform is applied to the complete native-sized client + menu.
    // One scalar is used for both axes; this is display adaptation only and
    // does not alter any source board coordinate or gameplay calculation.
    const naturalW=Math.max(win.offsetWidth,1);
    const naturalH=Math.max((bar.offsetHeight||0)+win.offsetHeight,1);
    const vv=window.visualViewport;
    const vw=Math.max(1,Math.floor(vv?vv.width:document.documentElement.clientWidth));
    const vh=Math.max(1,Math.floor(vv?vv.height:document.documentElement.clientHeight));
    const pad=4;
    const scale=Math.max(0.01,Math.min((vw-pad)/naturalW,(vh-pad)/naturalH));
    app.style.width=naturalW+"px";
    app.style.height=naturalH+"px";
    app.style.transform=`translate(-50%, -50%) scale(${scale})`;
    app.dataset.scale=String(scale);
    app.dataset.nativeWidth=String(naturalW);
    app.dataset.nativeHeight=String(naturalH);
  }
  resize(){this.paint();this.fitToViewport()}
  setPreset(i){this.preset_index=i;const p=PRESETS[i];this.width=p.width;this.height=p.height;this.mine_total=p.mines;this.custom=false;this.new_game();this.syncMenuChecks();this.closeMenus()}
  openCustom(){
    const d=document.getElementById("customDialog");heightInput.value=this.height;widthInput.value=this.width;minesInput.value=this.mine_total;d.showModal()
  }
  bind(){
    const canvas=this.boardCanvas, pos=e=>{
      const r=canvas.getBoundingClientRect();
      const sx=canvas.width/Math.max(1,r.width), sy=canvas.height/Math.max(1,r.height);
      return [(e.clientX-r.left)*sx, (e.clientY-r.top)*sy];
    };
    const faceHit=(x,y)=>{const W=this.boardCanvas.width,fx=Math.floor((W-24)/2)-1;return fx<=x&&x<fx+26&&15<=y&&y<41};
    canvas.addEventListener("mousemove",e=>{
      const [x,y]=pos(e);
      if(this.press_face_button){const inside=faceHit(x,y);if(inside!==this.press_face){this.press_face=inside;this.paint()}return}
      if(this.left_down)this.preview_move(x,y);
    });
    canvas.addEventListener("mousedown",e=>{
      const [x,y]=pos(e);
      if(e.button===0){
        if(faceHit(x,y)){this.press_face=this.press_face_button=true;this.paint();return}
        const cell=this.board_at(x,y);
        if(cell&&!this.finished){this.left_down=true;this.chord=!!(e.shiftKey||(e.buttons&2));this.press_face=true;this.hover_x=this.hover_y=-1;this.preview_move(x,y);this.paint()}
      }else if(e.button===2){
        e.preventDefault();
        const cell=this.board_at(x,y);
        if(this.left_down){this.preview_move(-1,-1);this.chord=true}
        else if(e.buttons&1){
          if(cell&&!this.finished){this.left_down=true;this.chord=true;this.hover_x=this.hover_y=-1;this.preview_move(x,y)}
        }else if(!this.finished&&cell)this.toggle_mark(...cell);
      }else if(e.button===1){
        const cell=this.board_at(x,y);
        if(cell&&!this.finished){this.left_down=true;this.chord=true;this.hover_x=this.hover_y=-1;this.preview_move(x,y)}
      }
    });
    canvas.addEventListener("mouseup",e=>{
      const [x,y]=pos(e);
      if(e.button===0&&this.press_face_button){
        if(faceHit(x,y))this.new_game();
        this.press_face_button=false;this.press_face=false;this.left_down=false;this.chord=false;this.hover_x=this.hover_y=-1;this.paint();return;
      }
      if((e.button===0||e.button===1||e.button===2)&&this.left_down){
        const cell=this.board_at(x,y);this.left_down=false;this.press_face=false;
        if(cell)this.activate_cell(...cell,this.chord);
        this.chord=false;this.hover_x=this.hover_y=-1;this.paint();
      }
    });
    // Native MAINWNDPROC calls SetCapture(hwnd), so button-up/move messages
    // continue arriving even after the pointer leaves the client window.
    // Mirror that transport behavior with document-level listeners while a
    // source mouse capture is active; the board state itself remains governed
    // by the Python source translation above.
    const capturedMove=e=>{
      if(!this.left_down&&!this.press_face_button)return;
      const [x,y]=pos(e);
      if(this.press_face_button){const inside=faceHit(x,y);if(inside!==this.press_face){this.press_face=inside;this.paint()}}
      else if(this.left_down)this.preview_move(x,y);
    };
    const capturedUp=e=>{
      if(!(this.left_down||this.press_face_button))return;
      if(e.target===canvas)return;
      const [x,y]=pos(e);
      if(e.button===0&&this.press_face_button){
        if(faceHit(x,y))this.new_game();
        this.press_face_button=false;this.press_face=false;this.left_down=false;this.chord=false;this.hover_x=this.hover_y=-1;this.paint();return;
      }
      if((e.button===0||e.button===1||e.button===2)&&this.left_down){
        const cell=this.board_at(x,y);this.left_down=false;this.press_face=false;
        if(cell)this.activate_cell(...cell,this.chord);
        this.chord=false;this.hover_x=this.hover_y=-1;this.paint();
      }
    };
    document.addEventListener("mousemove",capturedMove);
    document.addEventListener("mouseup",capturedUp);
    canvas.addEventListener("mouseleave",()=>{
      if(this.press_face_button&&this.press_face){this.press_face=false;this.paint()}
      if(this.left_down)this.preview_move(-1,-1);
    });
    // The native source handles the face hit-test inside MAINWNDPROC; the
    // DOM button is visual only and must not own gameplay input.
    // #faceButton is now pointer-events:none (styles.css) so it is a pure
    // visual overlay for the face canvas; every real click passes through to
    // the board canvas below, which already implements the source's face
    // hit-test (mousedown/mousemove/mouseup handlers above). No separate
    // click wiring is needed here anymore.
    document.querySelectorAll("[data-menu]").forEach(b=>b.addEventListener("click",e=>{const root=e.currentTarget.parentElement;document.querySelectorAll(".menuRoot").forEach(x=>x.classList.remove("open"));root.classList.add("open")}));
    document.addEventListener("click",e=>{if(!e.target.closest(".menuRoot"))this.closeMenus()});
    document.querySelectorAll("[data-cmd]").forEach(b=>b.addEventListener("click",()=>this.command(b.dataset.cmd)));
    document.addEventListener("keydown",e=>{
      if(e.key==="F2"){e.preventDefault();this.new_game();return}
      // SOURCE_MENU uses the Win32 Alt accelerators (&G / &H). Mirror only those documented accelerators.
      if(e.altKey && (e.key.toLowerCase()==="g"||e.key.toLowerCase()==="h")){e.preventDefault();this.closeMenus();const root=document.querySelector(e.key.toLowerCase()==="g"?"#gameMenu":"#helpMenu").parentElement;root.classList.add("open");return}
      if(e.key==="F1"){e.preventDefault();this.command("web_help");return}
      if(e.key==="Escape"){this.closeMenus();return}
      // RT_MENU supplies the documented ampersand mnemonics.  When a menu is
      // already open, Windows dispatches the matching mnemonic to that menu's
      // command; mirror only those source-defined keys (no extra shortcuts).
      const openRoot=document.querySelector(".menuRoot.open");
      if(openRoot && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length===1){
        const k=e.key.toLowerCase();
        const gameMnemonic={n:"new",b:"beginner",i:"intermediate",e:"expert",c:"custom",m:"mark",l:"color",t:"best",x:"quit"};
        const helpMnemonic={g:"web_help"};
        const map=openRoot.querySelector("#gameMenu")?gameMnemonic:helpMnemonic;
        if(map[k]){e.preventDefault();this.command(map[k]);return}
      }
      if(e.key==="s"||e.key==="S"||e.key==="t"||e.key==="T"||e.key==="F6"||e.key==="Shift"||e.key.toUpperCase()==="X"||e.key.toUpperCase()==="Y"||e.key.toUpperCase()==="Z"){
        e.preventDefault();
        this.handleSourceKey(e.key);
        return;
      }
    });
    document.getElementById("customForm").addEventListener("submit",e=>{
      if(e.submitter?.id!=="customOk")return;
      const maxH=window.screen&&window.screen.height<0x1E0?16:22;
      const numericOr=(value,fallback)=>{const n=Number(value);return Number.isFinite(n)?n:fallback};
      const h=clamp(numericOr(heightInput.value,this.height),8,maxH);
      const w=clamp(numericOr(widthInput.value,this.width),8,30);
      const m=clamp(numericOr(minesInput.value,this.mine_total),10,Math.min(999,(h-1)*(w-1)));
      this.height=h;this.width=w;this.mine_total=m;this.preset_index=3;this.custom=true;this.new_game();this.syncMenuChecks();this.closeMenus();
    });
    document.getElementById("bestOk").onclick=()=>bestDialog.close();
    document.getElementById("bestReset").onclick=()=>{this.best=[999,999,999];this.best_names=["","",""];this.savePreferences();this.showBest()};
    document.getElementById("nameForm").addEventListener("submit",e=>{
      if(e.submitter?.id!=="nameOk")return;
      e.preventDefault();
      const d=document.getElementById("nameDialog"),idx=+d.dataset.preset||0;
      this.best_names[idx]=document.getElementById("nameInput").value.slice(0,127);
      d.close();this.showBest();
    });
    document.querySelector("#aboutDialog button").onclick=()=>aboutDialog.close();
    document.getElementById("helpOk").onclick=()=>document.getElementById("helpDialog").close();
    document.getElementById("aboutText").textContent=SOURCE_STRINGS[13]+"\n"+SOURCE_STRINGS[14];
    // Touch is a transport adaptation only.  A tap follows the source left
    // button path; a short long-press follows the source right-button path.
    // The board coordinates still go through board_at()/toggle_mark(), so no
    // new mine/board rule is introduced for mobile.
    let touchTimer=0,touchPoint=null,touchRight=false,touchMoved=false,touchFace=false;
    const clearTouch=()=>{if(touchTimer){clearTimeout(touchTimer);touchTimer=0}touchPoint=null;touchFace=false};
    canvas.addEventListener("touchstart",e=>{
      if(e.touches.length!==1)return;
      e.preventDefault();
      const t=e.touches[0], fake={clientX:t.clientX,clientY:t.clientY};
      touchPoint=fake;touchRight=false;touchMoved=false;
      const [x,y]=pos(fake);
      if(faceHit(x,y)){
        touchFace=true;this.press_face_button=true;this.paint();
        return;
      }
      const cell=this.board_at(x,y);
      if(cell&&!this.finished){
        // Match the source's press_face visual state while the board is held.
        // The actual cell action still occurs on touchend, as before.
        this.press_face=true;this.paint();
      }
      touchTimer=setTimeout(()=>{
        touchTimer=0;if(!touchPoint||touchMoved)return;
        const heldCell=this.board_at(x,y);
        if(!this.finished&&heldCell){touchRight=true;this.toggle_mark(...heldCell);this.paint()}
      },550);
    },{passive:false});
    canvas.addEventListener("touchmove",e=>{
      if(!touchPoint||e.touches.length!==1)return;
      e.preventDefault();
      const t=e.touches[0], fake={clientX:t.clientX,clientY:t.clientY};
      const dx=fake.clientX-touchPoint.clientX,dy=fake.clientY-touchPoint.clientY;
      if(Math.hypot(dx,dy)>10){
        touchMoved=true;if(touchTimer){clearTimeout(touchTimer);touchTimer=0}
        if(touchFace){
          const [x,y]=pos(fake),inside=faceHit(x,y);
          if(this.press_face_button!==inside){this.press_face_button=inside;this.paint()}
        }
      }
    },{passive:false});
    canvas.addEventListener("touchend",e=>{
      if(!touchPoint)return;
      e.preventDefault();
      const t=e.changedTouches[0],fake={clientX:t.clientX,clientY:t.clientY};
      if(touchTimer)clearTimeout(touchTimer);
      const [x,y]=pos(fake);
      if(touchFace){
        const inside=faceHit(x,y);
        this.press_face_button=false;
        if(inside&&!touchMoved)this.new_game();
        this.paint();clearTouch();return;
      }
      if(!touchMoved&&!touchRight){
        const [bx,by]=[x,y];
        const cell=this.board_at(bx,by);if(cell&&!this.finished)this.activate_cell(...cell,false);
      }
      this.press_face=false;this.paint();
      clearTouch();
    },{passive:false});
    canvas.addEventListener("touchcancel",()=>{this.press_face_button=false;this.press_face=false;this.paint();clearTouch()},{passive:false});
    canvas.addEventListener("contextmenu",e=>e.preventDefault());
    // Source WM_ENDSESSION/WM_DESTROY persists the WinMine preferences when
    // the native window is leaving.  A browser page has no WM_DESTROY, so the
    // closest page-lifecycle equivalent is pagehide.  This only persists the
    // same preference record; it does not introduce a new game rule.
    window.addEventListener("pagehide",()=>this.savePreferences());
  }
  command(c){
    this.closeMenus();
    if(c==="new")this.new_game();
    else if(c==="beginner")this.setPreset(0);
    else if(c==="intermediate")this.setPreset(1);
    else if(c==="expert")this.setPreset(2);
    else if(c==="custom")this.openCustom();
    else if(c==="mark"){this.mark_enabled=!this.mark_enabled;this.syncMenuChecks();this.paint()}
    else if(c==="color"){if(!this.color_supported)return;this.color_mode=!this.color_mode;this.loadSheets().then(()=>{this.syncMenuChecks();this.paint()})}
    else if(c==="best")this.showBest();
    else if(c==="web_help"){this.openWebHelp()}
    else if(c==="quit"){try{window.close()}catch(_){} }
    else if(c==="about"){document.getElementById("aboutText").textContent=SOURCE_STRINGS[13]+"\n"+SOURCE_STRINGS[14];aboutDialog.showModal();}
    this.syncMenuChecks();
  }
  syncMenuChecks(){
    const map=[['checkBeginner',this.preset_index===0],['checkIntermediate',this.preset_index===1],['checkExpert',this.preset_index===2],['checkMark',!!this.mark_enabled],['checkColor',!!this.color_mode]];
    for(const [id,on] of map){const el=document.getElementById(id);if(el)el.classList.toggle('on',!!on)}
    const colorItem=document.querySelector('#gameMenu [data-cmd="color"]');
    if(colorItem){colorItem.disabled=!this.color_supported;colorItem.setAttribute("aria-disabled",String(!this.color_supported));}
  }
  handleSourceKey(key){
    // FUN_1000_1308: keep the native five-key XYZZY state machine.
    // This is state evidence from WinMine.py, not a newly invented cheat.
    if(key==="s"||key==="S"){
      if(this.sound_state_code>1){this.sound_state_code=this.sound_state_code===3?2:3;}
      return
    }
    if(key==="t"||key==="T"){
      if(this.menu_mode!==0)this.set_menu_mode_source(1);
      return
    }
    if(key==="F6"){
      if(this.menu_mode!==0)this.set_menu_mode_source(2);
      return
    }
    if(key==="Shift"){
      if(this.cheat_index>4)this.cheat_index^=0x14;
      return
    }
    const seq="XYZZY";
    if(this.cheat_index<seq.length && key.length===1 && key.toUpperCase()===seq[this.cheat_index])
      this.cheat_index++;
    else this.cheat_index=0;
  }
  set_menu_mode_source(mode){
    // Source FUN_1000_18be stores the mode as 0/1/2 and then resizes the
    // native window. The HTML menu is outside the canvas, so the equivalent
    // is to update the same state before repainting; no alternate menu rule
    // is introduced here.
    this.menu_mode=mode&3;
    this.applyMenuMode();
  }
  applyMenuMode(){
    const bar=document.getElementById("menuBar");
    bar.style.display=(this.menu_mode&2)?"none":"flex";
    this.paint();
  }
  openWebHelp(){
    // Web-only presentation aid.  Gameplay rules remain implemented by the
    // source-derived game logic; this dialog only explains browser/mobile input.
    this.closeMenus();
    document.getElementById("helpDialog").showModal();
  }
  showBest(){
    bestRows.innerHTML=PRESETS.map((p,i)=>`<div style="margin:7px 0">${p.name}　${String(this.best[i]).padStart(3,"0")}　${this.best_names[i]||""}</div>`).join("");
    bestDialog.showModal()
  }
  showNameEntry(idx){
    if(idx<0||idx>=3)return;
    // Mirrors show_name_entry()'s exact `SOURCE_STRINGS[9 + idx]` lookup in
    // WinMine_source.py — not a re-derived "correct-looking" message table.
    const prompt=SOURCE_STRINGS[9+idx];
    const d=document.getElementById("nameDialog"), input=document.getElementById("nameInput"), label=document.getElementById("namePrompt");
    label.textContent=prompt;
    input.value=this.best_names[idx]||"";
    d.dataset.preset=String(idx);
    d.showModal();
    input.focus();input.select();
  }
  closeMenus(){document.querySelectorAll(".menuRoot").forEach(x=>x.classList.remove("open"))}
}
const game=new WinMineGame();
game.init().then(()=>game.fitToViewport()).catch(e=>{document.body.innerHTML="<pre>WinMine initialization failed: "+String(e)+"</pre>";console.error(e)});
window.addEventListener("resize",()=>game.fitToViewport(),{passive:true});
window.addEventListener("orientationchange",()=>setTimeout(()=>game.fitToViewport(),80),{passive:true});
if(window.visualViewport)window.visualViewport.addEventListener("resize",()=>game.fitToViewport(),{passive:true});
