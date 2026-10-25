$('kd').onclick=e=>{const b=e.target.dataset.b;if(!b||b===S.kind)return;S.kind=b;[...$('kd').children].forEach(c=>c.classList.toggle('on',c.dataset.b===b));
 S.type='mfg';[...$('ty').children].forEach(c=>c.classList.toggle('on',c.dataset.k==='mfg'));
 const r=b!=='mailer'&&b!=='dd';S.m=b==='gable'?[302,152,182]:b==='dd'?[361,261,52]:b==='rsc'?[300,200,200]:b==='gtuck'?[120.6,60.6,161.1]:b==='tuck'?[120,60,160]:[315,202,62];cur=b==='rsc'?{c:1,i:2}:(b==='tuck'||b==='gtuck')?{c:0,i:0}:{c:1,i:1};const it=MATS[cur.c].items[cur.i];S.T=b==='dd'||b==='gable'?1.5:(b==='tuck'||b==='gtuck')?.5:it.t;TH.yaw=r?-.5:0;TH.zoom=1;TH.panX=0;TH.panY=0;
 $('matName').textContent=it.n;$('dot').style.background=it.col;$('dot').style.border=it.w?'1px solid #ebebeb':'0';setMat3d(it.col);
 // 拱型盒原站只有「製造尺寸 / 內尺寸」兩種尺寸類型，隱藏外尺寸
 [...$('ty').children].forEach(c=>{if(c.dataset.k==='out')c.style.display=b==='gable'?'none':''});$('s3').parentElement.style.display=b==='gable'?'none':'';
 fill();refit()};
