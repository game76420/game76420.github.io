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
 const cfg={mailer:{fold:76,yaw:.6},tgable:{fold:96,yaw:-.5},rsc:{fold:76,yaw:-.5},tuck:{fold:88,yaw:-.5},gtuck:{fold:88,yaw:-.5},dd:{fold:92,yaw:.6},gable:{fold:96,yaw:-.5}};
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
const MK=[
 {b:'tgable',n:'插口端山形盒',c:'手提盒'},
 {b:'mailer',n:'飛機盒',c:'折疊盒'},
 {b:'rsc',n:'方形運輸箱',c:'運輸箱'},
 {b:'tuck',n:'插口式軟件盒',c:'插口盒'},
 {b:'gtuck',n:'插口式遊戲盒',c:'插口盒'},
 {b:'gable',n:'手提拱型盒',c:'手提盒'},
 {b:'dd',n:'天地盒',c:'禮盒'}
];
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

// ===== 啟動 =====
init3d();$('stage').classList.add('sel');fill();draw();
makeThumbs();go('home');