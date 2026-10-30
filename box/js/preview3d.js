// ===== 3D 樣機預覽：貼圖、場景、摺疊動畫、視角控制 =====
const TH={yaw:0,el:.55,zoom:1,panX:0,panY:0,mode:'full',view:'2d'};
const sm=x=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x)};
const hex2=h=>{h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.substr(i,2),16))};
const mixc=(c,t,k)=>c.map((v,i)=>Math.round(v+(t[i]-v)*k));
function tex(col){const base=hex2(col||'#caaa81'),dk=mixc(base,[60,38,18],.55),lt=mixc(base,[255,255,255],.55),lum=(base[0]+base[1]+base[2])/765,
 c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
 x.fillStyle=`rgb(${base})`;x.fillRect(0,0,512,512);
 for(let i=0;i<4500;i++){x.fillStyle=Math.random()<.6?`rgba(${dk},${.05+Math.random()*.12})`:`rgba(${lt},${.06+Math.random()*.12})`;x.fillRect(Math.random()*512,Math.random()*512,1+Math.random()*2.5,1+Math.random()*2.5)}
 x.strokeStyle=`rgba(${dk},.10)`;for(let i=0;i<220;i++){const a=Math.random()*512,b=Math.random()*512,t=Math.random()*6.28;x.beginPath();x.moveTo(a,b);x.lineTo(a+Math.cos(t)*14,b+Math.sin(t)*14);x.stroke()}
 x.save();x.translate(256,256);x.rotate(-.5);x.font='bold 30px sans-serif';x.textAlign='center';x.fillStyle=lum>.9?'rgba(0,0,0,.06)':`rgba(${lt},.34)`;x.fillText('Preview',0,0);x.restore();
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1/150,1/150);t.anisotropy=4;return t}
function setMat3d(col){if(!TH.mat)return;if(TH.mat.map)TH.mat.map.dispose();TH.mat.map=tex(col);TH.mat.needsUpdate=true;show()}
function init3d(){
 if(!window.THREE){$('pvBox').style.display='none';return}
 const T3=THREE,cv=$('pvc');
 TH.r=new T3.WebGLRenderer({canvas:cv,antialias:true,alpha:true,preserveDrawingBuffer:true});TH.r.setPixelRatio(Math.min(devicePixelRatio||1,2));
 TH.sc=new T3.Scene();TH.cam=new T3.PerspectiveCamera(26,1,1,30000);TH.cam.up.set(0,0,1);
 TH.sc.add(new T3.AmbientLight(0xffffff,.5));
 const d1=new T3.DirectionalLight(0xffffff,.42);d1.position.set(-300,-500,800);TH.sc.add(d1);
 const d2=new T3.DirectionalLight(0xffffff,.14);d2.position.set(500,300,200);TH.sc.add(d2);const d3=new T3.DirectionalLight(0xffffff,.3);d3.position.set(0,-800,250);TH.sc.add(d3);
 TH.spin=new T3.Group();TH.sc.add(TH.spin);TH.content=new T3.Group();TH.spin.add(TH.content);
 TH.mat=new T3.MeshLambertMaterial({map:tex(MATS[cur.c].items[cur.i].col),side:T3.DoubleSide});
 // 檢視模式材質：透視＝半透明面＋全部線條；透視隱藏線＝面只寫深度不上色，線條做深度測試（被擋住的線消失）
 TH.matX=new T3.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.1,side:T3.DoubleSide,depthWrite:false});
 TH.matH=new T3.MeshBasicMaterial({colorWrite:false,side:T3.DoubleSide,polygonOffset:true,polygonOffsetFactor:2,polygonOffsetUnits:2});
 TH.lnX=new T3.LineBasicMaterial({color:0x1f2937,transparent:true,depthTest:false});
 TH.lnH=new T3.LineBasicMaterial({color:0x1f2937});
 const sc=document.createElement('canvas');sc.width=sc.height=128;const sx=sc.getContext('2d'),gr=sx.createRadialGradient(64,64,4,64,64,64);gr.addColorStop(0,'rgba(0,0,0,.38)');gr.addColorStop(1,'rgba(0,0,0,0)');sx.fillStyle=gr;sx.fillRect(0,0,128,128);
 TH.sh=new T3.Mesh(new T3.PlaneGeometry(1,1),new T3.MeshBasicMaterial({map:new T3.CanvasTexture(sc),transparent:true,depthWrite:false}));TH.spin.add(TH.sh);

 cv.addEventListener('contextmenu',e=>e.preventDefault());
 let d=null;
 cv.addEventListener('pointerdown',e=>{
  const isPan = e.button===2 || e.button===1 || e.shiftKey || S.hand;
  d={x:e.clientX,y:e.clientY,pan:isPan};
  cv.setPointerCapture(e.pointerId);
 });
 cv.addEventListener('pointermove',e=>{
  if(!d)return;
  const dx=e.clientX-d.x, dy=e.clientY-d.y;
  if(d.pan){
   const k=(TH.lastDist||500)*0.0012;
   TH.panX-=dx*k;
   TH.panY+=dy*k;
  }else{
   TH.yaw+=dx*.01;
   TH.el=Math.min(1.45,Math.max(.12,TH.el+dy*.008));
  }
  d.x=e.clientX;d.y=e.clientY;
  show();
 });
 cv.addEventListener('pointerup',()=>d=null);
 cv.addEventListener('pointercancel',()=>d=null);

 cv.addEventListener('wheel',e=>{
  e.preventDefault();
  const factor = e.deltaY < 0 ? 0.9 : 1.11;
  TH.zoom = Math.min(4.0, Math.max(0.25, (TH.zoom||1) * factor));
  show();
 },{passive:false});

 const reset3d=()=>{TH.yaw=S.kind==='rsc'?-.5:0;TH.el=.55;TH.zoom=1;TH.panX=0;TH.panY=0;show()};
 $('r3').onclick=reset3d;
 cv.addEventListener('dblclick',reset3d);
 new ResizeObserver(show).observe($('pvBox'))}