function draw(){
 const [L,W,H]=S.m,T=S.T,g=({mailer:build,rsc:buildR,tuck:buildT,gtuck:(L,W,H,T)=>buildT(L,W,H,T,1),dd:buildD,gable:buildG})[S.kind](L,W,H,T),{P,Hn}=g,B=3;
 const hk=new Set(Hn.map(h=>key(h[0],h[1])));
 const cut=[];
 for(const p of P)for(const q of p.e){if(!q.c1){if(q.a[0]===q.b[0]&&q.a[1]===q.b[1])continue;if(hk.has(key(q.a,q.b)))continue}cut.push(q)}
 const cutD=(()=>{let d='',l=null;for(const q of cut){if(!l||Math.abs(l[0]-q.a[0])>1e-6||Math.abs(l[1]-q.a[1])>1e-6)d+=`M${q.a[0]} ${q.a[1]}`;d+=q.c1?`C${q.c1[0]} ${q.c1[1]} ${q.c2[0]} ${q.c2[1]} ${q.b[0]} ${q.b[1]}`:`L${q.b[0]} ${q.b[1]}`;l=q.b}return d})();
 const xs=P.flatMap(p=>p.pts.map(q=>q[0])),ys=P.flatMap(p=>p.pts.map(q=>q[1]));
 const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
 const m=Math.max(x1-x0,y1-y0)*.07,vx=x0-m,vy=y0-m,vw=x1-x0+2*m,vh=y1-y0+2*m,sw=Math.max(vw,vh)/1000,fs=sw*14;
 const pt=p=>p.map(q=>q[0].toFixed(2)+','+q[1].toFixed(2)).join(' ');
 const slots=[];if($('oSlot').checked)for(const [a,b] of g.SL)for(const x of [0,L-g.SWd])slots.push([x,a,g.SWd,b-a]);
 // T<0.85：原站在底面兩側是「開口缺口」——只有三條割線，且缺口範圍內的折線被切斷
 const notch=S.T<.85&&slots.length>0,fold=notch?Hn.flatMap(h=>{const x=h[0][0];if(x!==h[1][0]||(Math.abs(x)>1e-9&&Math.abs(x-L)>1e-9))return [h];let seg=[[Math.min(h[0][1],h[1][1]),Math.max(h[0][1],h[1][1])]];for(const [a,b] of g.SL)seg=seg.flatMap(([p,q])=>a>=q||b<=p?[[p,q]]:[[p,Math.max(p,a)],[Math.min(q,b),q]].filter(([u,v])=>v-u>1e-9));return seg.map(([p,q])=>[[x,p],[x,q]])}):Hn;
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" font-family="sans-serif">`;
 if($('oBleed').checked){const ps=P.map(p=>`<path d="${pathD(p.e)}"/>`).join(''),bw=sw*1.1;
  s+=`<g id="Bleed"><g fill="#5dbb1a" stroke="#5dbb1a" stroke-width="${2*B+bw}" stroke-linejoin="round">${ps}</g><g style="fill:@CV;stroke:@CV" stroke-width="${2*B-bw}" stroke-linejoin="round">${ps}</g></g>`}
 s+='<g id="Fill">'+P.map(p=>`<path d="${pathD(p.e)}" style="fill:@PF"/>`).join('')+'</g>';
 s+=`<g id="Fold"><path d="${fold.map(h=>`M${h[0][0]} ${h[0][1]}L${h[1][0]} ${h[1][1]}`).join('')}" stroke="#e11" stroke-width="${sw*1.1}" stroke-dasharray="${sw*3} ${sw*1.6}" fill="none"/></g>`;
 s+='<g id="Cut">';
 s+=slots.map(q=>S.T<.85?`<polyline points="${pt(slotPts(q))}" fill="none" stroke="#1c1ccf" stroke-width="${sw*1.3}" stroke-linejoin="round"/>`:`<rect x="${q[0]}" y="${q[1]}" width="${q[2]}" height="${q[3]}" rx="${q[2]/2}" style="fill:@PF" stroke="#333" stroke-width="${sw*1.3}"/>`).join('');
 s+=`<path d="${cutD}" stroke="#1c1ccf" stroke-width="${sw*1.3}" stroke-linejoin="round" fill="none"/></g>`;
 if($('oName').checked){s+='<g id="Labels">';for(const p of P){if(!p.n)continue;const a=p.pts.map(q=>q[0]),b=p.pts.map(q=>q[1]);
  s+=`<text x="${(Math.min(...a)+Math.max(...a))/2}" y="${(Math.min(...b)+Math.max(...b))/2}" font-size="${fs}" text-anchor="middle" fill="#8a91a0">${p.n}</text>`}s+='</g>'}
 if($('oDim').checked){s+='<g id="Dimensions">';const k=kk(),dv=S.m.map((v,i)=>nf((v+offs(S.type,T)[i])/k)+' '+S.unit);
  const hd=(x,y,dx,dy)=>{const a=sw*7,b=sw*3,nx=-dy,ny=dx;return `<polygon points="${x},${y} ${x-dx*a+nx*b},${y-dy*a+ny*b} ${x-dx*a-nx*b},${y-dy*a-ny*b}" fill="#1677ff"/>`};
  const dm=(ax,ay,bx,by,t)=>{const cx=(ax+bx)/2,cy=(ay+by)/2,w=t.length*fs*.6+fs*1.2,n=Math.hypot(bx-ax,by-ay)||1,ux=(bx-ax)/n,uy=(by-ay)/n;
   return `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#1677ff" stroke-width="${sw*1.1}"/>${hd(ax,ay,-ux,-uy)}${hd(bx,by,ux,uy)}<g transform="translate(${cx} ${cy})"><rect x="${-w/2}" y="${-fs*.95}" width="${w}" height="${fs*1.9}" rx="${fs*.3}" style="fill:@CV"/><text y="${fs*.35}" font-size="${fs}" text-anchor="middle" fill="#1677ff">${t}</text></g>`};
  const ddDm=(D,v)=>dm(D.ox,D.oy+D.b*.75,D.ox+D.a,D.oy+D.b*.75,v[0])+dm(D.ox+D.a*.8,D.oy,D.ox+D.a*.8,D.oy+D.b,v[1])+dm(D.ox-D.h,D.oy+D.b*.12,D.ox,D.oy+D.b*.12,v[2]);
  s+=S.kind==='gable'?dm(0,H*.62,L,H*.62,dv[0])+dm(L,H*.37,L+W,H*.37,dv[1])+dm(2*L+W+W*.747,0,2*L+W+W*.747,H,dv[2]):S.kind==='dd'?ddDm(g.D,dv)+(g.D2?ddDm(g.D2,[g.D2.a,g.D2.b,g.D2.h].map((v,i)=>nf((v+offs(S.type,T)[i])/k)+' '+S.unit)):''):S.kind==='rsc'||S.kind==='tuck'||S.kind==='gtuck'?dm(L+W+L*(S.kind==='tuck'||S.kind==='gtuck'?.75:.33),0,L+W+L*(S.kind==='tuck'||S.kind==='gtuck'?.75:.33),H,dv[2])+dm(0,H*.75,L,H*.75,dv[0])+dm(L,H*.25,L+W,H*.25,dv[1]):dm(L/2,-H,L/2,0,dv[2])+dm(L*.75,0,L*.75,W,dv[1])+dm(0,W*.9,L,W*.9,dv[0]);s+='</g>'}
 s+='</svg>';
 G={raw:s,P,cut,fold:fold.map(h=>({a:h[0],b:h[1]})),slots,vx,vy,vw,vh};
 if(!V||!touched)V={x:vx,y:vy,w:vw,h:vh};
 st.innerHTML=s.replace(/@PF/g,'var(--pf)').replace(/@CV/g,'var(--canvas)');setV();
 const k=kk(),f=a=>a.map(v=>S.unit==='in'?nf(v/k):Math.round(v*10)/10).join(' × ')+' '+S.unit;
 $('s1').textContent=f(S.m);$('s2').textContent=f(S.m.map((v,i)=>v+offs('in',T)[i]));$('s3').textContent=f(S.m.map((v,i)=>v+offs('out',T)[i]));
 build3d(P,T);syncLid(true);show()}

