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
const SOURCE_STRINGS={
  title:"踩地雷", help:"WINMINE.HLP", error:"踩地雷錯誤",
  timerResource:"計時資源不足以供踩地雷使用.\n\n請結束一或多個應用程式, 然後再試一次.",
  memory:"記憶體不足", errorFmt:"錯誤: %d", seconds:"%d 秒", unnamed:"不具名的",
  fastest:[
    "在初學者這一級, 你的速度最快.\n請留下您的大名.",
    "在中級者這一級, 你的速度最快.\n請留下您的大名.",
    "在進階者這一級, 你的速度最快.\n請留下您的大名."
  ]
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
function frameCrop(ctx,img,frame,w,h,count){
  const visual=count-1-clamp(frame,0,count-1);
  ctx.drawImage(img,0,visual*h,w,h,0,0,w,h);
}
async function loadImage(src){return await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src})}

class WinMineGame{
  constructor(){
    this.width=8;this.height=8;this.mine_total=10;
    this.preset_index=0;this.mark_enabled=true;this.color_mode=true;this.menu_mode=2;this.sound_state_code=3;this.tick_enabled=true;
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
    await this.loadSheets();
    this.loadPreferences();
    // Source initialization creates the window/resources before the first
    // new_game() board layout. paint() reads this.board, so do not paint
    // before reset_board() has established the source board array.
    this.new_game();
    this.applyMenuMode();
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
      this.height=clamp(+c.Height||8,8,22);this.width=clamp(+c.Width||8,8,30);
      this.mine_total=clamp(+c.Mines||10,10,Math.min(999,(this.height-1)*(this.width-1)));
      this.mark_enabled=c.Mark!==false;this.color_mode=c.Color!==false;
      this.best=Array.isArray(c.Best)?c.Best.map(v=>clamp(+v||999,0,999)):[999,999,999];
      this.best_names=Array.isArray(c.Names)?c.Names:["","",""];
      this.menu_mode=clamp(Number.isFinite(+c.Menu)?+c.Menu:1,0,2);this.sound_state_code=clamp(Number.isFinite(+c.Sound)?+c.Sound:3,0,3);this.tick_enabled=(Number.isFinite(+c.Tick)?+c.Tick:1)!==0;
    }catch(_){}
  }
  savePreferences(){
    localStorage.setItem("WinMine",JSON.stringify({
      Difficulty:this.preset_index,Mines:this.mine_total,Height:this.height,Width:this.width,
      Sound:this.sound_state_code,Color:this.color_mode?1:0,Mark:this.mark_enabled?1:0,Menu:this.menu_mode,Tick:this.tick_enabled?1:0,
      Time1:this.best[0],Name1:this.best_names[0],Time2:this.best[1],Name2:this.best_names[1],
      Time3:this.best[2],Name3:this.best_names[2],Best:this.best,Names:this.best_names
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
  drawCells(){
    this.bctx.fillStyle="#c0c0c0";this.bctx.fillRect(0,0,this.width*CELL+14,this.height*CELL+14);
    for(let y=1;y<=this.height;y++)for(let x=1;x<=this.width;x++){
      frameCrop(this.bctx,this.assets.cells,this.sourceFrameForCell(x,y),16,16,16);
      this.bctx.drawImage(this._frameCanvas||this._tmpCell,0,0);
    }
  }
  _drawFrameDirect(ctx,img,frame,w,h,x,y,count){
    const visual=count-1-clamp(frame,0,count-1);ctx.drawImage(img,0,visual*h,w,h,x,y,w,h)
  }
  drawCounter(){
    this.cctx.clearRect(0,0,39,23);this.cctx.fillStyle="#000";this.cctx.fillRect(0,0,39,23);
    let v=this.mine_remaining, frames;
    if(v<0){const a=-v;frames=[11,Math.floor(a/10)%10,a%10]}else{v=clamp(v,0,999);frames=[Math.floor(v/100),(Math.floor(v/10)%10),v%10]}
    frames.forEach((f,i)=>this._drawFrameDirect(this.cctx,this.assets.counter,f,13,23,i*13,0,12))
  }
  drawTimer(){
    this.tctx.clearRect(0,0,39,23);this.tctx.fillStyle="#000";this.tctx.fillRect(0,0,39,23);
    const v=clamp(this.elapsed,0,999),frames=[Math.floor(v/100),(Math.floor(v/10)%10),v%10];
    frames.forEach((f,i)=>this._drawFrameDirect(this.tctx,this.assets.counter,f,13,23,i*13,0,12))
  }
  drawFace(){
    this.fctx.clearRect(0,0,24,24);
    let idx;if(this.finished&&this.won)idx=1;else if(this.finished)idx=2;else if(this.press_face_button)idx=4;else if(this.press_face)idx=3;else idx=0;
    this._drawFrameDirect(this.fctx,this.assets.faces,idx,24,24,0,0,5)
  }
  frameRect(ctx,l,t,r,b,raised=true,width=1,mode=null){
    // Canvas equivalent of FUN_1000_1f6b. Geometry follows the source
    // client coordinates; no CSS-scaled recreation is used for the frame.
    const param6=Math.max(1,width|0);
    let top=t|0,left=l|0,bottom=b|0,right=r|0;
    const m=mode===null?(raised?1:0):mode|0;
    ctx.save();ctx.lineWidth=1;ctx.beginPath();
    const hi="#ffffff",lo="#808080",dark="#404040";
    for(let i=0;i<param6;i++){
      if((m&1)===0)ctx.strokeStyle=dark;else ctx.strokeStyle=hi;
      right--;ctx.moveTo(right+0.5,top+0.5);ctx.lineTo(left+0.5,top+0.5);ctx.lineTo(left+0.5,bottom+0.5);
      top++;left++;bottom--;
    }
    const other=m^1;
    for(let i=param6;i>0;i--){
      if((other&1)===0)ctx.strokeStyle=dark;else ctx.strokeStyle=hi;
      right++;ctx.moveTo(right+0.5,top+0.5);bottom++;ctx.lineTo(right+0.5,bottom+0.5);left--;ctx.lineTo(left+0.5,bottom+0.5);top--;
    }
    ctx.stroke();ctx.restore();
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
    const faceX=Math.floor((W-24)/2)-1;
    this.frameRect(this.bctx,faceX,0x0f,faceX+0x19,0x28,!(this.press_face_button&&this.press_face),1);
    for(let y=1;y<=this.height;y++)for(let x=1;x<=this.width;x++)
      this._drawFrameDirect(this.bctx,this.assets.cells,this.sourceFrameForCell(x,y),16,16,BOARD_X+x*CELL,BOARD_Y+y*CELL,16);
    document.getElementById("window").style.width=W+"px";
    document.getElementById("window").style.height=H+"px";
    this.drawCounter();this.drawTimer();this.drawFace();
  }
  resize(){this.paint()}
  setPreset(i){this.preset_index=i;const p=PRESETS[i];this.width=p.width;this.height=p.height;this.mine_total=p.mines;this.new_game();this.closeMenus()}
  openCustom(){
    const d=document.getElementById("customDialog");heightInput.value=this.height;widthInput.value=this.width;minesInput.value=this.mine_total;d.showModal()
  }
  bind(){
    const canvas=this.boardCanvas, pos=e=>{const r=canvas.getBoundingClientRect();return [(e.clientX-r.left), (e.clientY-r.top)]};
    const faceHit=(x,y)=>{const W=this.boardCanvas.width,fx=Math.floor((W-24)/2);return fx<=x&&x<fx+24&&16<=y&&y<40};
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
        if(cell&&!this.finished){this.left_down=true;this.chord=!!(e.buttons&4);this.press_face=true;this.hover_x=this.hover_y=-1;this.preview_move(x,y);this.paint()}
      }else if(e.button===2){
        e.preventDefault();
        const cell=this.board_at(x,y);
        if(this.left_down){this.preview_move(-1,-1);this.chord=true}
        else if(e.buttons&1){
          if(cell&&!this.finished){this.left_down=true;this.chord=true;this.hover_x=this.hover_y=-1;this.preview_move(x,y)}
        }else if(!this.finished&&cell)this.toggle_mark(...cell);
      }else if(e.button===1){
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
    canvas.addEventListener("mouseleave",()=>{
      if(this.press_face_button&&this.press_face){this.press_face=false;this.paint()}
      if(this.left_down)this.preview_move(-1,-1);
    });
    // The native source handles the face hit-test inside MAINWNDPROC; the
    // DOM button is visual only and must not own gameplay input.
    const faceButton=document.getElementById("faceButton");
    faceButton.addEventListener("mousedown",e=>e.preventDefault());
    faceButton.addEventListener("click",e=>e.preventDefault());
    document.querySelectorAll("[data-menu]").forEach(b=>b.addEventListener("click",e=>{const root=e.currentTarget.parentElement;document.querySelectorAll(".menuRoot").forEach(x=>x.classList.remove("open"));root.classList.add("open")}));
    document.addEventListener("click",e=>{if(!e.target.closest(".menuRoot"))this.closeMenus()});
    document.querySelectorAll("[data-cmd]").forEach(b=>b.addEventListener("click",()=>this.command(b.dataset.cmd)));
    document.addEventListener("keydown",e=>{
      if(e.key==="F2"){e.preventDefault();this.new_game();return}
      if(e.key==="F1"){e.preventDefault();this.command("help_contents");return}
      if(e.key==="Escape"){this.closeMenus();return}
      if(e.key==="s"||e.key==="S"){this.handleSourceKey(e.key);return}
      if(e.key==="t"||e.key==="T"){this.handleSourceKey(e.key);return}
      if(e.key==="F6"){e.preventDefault();this.handleSourceKey(e.key);return}
    });
    document.getElementById("customForm").addEventListener("submit",e=>{
      if(e.submitter?.id!=="customOk")return;
      const maxH=window.screen&&window.screen.height<0x1E0?16:22,h=clamp(+heightInput.value||8,8,maxH),w=clamp(+widthInput.value||8,8,30),m=clamp(+minesInput.value||10,10,Math.min(999,(h-1)*(w-1)));
      this.height=h;this.width=w;this.mine_total=m;this.preset_index=3;this.new_game();
    });
    document.getElementById("bestOk").onclick=()=>bestDialog.close();
    document.getElementById("bestReset").onclick=()=>{this.best=[999,999,999];this.best_names=["","",""];this.savePreferences();this.showBest()};
    document.getElementById("nameForm").addEventListener("submit",e=>{
      if(e.submitter?.id!=="nameOk")return;
      e.preventDefault();
      const d=document.getElementById("nameDialog"),idx=+d.dataset.preset||0;
      this.best_names[idx]=document.getElementById("nameInput").value.slice(0,127);
      this.savePreferences();d.close();this.showBest();
    });
    document.querySelector("#aboutDialog button").onclick=()=>aboutDialog.close();
    canvas.addEventListener("contextmenu",e=>e.preventDefault());
  }
  command(c){
    this.closeMenus();
    if(c==="new")this.new_game();else if(c==="beginner")this.setPreset(0);else if(c==="intermediate")this.setPreset(1);else if(c==="expert")this.setPreset(2);
    else if(c==="custom")this.openCustom();else if(c==="mark"){this.mark_enabled=!this.mark_enabled;this.savePreferences();this.paint()}
    else if(c==="color"){this.color_mode=!this.color_mode;this.savePreferences();this.loadSheets().then(()=>this.paint())}
    else if(c==="best")this.showBest();else if(c==="help_contents"||c==="help_search"||c==="help_how"){this.closeMenus();alert(SOURCE_STRINGS.help)}else if(c==="quit"){try{window.close()}catch(_){}}
    else if(c==="about")aboutDialog.showModal();
  }
  handleSourceKey(key){
    if(key==="s"||key==="S"){if(this.sound_state_code>1)this.sound_state_code=this.sound_state_code===3?2:3;this.savePreferences();return}
    if(key==="t"||key==="T"){if(this.menu_mode!==0){this.menu_mode=1;this.applyMenuMode();}return}
    if(key==="F6"){if(this.menu_mode!==0){this.menu_mode=2;this.applyMenuMode();}return}
  }
  applyMenuMode(){
    const bar=document.getElementById("menuBar");
    bar.style.display=(this.menu_mode&2)?"none":"flex";
    this.savePreferences();
    this.paint();
  }
  showBest(){
    bestRows.innerHTML=PRESETS.map((p,i)=>`<div style="margin:7px 0">${p.name}　${String(this.best[i]).padStart(3,"0")}　${this.best_names[i]||""}</div>`).join("");
    bestDialog.showModal()
  }
  showNameEntry(idx){
    if(idx<0||idx>=3)return;
    const prompt=SOURCE_STRINGS.fastest[idx];
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
game.init().catch(e=>{document.body.innerHTML="<pre>WinMine initialization failed: "+String(e)+"</pre>";console.error(e)});