function build3d(P,T){
 if(!TH.r)return;const T3=THREE;
 while(TH.content.children.length){const o=TH.content.children[0];TH.content.remove(o);o.traverse(x=>{if(x.geometry)x.geometry.dispose()})}
 TH.div=false;if(S.kind==='divider'){buildDiv3d(P,T);return}
 const by={},list=[];
 for(const p of P){if(!p.id)continue;const A=p.hg?p.hg[0]:[0,0],pts=[];
  for(const q of p.pts){const v=[q[0]-A[0],-(q[1]-A[1])],l=pts[pts.length-1];if(!l||Math.hypot(l.x-v[0],l.y-v[1])>1e-6)pts.push(new T3.Vector2(v[0],v[1]))}
  if(pts.length>2&&pts[0].distanceTo(pts[pts.length-1])<1e-6)pts.pop();
  const grp=new T3.Group();const shp=new T3.Shape(pts);
  for(const [hx,hy,hw,hh] of p.holes||[]){const x0=hx+.25,x1=hx+hw-.25,r=(x1-x0)/2,cx=(x0+x1)/2,hp=[];
   for(let i=0;i<=12;i++){const a=Math.PI*i/12;hp.push([cx+r*Math.cos(a),hy+r-r*Math.sin(a)])}
   for(let i=0;i<=12;i++){const a=Math.PI*i/12;hp.push([cx-r*Math.cos(a),hy+hh-r+r*Math.sin(a)])}
   shp.holes.push(new T3.Path(hp.map(q=>new T3.Vector2(q[0]-A[0],-(q[1]-A[1])))))}
  for(const [cx,cy,w,h] of p.hs||[]){const r=h/2,a=w/2-r,hp=[];
   for(let i=0;i<=12;i++){const t=-Math.PI/2+Math.PI*i/12;hp.push([cx+a+r*Math.cos(t),cy+r*Math.sin(t)])}
   for(let i=0;i<=12;i++){const t=Math.PI/2+Math.PI*i/12;hp.push([cx-a+r*Math.cos(t),cy+r*Math.sin(t)])}
   shp.holes.push(new T3.Path(hp.map(q=>new T3.Vector2(q[0]-A[0],-(q[1]-A[1])))))}
  const geo=new T3.ExtrudeGeometry(shp,{depth:T,bevelEnabled:false});grp.add(new T3.Mesh(geo,TH.mat));
  const eg=new T3.LineSegments(new T3.EdgesGeometry(geo,25),TH.lnH);eg.renderOrder=1;eg.visible=false;grp.add(eg);
  grp.userData={p,A};by[p.id]=grp;list.push(grp)}
 for(const grp of list){const {p,A}=grp.userData;
  if(!p.par){if(p.o3){
    const xs=p.pts.map(q=>q[0]),ys=p.pts.map(q=>q[1]);
    grp.userData.lid={o3:p.o3,c:new T3.Vector3((Math.min(...xs)+Math.max(...xs))/2,-(Math.min(...ys)+Math.max(...ys))/2,0)}}
   TH.content.add(grp);continue}
  const par=by[p.par],Ap=par.userData.A;par.add(grp);grp.position.set(A[0]-Ap[0],-(A[1]-Ap[1]),0);grp.userData.y0=grp.position.y;
  const B=p.hg[1],ux=B[0]-A[0],uy=-(B[1]-A[1]),n=Math.hypot(ux,uy),cx=p.pts.reduce((a,q)=>a+q[0],0)/p.pts.length-A[0],cy=-(p.pts.reduce((a,q)=>a+q[1],0)/p.pts.length-A[1]);
  grp.userData.axis=new T3.Vector3(ux/n,uy/n,0);grp.userData.sgn=(Math.sign((ux/n)*cy-(uy/n)*cx)||1)*(p.dir||1)}
 TH.content.rotation.x=S.kind!=='mailer'&&S.kind!=='dd'&&S.kind!=='drawer'?Math.PI/2:0;TH.list=list;TH.built=true;
 TH.content.position.set(0,0,0);TH.spin.rotation.z=0;TH.spin.updateMatrixWorld(true);TH.lidP=undefined;
 TH.fixBox=(S.kind==='dd'||S.kind==='drawer')?new T3.Box3().setFromObject(TH.content):null;applyMode()}