const TH={yaw:0,el:.55,zoom:1,panX:0,panY:0};
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
 const sc=document.createElement('canvas');sc.width=sc.height=128;const sx=sc.getContext('2d'),gr=sx.createRadialGradient(64,64,4,64,64,64);gr.addColorStop(0,'rgba(0,0,0,.38)');gr.addColorStop(1,'rgba(0,0,0,0)');sx.fillStyle=gr;sx.fillRect(0,0,128,128);
 TH.sh=new T3.Mesh(new T3.PlaneGeometry(1,1),new T3.MeshBasicMaterial({map:new T3.CanvasTexture(sc),transparent:true,depthWrite:false}));TH.spin.add(TH.sh);

 // 禁用右鍵選單，讓右鍵拖曳可直接平移 3D 畫面
 cv.addEventListener('contextmenu',e=>e.preventDefault());
 let d=null;
 cv.addEventListener('pointerdown',e=>{
  // 右鍵(button===2)、中鍵(button===1)、Shift+左鍵、或左側工具列切換為「平移手型(S.hand)」時進行平移，其餘為旋轉
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

 // 滾輪拉近 / 拉遠 (Zoom)
 cv.addEventListener('wheel',e=>{
  e.preventDefault();
  const factor = e.deltaY < 0 ? 0.9 : 1.11;
  TH.zoom = Math.min(4.0, Math.max(0.25, (TH.zoom||1) * factor));
  show();
 },{passive:false});

 // 雙擊或點選右上角 3D 按鈕重置旋轉、縮放與平移
 const reset3d=()=>{TH.yaw=S.kind==='rsc'?-.5:0;TH.el=.55;TH.zoom=1;TH.panX=0;TH.panY=0;show()};
 $('r3').onclick=reset3d;
 cv.addEventListener('dblclick',reset3d);
 new ResizeObserver(show).observe($('pvBox'))}
function build3d(P,T){
 if(!TH.r)return;const T3=THREE;
 while(TH.content.children.length){const o=TH.content.children[0];TH.content.remove(o);o.traverse(x=>{if(x.geometry)x.geometry.dispose()})}
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
  grp.add(new T3.Mesh(new T3.ExtrudeGeometry(shp,{depth:T,bevelEnabled:false}),TH.mat));
  grp.userData={p,A};by[p.id]=grp;list.push(grp)}
 for(const grp of list){const {p,A}=grp.userData;
  if(!p.par){if(p.o3){
    const xs=p.pts.map(q=>q[0]),ys=p.pts.map(q=>q[1]);
    grp.userData.lid={o3:p.o3,c:new T3.Vector3((Math.min(...xs)+Math.max(...xs))/2,-(Math.min(...ys)+Math.max(...ys))/2,0)}}
   TH.content.add(grp);continue}
  const par=by[p.par],Ap=par.userData.A;par.add(grp);grp.position.set(A[0]-Ap[0],-(A[1]-Ap[1]),0);grp.userData.y0=grp.position.y;
  const B=p.hg[1],ux=B[0]-A[0],uy=-(B[1]-A[1]),n=Math.hypot(ux,uy),cx=p.pts.reduce((a,q)=>a+q[0],0)/p.pts.length-A[0],cy=-(p.pts.reduce((a,q)=>a+q[1],0)/p.pts.length-A[1]);
  grp.userData.axis=new T3.Vector3(ux/n,uy/n,0);grp.userData.sgn=(Math.sign((ux/n)*cy-(uy/n)*cx)||1)*(p.dir||1)}
 TH.content.rotation.x=S.kind!=='mailer'&&S.kind!=='dd'?Math.PI/2:0;TH.list=list;TH.built=true;
 TH.content.position.set(0,0,0);TH.spin.rotation.z=0;TH.spin.updateMatrixWorld(true);TH.lidP=undefined;
 TH.fixBox=S.kind==='dd'?new T3.Box3().setFromObject(TH.content):null}

