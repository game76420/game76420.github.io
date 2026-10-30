// ===== 首頁刀模縮圖、樣機資源庫與啟動 =====
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
 const cfg={mailer:{fold:76,yaw:.6},tgable:{fold:96,yaw:-.5},rsc:{fold:76,yaw:-.5},tuck:{fold:88,yaw:-.5},gtuck:{fold:88,yaw:-.5},tuckgb:{fold:90,yaw:-.5},dd:{fold:92,yaw:.6},gable:{fold:96,yaw:-.5},divider:{fold:100,yaw:-.5},drawer:{fold:80,yaw:.4}};
 document.querySelectorAll('.gi').forEach(g=>{const b=g.dataset.b;
  if(b!==S.kind)$('kd').querySelector('[data-b="'+b+'"]').click();
  g.querySelector('.dl').innerHTML=thumbSVG();
  if(TH.r){$('fold').value=cfg[b].fold;TH.yaw=cfg[b].yaw;TH.fit=true;syncLid(true);show();TH.fit=false;g.querySelector('.pr img').src=TH.r.domElement.toDataURL('image/png')}
  else g.querySelector('.pr').style.display='none'});
 if(S.kind!=='mailer')$('kd').querySelector('[data-b="mailer"]').click();
 $('fold').value=100;TH.yaw=0;TH.el=.55;TH.zoom=1;TH.panX=0;TH.panY=0;syncLid(true);show()}
document.querySelectorAll('.gi').forEach(g=>g.onclick=()=>openKind(g.dataset.b));
$('back').onclick=()=>go('home');


// ===== 啟動 =====
init3d();$('stage').classList.add('sel');fill();draw();
makeThumbs();go('home');