function buildDiv3d(P,T){
 const T3=THREE,[L,W,H]=S.m,V3=(x,y,z)=>new T3.Vector3(x,y,z),
  all=P.flatMap(p=>p.pts),mx=Math.min(...all.map(q=>q[0])),Mx=Math.max(...all.map(q=>q[0])),my=Math.min(...all.map(q=>q[1])),My=Math.max(...all.map(q=>q[1])),
  offx=L/2-(mx+Mx)/2,offy=W/2+(my+My)/2,list=[];
 for(const p of P){const d=p.dv;if(!d)continue;
  const pts=[];for(const q of p.pts){const v=new T3.Vector2(q[0]-d.ox,d.oy+d.b-q[1]),l=pts[pts.length-1];if(!l||l.distanceTo(v)>1e-6)pts.push(v)}
  if(pts.length>2&&pts[0].distanceTo(pts[pts.length-1])<1e-6)pts.pop();
  const g=new T3.Group(),geo=new T3.ExtrudeGeometry(new T3.Shape(pts),{depth:T,bevelEnabled:false});g.add(new T3.Mesh(geo,TH.mat));
  {const eg=new T3.LineSegments(new T3.EdgesGeometry(geo,25),TH.lnH);eg.renderOrder=1;eg.visible=false;g.add(eg)}
  const A=d.kind==='A',m=new T3.Matrix4().makeBasis(A?V3(1,0,0):V3(0,1,0),V3(0,0,1),A?V3(0,-1,0):V3(1,0,0));
  g.userData={dv:d.kind,qf:new T3.Quaternion(),qa:new T3.Quaternion().setFromRotationMatrix(m),
   pf:V3(d.ox+offx,-(d.oy+d.b)+offy,0),pa:A?V3(0,d.s+T,0):V3(d.s,0,0)};
  g.position.copy(g.userData.pf);TH.content.add(g);list.push(g)}
 TH.content.rotation.x=0;TH.list=list;TH.built=true;TH.div=true;TH.fixBox=null;TH.lidP=undefined;
 TH.content.position.set(0,0,0);TH.spin.rotation.z=0;TH.spin.updateMatrixWorld(true);applyMode()}

function poseDiv(t){
 const H=S.m[2];
 for(const g of TH.list){const u=g.userData,e=u.dv==='A'?sm(t/.8):sm((t-.2)/.8);
  g.quaternion.copy(u.qf).slerp(u.qa,e);g.position.lerpVectors(u.pf,u.pa,e);g.position.z+=Math.sin(Math.PI*e)*H*.5}}
function syncLid(snap){}