function syncLid(snap){}

function show(){
 if(!TH.r||!TH.built)return;const t=$('fold').value/100,T3=THREE;
 $('fold').style.setProperty('--p',$('fold').value+'%');
 for(const g of TH.list){const u=g.userData;if(!u.axis)continue;const w=u.p.w;{const x=Math.min(1,Math.max(0,(t-w[0])/(w[1]-w[0]))),k=u.p.id==='lid'?x*x:u.p.id==='flap'?Math.pow(x,2.5):sm(x),ang=u.p.ang||Math.PI/2;g.quaternion.setFromAxisAngle(u.axis,u.sgn*ang*k);if(u.p.sh)g.position.y=u.y0+u.p.sh*k}}
 for(const g of TH.list){const lid=g.userData.lid;if(!lid)continue;
  const o=lid.o3,c=lid.c,Hbox=o[3]||o[2];
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
  g.position.copy(pc).sub(c.clone().applyAxisAngle(ax,th))}
 TH.content.position.set(0,0,0);TH.spin.rotation.z=0;TH.spin.updateMatrixWorld(true);
 const bx=(TH.fixBox&&!TH.fit)?TH.fixBox:new T3.Box3().setFromObject(TH.content),c=bx.getCenter(new T3.Vector3()),sz=bx.getSize(new T3.Vector3());
 TH.content.position.set(-c.x,-c.y,-c.z);TH.spin.rotation.z=TH.yaw;
 const w=$('pvBox').clientWidth,h=$('pvBox').clientHeight;TH.r.setSize(w,h,false);TH.cam.aspect=w/h;
 const rad=sz.length()/2,fov=TH.cam.fov*Math.PI/360,baseDist=Math.max(rad/Math.sin(Math.min(fov,Math.atan(Math.tan(fov)*Math.min(1,w/h))))*1.02,10);
 const zoom=TH.fit?1:(TH.zoom||1),panX=TH.fit?0:(TH.panX||0),panY=TH.fit?0:(TH.panY||0),dist=baseDist*zoom;
 TH.lastDist=dist;
 TH.cam.position.set(panX,-dist*Math.cos(TH.el),dist*Math.sin(TH.el)+sz.z*.05+panY);
 TH.cam.lookAt(panX,0,sz.z*-.05+panY);
 TH.cam.updateProjectionMatrix();
 const m=Math.max(sz.x,sz.y)*1.5;TH.sh.scale.set(m,m*.7,1);TH.sh.position.set(0,0,-sz.z/2-.3);
 TH.r.render(TH.sc,TH.cam)}
$('fold').oninput=()=>{syncLid(false);show()};

const ERR={rejected_extension:'此檔案格式不被允許',too_large:'檔案過大',rate_limited:'操作太頻繁，請稍後再試',bad_request:'檔案內容無效',unavailable:'此環境不支援下載，請在 claude.ai 開啟'};
async function save(name,data){
 let d=null;try{d=window.claude&&claude.use?await claude.use('downloads'):null}catch(e){d=null}
 if(d){try{const r=await d.save({filename:name,data});if(r&&r.status==='saved')toast('已儲存：'+name);return}catch(e){if(e&&e.code==='declined')return}}
 try{const blob=data instanceof Blob?data:new Blob([data]),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();setTimeout(()=>a.remove(),1500);
  const e=$('toast');e.innerHTML='';e.append('已下載：'+name+'　若沒有自動下載，');const l=document.createElement('a');l.href=u;l.download=name;l.textContent='請點此儲存';l.style.cssText='color:#7cc4ff;text-decoration:underline;cursor:pointer';e.appendChild(l);e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',9000);setTimeout(()=>URL.revokeObjectURL(u),120000)}catch(e){toast('下載失敗：'+((e&&e.message)||e))}}
const slotPts=([x,y,w,h])=>{if(S.T<.85){const t=Math.min(w,S.T);return x>0?[[x+w,y],[x,y+t],[x,y+h-t],[x+w,y+h]]:[[x,y],[x+w,y+t],[x+w,y+h-t],[x,y+h]]}const r=w/2,o=[];for(let i=0;i<=8;i++){const a=Math.PI*i/8;o.push([x+r-r*Math.cos(a),y+r-r*Math.sin(a)])}for(let i=0;i<=8;i++){const a=Math.PI*i/8;o.push([x+r+r*Math.cos(a),y+h-r+r*Math.sin(a)])}return o};
const pick=id=>{document.querySelectorAll('.fb button').forEach(b=>b.classList.toggle('on',b.id===id))};
const svgOut=()=>G.raw.replace(/@PF/g,'#ffffff').replace(/@CV/g,'#ffffff').replace('<svg ',`<svg width="${G.vw.toFixed(3)}mm" height="${G.vh.toFixed(3)}mm" `);
const svgBlob=()=>new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n'+svgOut()],{type:'image/svg+xml'});
const toPng=(svg,w,h,name)=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);c.toBlob(b=>save(name,b),'image/png')};img.onerror=()=>toast('圖片轉換失敗');
 img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)};