function show(){
 if(!TH.r||!TH.built)return;const t=$('fold').value/100,T3=THREE;
 $('fold').style.setProperty('--p',$('fold').value+'%');
 for(const g of TH.list){const u=g.userData;if(!u.axis)continue;const w=u.p.w;{const x=Math.min(1,Math.max(0,(t-w[0])/(w[1]-w[0]))),k=u.p.bump?Math.sin(Math.PI*x):u.p.id==='lid'?x*x:u.p.id==='flap'?Math.pow(x,2.5):sm(x),ang=u.p.bump||u.p.ang||Math.PI/2;g.quaternion.setFromAxisAngle(u.axis,u.sgn*ang*k);if(u.p.sh)g.position.y=u.y0+u.p.sh*k}}
 
 for(const g of TH.list){const lid=g.userData.lid;if(!lid)continue;
  const o=lid.o3,c=lid.c,Hbox=o[3]||o[2];
  if(S.kind==='drawer'){
   // 抽屜滑入動作：折疊進度在 0.70 ~ 0.98 時托盤平滑滑入套筒
   const eSlide=sm((t-0.70)/(0.98-0.70));
   g.position.x=o[0]*eSlide;
  }else{
   // 天地盒蓋子翻轉動作
   const eMove=sm((t-0.74)/(0.90-0.74));
   const eFlip=sm((t-0.74)/(0.89-0.74));
   const eDrop=sm((t-0.88)/(0.96-0.88));
   const th=Math.PI*eFlip;
   const cf=new T3.Vector3(c.x+o[0],o[1],o[2]),pc=c.clone().lerp(cf,eMove);
   const arcZ=Math.max(20,Hbox*1.35)*Math.sin(Math.PI*eMove);
   const hoverZ=Hbox*1.15*eMove*(1-eDrop);
   pc.z+=arcZ+hoverZ;
   const tilt=(1-eFlip)*0.85;
   const ax=new T3.Vector3(1,-tilt,0).normalize();
   g.quaternion.setFromAxisAngle(ax,th);
   g.position.copy(pc).sub(c.clone().applyAxisAngle(ax,th));
  }
 }
 if(TH.div)poseDiv(t);
 TH.content.position.set(0,0,0);TH.spin.rotation.z=0;TH.spin.updateMatrixWorld(true);
 const bx=(TH.fixBox&&!TH.fit)?TH.fixBox:new T3.Box3().setFromObject(TH.content),c=bx.getCenter(new T3.Vector3()),sz=bx.getSize(new T3.Vector3());
 TH.content.position.set(-c.x,-c.y,-c.z);TH.spin.rotation.z=TH.yaw;
 const w=$('pvBox').clientWidth,h=$('pvBox').clientHeight;TH.r.setSize(w,h,false);TH.cam.aspect=w/h;
 const rad=sz.length()/2,fov=TH.cam.fov*Math.PI/360,baseDist=Math.max(rad/Math.sin(Math.min(fov,Math.atan(Math.tan(fov)*Math.min(1,w/h))))*1.02,10);
 const zoom=TH.fit?1:(TH.zoom||1),panX=TH.fit?0:(TH.panX||0),panY=TH.fit?0:(TH.panY||0),dist=baseDist*zoom;
 TH.lastDist=dist;
 TH.cam.position.set(panX,-dist*Math.cos(TH.el),dist*Math.sin(TH.el)+sz.z*.05+panY);
 TH.cam.lookAt(panX,0,sz.z*-.05+panY);
 {const pr=Math.hypot(panX,panY),mg=rad*1.6+pr;TH.cam.near=Math.max(dist-mg,dist*.05,.5);TH.cam.far=dist+mg+rad;}
 TH.cam.updateProjectionMatrix();
 const m=Math.max(sz.x,sz.y)*1.5;TH.sh.scale.set(m,m*.7,1);TH.sh.position.set(0,0,-sz.z/2-.3);TH.sh.visible=TH.mode==='full';
 TH.r.render(TH.sc,TH.cam)}
$('fold').oninput=()=>{syncLid(false);show()};

// ===== 檢視模式：全彩 / 透視 / 透視隱藏線 =====
function applyMode(){
 if(!TH.content)return;const m=TH.mode;
 TH.content.traverse(o=>{
  if(o.isMesh)o.material=m==='xray'?TH.matX:m==='hidden'?TH.matH:TH.mat;
  else if(o.isLineSegments){o.visible=m!=='full';o.material=m==='xray'?TH.lnX:TH.lnH}});
 if(TH.sh)TH.sh.visible=m==='full'}
$('vm').onclick=e=>{const m=e.target.dataset.m;if(!m||m===TH.mode)return;TH.mode=m;[...$('vm').children].forEach(c=>c.classList.toggle('on',c.dataset.m===m));applyMode();show()};

// ===== 主畫面切換：刀模 ⇄ 3D（3D 時刀模縮成右上小圖，點小圖可切回） =====
function miniSync(){
 if(TH.view!=='3d'||!G.raw)return;const m=$('mini');
 m.innerHTML=G.raw.replace(/@PF/g,'#fff').replace(/@CV/g,'#fff').replace('<svg ','<svg style="width:100%;height:100%;display:block" ');
 m.querySelectorAll('#Dimensions,#Labels').forEach(e=>e.remove())}
function setView(v){
 if(!window.THREE)return;const is3=v==='3d';TH.view=v;
 $('mid').classList.toggle('m3d',is3);[...$('vt').children].forEach(c=>c.classList.toggle('on',c.dataset.v===v));
 if(is3){$('pvMain').appendChild($('pvBox'));$('mini').style.display='';miniSync()}
 else{$('pvSlot').appendChild($('pvBox'));$('mini').style.display='none'}
 requestAnimationFrame(show);show()}
$('vt').onclick=e=>{const v=e.target.dataset.v;if(v&&v!==TH.view)setView(v)};
$('mini').onclick=()=>setView('2d');
if(!window.THREE)$('vt').style.display='none';