$('dAI').onclick=()=>{pick('dAI');save(nm()+'.svg',svgBlob())};
$('dPNG').onclick=()=>{pick('dPNG');if(!TH.r){toast('3D 預覽載入失敗');return}TH.fit=true;syncLid(true);show();const s=TH.r.domElement,c=document.createElement('canvas');c.width=s.width;c.height=s.height;const x=c.getContext('2d'),gr=x.createLinearGradient(0,0,0,c.height);gr.addColorStop(0,'#b9b9b9');gr.addColorStop(1,'#ebebeb');x.fillStyle=gr;x.fillRect(0,0,c.width,c.height);x.drawImage(s,0,0);TH.fit=false;show();c.toBlob(b=>save(nm().replace('刀模','')+'3D樣機.jpg',b),'image/jpeg',.92)};
$('dPDF').onclick=()=>{pick('dPDF');const sc=2.83465,w=G.vw*sc,h=G.vh*sc,X=x=>((x-G.vx)*sc).toFixed(2),Y=y=>(h-(y-G.vy)*sc).toFixed(2);
 const ln=a=>a.map(q=>q.c1?`${X(q.a[0])} ${Y(q.a[1])} m ${X(q.c1[0])} ${Y(q.c1[1])} ${X(q.c2[0])} ${Y(q.c2[1])} ${X(q.b[0])} ${Y(q.b[1])} c`:`${X(q.a[0])} ${Y(q.a[1])} m ${X(q.b[0])} ${Y(q.b[1])} l`).join('\n')+'\nS\n';
 const sl=G.slots.map(q=>{const a=slotPts(q);return a.map((v,i)=>`${X(v[0])} ${Y(v[1])} ${i?'l':'m'}`).join('\n')+(S.T<.85?'\nS\n':'\nh S\n')}).join('');
 const c=`1 0 0 RG 0.6 w [3 2] 0 d\n${ln(G.fold)}0 0 0.8 RG 0.8 w [] 0 d\n${ln(G.cut)}${sl}`;
 const o=['<</Type/Catalog/Pages 2 0 R>>','<</Type/Pages/Kids[3 0 R]/Count 1>>',`<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${w.toFixed(2)} ${h.toFixed(2)}]/Contents 4 0 R>>`,`<</Length ${new TextEncoder().encode(c).length}>>\nstream\n${c}endstream`];
 let p='%PDF-1.4\n',off=[];o.forEach((b,i)=>{off.push(p.length);p+=`${i+1} 0 obj\n${b}\nendobj\n`});
 const xr=p.length;p+=`xref\n0 ${o.length+1}\n0000000000 65535 f \n`+off.map(v=>String(v).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<</Size ${o.length+1}/Root 1 0 R>>\nstartxref\n${xr}\n%%EOF`;
 save(nm()+'.pdf',new Blob([new TextEncoder().encode(p)],{type:'application/pdf'}))};
function crc32(u){let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}let r=-1;for(const b of u)r=t[(r^b)&255]^(r>>>8);return(r^-1)>>>0}
function zip(name,text){const e=new TextEncoder(),nm=e.encode(name),d=e.encode(text),c=crc32(d),n=d.length;
 const u32=v=>[v&255,v>>8&255,v>>16&255,v>>>24&255],u16=v=>[v&255,v>>8&255];
 const lh=[0x50,0x4b,3,4,...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0x21),...u32(c),...u32(n),...u32(n),...u16(nm.length),...u16(0)];
 const cd=[0x50,0x4b,1,2,...u16(20),...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0x21),...u32(c),...u32(n),...u32(n),...u16(nm.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(0)];
 const eo=[0x50,0x4b,5,6,0,0,0,0,...u16(1),...u16(1),...u32(cd.length+nm.length),...u32(lh.length+nm.length+n),...u16(0)];
 return new Blob([new Uint8Array(lh),nm,d,new Uint8Array(cd),nm,new Uint8Array(eo)],{type:'application/zip'})}
$('dDXF').onclick=()=>{pick('dDXF');let t=`0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n9\n$MEASUREMENT\n70\n1\n9\n$LUNITS\n70\n2\n9\n$EXTMIN\n10\n${G.vx.toFixed(3)}\n20\n${(-G.vy-G.vh).toFixed(3)}\n30\n0\n9\n$EXTMAX\n10\n${(G.vx+G.vw).toFixed(3)}\n20\n${(-G.vy).toFixed(3)}\n30\n0\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLTYPE\n70\n1\n0\nLTYPE\n2\nCONTINUOUS\n70\n0\n3\nSolid line\n72\n65\n73\n0\n40\n0\n0\nENDTAB\n0\nTABLE\n2\nLAYER\n70\n2\n0\nLAYER\n2\nCUT\n70\n0\n62\n5\n6\nCONTINUOUS\n0\nLAYER\n2\nCREASE\n70\n0\n62\n1\n6\nCONTINUOUS\n0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;
 const L=(a,b,ly,co)=>t+=`0\nLINE\n8\n${ly}\n62\n${co}\n10\n${a[0].toFixed(3)}\n20\n${(-a[1]).toFixed(3)}\n30\n0\n11\n${b[0].toFixed(3)}\n21\n${(-b[1]).toFixed(3)}\n31\n0\n`;
 G.cut.forEach(q=>{if(!q.c1)return L(q.a,q.b,'CUT',5);let l=q.a;for(let i=1;i<=24;i++){const m=bz(q,i/24);L(l,m,'CUT',5);l=m}});G.fold.forEach(q=>L(q.a,q.b,'CREASE',1));
 G.slots.forEach(q=>{const p=slotPts(q);p.forEach((a,i)=>{if(!(S.T<.85&&i===p.length-1))L(a,p[(i+1)%p.length],'CUT',5)})});
 t+='0\nENDSEC\n0\nEOF\n';save(nm()+'_DXF.zip',zip(nm()+'.dxf',t))};
init3d();$('stage').classList.add('sel');fill();draw();
// ===== 主畫面：刀模縮圖 + 3D 樣機縮圖 =====
function go(v){$('home').style.display=v==='home'?'block':'none';document.querySelector('.app').style.display=v==='home'?'none':'';
 if(v!=='home'){refit();syncLid(true);show()}else scrollTo(0,0)}
function openKind(b){const btn=$('kd').querySelector('[data-b="'+b+'"]');if(b!==S.kind)btn.click();go('edit')}
function thumbSVG(){
 let d='',l=null;for(const q of G.cut){if(!l||Math.abs(l[0]-q.a[0])>1e-6||Math.abs(l[1]-q.a[1])>1e-6)d+=`M${q.a[0]} ${q.a[1]}`;d+=q.c1?`C${q.c1[0]} ${q.c1[1]} ${q.c2[0]} ${q.c2[1]} ${q.b[0]} ${q.b[1]}`:`L${q.b[0]} ${q.b[1]}`;l=q.b}
 const fd=G.fold.map(h=>`M${h.a[0]} ${h.a[1]}L${h.b[0]} ${h.b[1]}`).join('');
 const sl=G.slots.map(q=>'M'+slotPts(q).map(v=>v[0]+' '+v[1]).join('L')+'Z').join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${G.vx} ${G.vy} ${G.vw} ${G.vh}" preserveAspectRatio="xMidYMid meet"><path d="${fd}" stroke="#e4535e" stroke-width="1" vector-effect="non-scaling-stroke" fill="none"/><path d="${d}${sl}" stroke="#4d52a6" stroke-width="1" vector-effect="non-scaling-stroke" stroke-linejoin="round" fill="none"/></svg>`}
function makeThumbs(){
 const cfg={mailer:{fold:76,yaw:.6},rsc:{fold:76,yaw:-.5},tuck:{fold:88,yaw:-.5},gtuck:{fold:88,yaw:-.5},dd:{fold:92,yaw:.6},gable:{fold:96,yaw:-.5}};
 document.querySelectorAll('.gi').forEach(g=>{const b=g.dataset.b;
  if(b!==S.kind)$('kd').querySelector('[data-b="'+b+'"]').click();
  g.querySelector('.dl').innerHTML=thumbSVG();
  if(TH.r){$('fold').value=cfg[b].fold;TH.yaw=cfg[b].yaw;TH.fit=true;syncLid(true);show();TH.fit=false;g.querySelector('.pr img').src=TH.r.domElement.toDataURL('image/png')}
  else g.querySelector('.pr').style.display='none'});
 if(S.kind!=='mailer')$('kd').querySelector('[data-b="mailer"]').click();
 $('fold').value=100;TH.yaw=0;TH.el=.55;TH.zoom=1;TH.panX=0;TH.panY=0;syncLid(true);show()}
document.querySelectorAll('.gi').forEach(g=>g.onclick=()=>openKind(g.dataset.b));
$('back').onclick=()=>go('home');

// ===== 樣機資源庫：單欄由上往下排列，點選即切換刀模 =====
const MK=[{b:'mailer',n:'飛機盒',c:'折疊盒'},{b:'rsc',n:'方形運輸箱',c:'運輸箱'},{b:'tuck',n:'插口式軟件盒',c:'插口盒'},{b:'gtuck',n:'插口式遊戲盒',c:'插口盒'},{b:'gable',n:'手提拱型盒',c:'手提盒'},{b:'dd',n:'天地盒',c:'禮盒'}];
let mkSeg='lib',mkCat='全部',mkQ='';
function renderMock(){
 const cats=['全部',...new Set(MK.map(m=>m.c))];
 $('mkChips').innerHTML=cats.map(c=>`<span class="${c===mkCat?'on':''}" data-c="${c}">${c}</span>`).join('');
 const l=MK.filter(m=>(mkCat==='全部'||m.c===mkCat)&&m.n.includes(mkQ));
 $('mkList').innerHTML=mkSeg==='mine'?'<div class="mk-empty">尚無儲存的樣機</div>':l.length?l.map(m=>`<div class="mk-c${m.b===S.kind?' on':''}" data-b="${m.b}"><div class="mk-p"></div><div class="mk-n">${m.n}</div></div>`).join(''):'<div class="mk-empty">找不到符合的刀模</div>';
 $('mkList').querySelectorAll('.mk-c').forEach(c=>{const g=document.querySelector('.gi[data-b="'+c.dataset.b+'"]'),im=g&&g.querySelector('.pr img'),p=c.firstChild;
  if(im&&im.getAttribute('src'))p.innerHTML='<img src="'+im.src+'" alt="">';else if(g)p.innerHTML=g.querySelector('.dl').innerHTML})}
$('mkSeg').onclick=e=>{const v=e.target.dataset.s;if(!v)return;mkSeg=v;[...$('mkSeg').children].forEach(c=>c.classList.toggle('on',c.dataset.s===v));renderMock()};
$('mkQ').oninput=e=>{mkQ=e.target.value.trim();renderMock()};
$('mkChips').onclick=e=>{const c=e.target.dataset.c;if(!c)return;mkCat=c;renderMock()};
$('mkList').onclick=e=>{const c=e.target.closest('.mk-c');if(!c)return;const b=c.dataset.b;if(b!==S.kind)$('kd').querySelector('[data-b="'+b+'"]').click();tab('base')};
makeThumbs();go('home');