const $=id=>document.getElementById(id),r2=v=>Math.round(v*100)/100;
// 內/外尺寸偏移：以原站實測的 T=1.5 / 3 / 5 三個節點做分段線性內插
// 補償表（製造尺寸 → 內/外尺寸的差值 [長,寬,高]），依厚度分段線性內插
// v11 以原站截圖重新擬合（製造 100×50×50）：T=0.5/0.8/0.9 三組實測值皆可精確還原
// 內：長在 0.8→0.9 幾乎持平（結構切換），其餘邊近似 1.2·T；外：長/高≈0.8·T，寬≈1.8·T
const KT=[.5,.8,.9,1.5,3,5],
KI=[[3.6,.6,.6],[7.9,.96,.96],[8.3,1.08,1.08],[15,2,2],[28,4,4],[46,6,6]],
KO=[[.4,.9,.4],[.64,1.44,.64],[.72,1.62,.72],[1,2.5,1],[2,5,2],[4,9,4]];
const lerpK=(K,T)=>{let a,b;
 if(T<KT[0]){a=0;b=3}               // 低於 0.5mm：沿用 0.5→1.5 的斜率外推（無截圖資料）
 else{b=1;while(b<KT.length-1&&T>KT[b])b++;a=b-1}
 const t=(T-KT[a])/(KT[b]-KT[a]);return K[a].map((v,j)=>v+(K[b][j]-v)*t)};
const TKT=[.2,.5,1,2,3],TKI=[[.2,.2,.2],[.6,.6,1.1],[1,1,2],[2,2,3],[4,4,6]],TKO=[[.2,.2,.6],[.4,.4,.9],[1,1,2],[2,2,5],[2,2,6]];
const tkO=(t,T)=>t==='mfg'?[0,0,0]:(t==='in'?lerpK2(TKI,T).map(v=>-v):lerpK2(TKO,T));
function lerpK2(K,T){T=Math.min(3,Math.max(.2,T));let b=1;while(b<TKT.length-1&&T>TKT[b])b++;const a=b-1,t=(T-TKT[a])/(TKT[b]-TKT[a]);return K[a].map((v,j)=>v+(K[b][j]-v)*t)}
const gtO=(t,T)=>{if(t==='mfg')return[0,0,0];const X=[.2,.5,1.5,3],I=[[.2,.2,.2],[.6,.6,1.1],[2,2,3.5],[4,4,7]],O=[[.2,.2,.6],[.4,.4,.9],[1,1,2.5],[2,2,5]],K=t==='in'?I:O;T=Math.min(3,Math.max(.2,T));let b=1;while(b<3&&T>X[b])b++;const a=b-1,f=(T-X[a])/(X[b]-X[a]),v=K[a].map((q,j)=>q+(K[b][j]-q)*f);return t==='in'?v.map(q=>-q):v};
// 天地盒內/外尺寸補償：依原版兩張截圖校準。
const DKT=[.2,.5,1,1.5,2,3,4,5],
DKI=[[4.2,4.2,.2],[4.4,4.4,.6],[7,7,1],[11,11,2],[12,12,2],[20,20,4],[27,27,5],[34,34,6]],
DKO=[[4.7,4.7,.6],[5.7,5.7,1.4],[9.5,9.5,3],[15,15,4],[17,17,6],[28,28,8],[37.5,37.5,11],[47,47,14]];
const ddO=(t,T)=>t==='mfg'?[0,0,0]:[0,1,2].map(j=>(t==='in'?-1:1)*ip(T,DKT,(t==='in'?DKI:DKO).map(r=>r[j])));
const offs=(t,T)=>t==='mfg'?[0,0,0]:S.kind==='dd'?ddO(t,T):S.kind==='rsc'?(t==='in'?[-T,-T,-T]:[T,T,T]):S.kind==='gtuck'?gtO(t,T):S.kind==='tuck'?tkO(t,T):t==='in'?lerpK(KI,T).map((v,i)=>-(v+(i===0?Math.max(0,1.5-T)*Math.min(1,Math.max(0,(S.m[2]-22)/28))+.0606*(Math.min(100,Math.max(22,S.m[2]))-62)*Math.min(1,Math.max(0,(T-.9)/.6)):0))):lerpK(KO,T);
// 厚度上限隨高度變化（原站：H=62→5mm，H=100→3mm）
const maxT=()=>S.kind==='tuck'||S.kind==='gtuck'?(Math.min(...S.m)<=30?.5:Math.min(...S.m)<=55?1.5:3):S.kind==='dd'?(Math.min(S.m[1],S.m[2])<=30?.5:Math.min(5,Math.max(.5,Math.floor(S.m[0]*.04)/2))):S.kind==='rsc'?5:S.m[0]>=250?5:S.m[0]>=60?3:.5;
const S={unit:'mm',type:'mfg',kind:'mailer',m:[315,202,62],T:2,hand:false};
const nm=()=>S.kind==='dd'?'天地盒刀模':S.kind==='gtuck'?'插口式遊戲盒刀模':S.kind==='rsc'?'方形運輸箱刀模':S.kind==='tuck'?'插口式軟件盒刀模':'飛機盒刀模';
let V=null,touched=false;
const kk=()=>S.unit==='in'?25.4:1;
const nf=v=>S.unit==='in'?Math.round(v*1e4)/1e4:r2(v);
function toast(t){const e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',2400)}

// ===== 尺寸防呆警告區塊（與原版相同：紅底提示 + 自動修正高度為 min(L, W)） =====
let dimWarnTimer = null;
function ensureDimWarnBox(){
 let w = $('dimWarn');
 if(!w){
  const g2 = document.querySelector('#tBase .g2');
  if(!g2) return null;
  w = document.createElement('div');
  w.id = 'dimWarn';
  w.style.cssText = 'display:none;margin:4px 0 10px;padding:12px 14px;border-radius:10px;background:#fff1f2;color:#ef4444;font-size:13px;line-height:1.5;';
  w.innerHTML = '您設置的尺寸可能會導致列印錯誤 <span title="高度不能大於長度或寬度，系統將自動修正為長與寬的較小值" style="display:inline-grid;place-items:center;width:15px;height:15px;border-radius:50%;background:#ef4444;color:#fff;font-size:11px;font-weight:700;cursor:help;margin-left:2px">?</span>';
  g2.insertAdjacentElement('afterend', w);
 }
 return w;
}
function showDimWarn(show){
 const w = ensureDimWarnBox();
 if(!w) return;
 w.style.display = show ? 'block' : 'none';
}

function fill(){const k=kk();['L','W','H'].forEach((id,i)=>$(id).value=nf((S.m[i]+offs(S.type,S.T)[i])/k));
 $('T').value=nf(S.T/k);$('tr').textContent=S.unit==='in'?`(0.0079~${maxT()===5?'0.1970':(maxT()/25.4).toFixed(4)}in)`:`(0.2~${maxT()}mm)`;$('tm').disabled=S.T<=.2;$('tp').disabled=S.T>=maxT()-1e-9;document.querySelectorAll('.u').forEach(e=>e.textContent=S.unit);
 showDimWarn(false)}

function readIn(commitClamp){
 const k=kk();
 let raw=['L','W','H'].map(id=>Math.max(Number($(id).value)||1,1)*k);

 // 防呆檢查：當高度 > min(長, 寬) 時（天地盒與折疊盒通用防呆）
 const maxH = Math.min(raw[0], raw[1]);
 const isInvalidH = (S.kind === 'dd' || S.kind === 'mailer') && raw[2] > maxH + 1e-6;

 if(isInvalidH){
  showDimWarn(true);
  raw[2] = maxH; // 內部刀模與 3D 立即使用安全上限繪製，避免破圖
  clearTimeout(dimWarnTimer);
  if(commitClamp){
   $('H').value = nf(maxH / k);
   dimWarnTimer = setTimeout(()=>showDimWarn(false), 1800);
  } else {
   // 使用者輸入停頓 900ms 後自動將高度欄位修正為 min(L, W)，與原版行為一致
   dimWarnTimer = setTimeout(()=>{
    const curL = Math.max(Number($('L').value)||1,1)*k;
    const curW = Math.max(Number($('W').value)||1,1)*k;
    const curH = Math.max(Number($('H').value)||1,1)*k;
    const limitH = Math.min(curL, curW);
    if((S.kind === 'dd' || S.kind === 'mailer') && curH > limitH + 1e-6){
     $('H').value = nf(limitH / k);
     readIn(true);
     refit();
    }
   }, 900);
  }
 } else {
  clearTimeout(dimWarnTimer);
  showDimWarn(false);
 }

 S.T=Math.max(.2,(Number($('T').value)*k)||1.5);
 for(let n=0;n<12;n++){
  const o=offs(S.type,S.T),next=raw.map((x,i)=>x-o[i]);
  S.m=next;
  const limit=maxT(),clamped=Math.min(S.T,limit);
  if(Math.abs(clamped-S.T)<1e-9)break;
  S.T=clamped;
 }
 const o=offs(S.type,S.T);
 S.m=raw.map((x,i)=>Math.max(1,x-o[i]));
 // 確保製造尺寸的 H 也不超過 min(L, W)
 if(S.kind === 'dd' || S.kind === 'mailer'){
  S.m[2] = Math.min(S.m[2], Math.min(S.m[0], S.m[1]));
 }
}
function syncT(){const k=kk();$('T').value=nf(S.T/k);$('tm').disabled=S.T<=.2;$('tp').disabled=S.T>=maxT()-1e-9;$('tr').textContent=S.unit==='in'?`(0.0079~${maxT()===5?'0.1970':(maxT()/25.4).toFixed(4)}in)`:`(0.2~${maxT()}mm)`}
function setT(t){const v=['L','W','H'].map(id=>Math.max(+$(id).value||1,1)),k=kk();S.T=Math.max(.2,r2(t));S.m=v.map((x,i)=>x*k);S.T=Math.min(S.T,maxT());const o=offs(S.type,S.T);S.m=v.map((x,i)=>x*k-o[i]);if(S.kind==='dd'||S.kind==='mailer')S.m[2]=Math.min(S.m[2],Math.min(S.m[0],S.m[1]));fill();refit()}
function refit(){touched=false;draw()}
['L','W','H','T'].forEach(id=>{
 $(id).oninput=()=>{readIn(false);if(id!=='T')syncT();else{$('tp').disabled=S.T>=maxT()-1e-9;$('tm').disabled=S.T<=.2;$('matName').textContent='Custom';$('dot').style.background='#d9d9d9';$('dot').style.border='0'}refit()};
 $(id).onblur=()=>{if(id!=='T'){readIn(true);syncT();refit()}};
 $(id).addEventListener('keydown',e=>{if(e.key==='Enter'&&id!=='T'){readIn(true);syncT();refit()}});
});
$('tm').onclick=()=>setT(S.T-.1);
$('tp').onclick=()=>setT(S.T+.1);
$('unit').onclick=e=>{const u=e.target.dataset.u;if(!u)return;S.unit=u;[...$('unit').children].forEach(c=>c.classList.toggle('on',c.dataset.u===u));fill();draw()};
$('ty').onclick=e=>{const k=e.target.dataset.k;if(!k)return;S.type=k;[...$('ty').children].forEach(c=>c.classList.toggle('on',c.dataset.k===k));fill();draw()};
const MATS=[{cat:'牛皮紙板',items:[{n:'白卡紙',t:.4,col:'#ffffff',w:1},{n:'深色牛皮紙',t:.5,col:'#ca9f68'},{n:'淺色牛皮紙',t:.5,col:'#f8d39c'}]},
 {cat:'瓦楞紙板',items:[{n:'瓦楞紙F(三層)',t:1.2,col:'#caaa81'},{n:'瓦楞紙E(三層)',t:2,col:'#caaa81'},{n:'瓦楞紙B(三層)',t:3,col:'#caaa81'},{n:'瓦楞紙BE(五層)',t:4.5,col:'#caaa81'},{n:'瓦楞紙AB(五層)',t:7.5,col:'#caaa81',off:1}]}];
let cur={c:1,i:1};
function closeMat(){document.querySelectorAll('.mp').forEach(e=>e.remove());$('matBox').classList.remove('open')}
function openMat(){closeMat();const box=$('matBox'),r=box.getBoundingClientRect();box.classList.add('open');
 const GAP=5,m1=document.createElement('div');m1.className='mp m1';m1.style.cssText=`left:${r.left}px;top:${r.bottom+GAP}px;width:${r.width}px`;
 let sub=null,tm=null;
 const hideSub=()=>{if(sub){sub.remove();sub=null}[...m1.children].forEach(c=>c.classList.remove('on'))};
 const keep=()=>clearTimeout(tm),leave=()=>{clearTimeout(tm);tm=setTimeout(hideSub,160)};
 const showSub=ci=>{keep();const row=m1.children[ci];[...m1.children].forEach((c,i)=>c.classList.toggle('on',i===ci));if(sub)sub.remove();sub=document.createElement('div');sub.className='mp m2';
  sub.onmouseenter=keep;sub.onmouseleave=leave;
  MATS[ci].items.forEach((it,ii)=>{const d=document.createElement('div');d.className='mi'+(it.off?' off':'')+(cur.c===ci&&cur.i===ii?' on':'');d.innerHTML=`<i${it.w?' class="w"':''} style="background:${it.col}"></i>${it.n}`;
   if(it.off)d.title='厚度超出 0.2~5mm 範圍';else d.onclick=()=>{cur={c:ci,i:ii};$('matName').textContent=it.n;$('dot').style.background=it.col;$('dot').style.border=it.w?'1px solid #ebebeb':'0';closeMat();setMat3d(it.col);setT(it.t)};sub.appendChild(d)});
  document.body.appendChild(sub);const r1=m1.getBoundingClientRect(),rr=row.getBoundingClientRect(),h=sub.offsetHeight;
  sub.style.left=r1.right+GAP+'px';sub.style.top=Math.max(8,rr.bottom-h)+'px'};
 m1.onmouseenter=keep;m1.onmouseleave=leave;
 MATS.forEach((c,ci)=>{const d=document.createElement('div');d.className='mi';d.textContent=c.cat;d.onmouseenter=()=>showSub(ci);d.onclick=()=>showSub(ci);m1.appendChild(d)});
 document.body.appendChild(m1)}
$('matBox').onclick=e=>{document.querySelector('.m1')?closeMat():openMat();e.stopPropagation()};
document.addEventListener('click',e=>{if(!e.target.closest('.mp'))closeMat()});
addEventListener('resize',closeMat);document.querySelector('.pn').addEventListener('scroll',closeMat);
function tab(v){document.querySelectorAll('#rail [data-t]').forEach(x=>x.classList.toggle('on',x.dataset.t===v));$('tBase').style.display=v==='base'?'':'none';$('tAdv').style.display=v==='adv'?'':'none';$('tMock').style.display=v==='mock'?'':'none';if(v==='mock')renderMock()}
$('rail').onclick=e=>{const t=e.target.closest('[data-t]');if(!t)return;const v=t.dataset.t;
 if(v==='base'||v==='adv'||v==='mock')tab(v);else toast('此功能即將推出')};
// 長/寬/高：游標停在欄位上時，滾輪向上 +1、向下 −1（in 模式每格 0.1），最小為 1
['L','W','H'].forEach(id=>{let last=0;$(id).addEventListener('wheel',e=>{e.preventDefault();const n=performance.now();if(n-last<50||!e.deltaY)return;last=n;
 const el=$(id),st=S.unit==='in'?.1:1,v=(+el.value||0)+(e.deltaY<0?st:-st);el.value=Math.max(1,Math.round(v*1e4)/1e4);el.oninput()},{passive:false})});
['oBleed','oDim','oName','oSlot'].forEach(id=>$(id).onchange=()=>{$('bDim').classList.toggle('on',$('oDim').checked);draw()});
$('bDim').onclick=()=>{$('oDim').checked=!$('oDim').checked;$('bDim').classList.toggle('on',$('oDim').checked);draw()};
$('bSet').onclick=()=>tab('adv');
$('bSel').onclick=()=>{S.hand=false;$('bSel').classList.add('on');$('bHand').classList.remove('on');$('stage').classList.add('sel')};
$('bHand').onclick=()=>{S.hand=true;$('bHand').classList.add('on');$('bSel').classList.remove('on');$('stage').classList.remove('sel')};
function setV(){const s=$('stage').firstChild;if(s)s.setAttribute('viewBox',`${V.x} ${V.y} ${V.w} ${V.h}`)}
function zoomAt(f,cx,cy){V.x=cx-(cx-V.x)*f;V.y=cy-(cy-V.y)*f;V.w*=f;V.h*=f;touched=true;setV()}
function ctr(){return [V.x+V.w/2,V.y+V.h/2]}
$('zi').onclick=()=>zoomAt(.8,...ctr());$('zo').onclick=()=>zoomAt(1.25,...ctr());
const st=$('stage');
st.addEventListener('wheel',e=>{e.preventDefault();const s=st.firstChild,p=s.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(s.getScreenCTM().inverse());zoomAt(e.deltaY<0?.88:1.14,q.x,q.y)},{passive:false});
let drag=null;
st.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,vx:V.x,vy:V.y};st.setPointerCapture(e.pointerId)});
st.addEventListener('pointermove',e=>{if(!drag)return;const sc=Math.min(st.clientWidth/V.w,st.clientHeight/V.h);V.x=drag.vx-(e.clientX-drag.x)/sc;V.y=drag.vy-(e.clientY-drag.y)/sc;touched=true;setV()});
st.addEventListener('pointerup',()=>drag=null);
st.addEventListener('dblclick',refit);

const earc=(cx,cy,rx,ry,a,b,n=10)=>{const o=[];for(let i=0;i<=n;i++){const t=(a+(b-a)*i/n)*Math.PI/180;o.push([cx+rx*Math.cos(t),cy+ry*Math.sin(t)])}return o};
const key=(a,b)=>[a.map(v=>Math.round(v*1000)).join(','),b.map(v=>Math.round(v*1000)).join(',')].sort().join('|');

// ===== 曲線輪廓：頂點可帶圓角半徑 [x,y,r]；{arc:[cx,cy,rx,ry,起角,迄角]} 為橢圓弧；輸出真正的三次貝茲曲線 =====
function arcCubics(cx,cy,rx,ry,t0,t1){const n=Math.max(1,Math.ceil(Math.abs(t1-t0)/(Math.PI/2)-1e-9)),o=[];
 for(let i=0;i<n;i++){const a=t0+(t1-t0)*i/n,b=t0+(t1-t0)*(i+1)/n,k=4/3*Math.tan((b-a)/4),
  A=[cx+rx*Math.cos(a),cy+ry*Math.sin(a)],B=[cx+rx*Math.cos(b),cy+ry*Math.sin(b)];
  o.push({a:A,c1:[A[0]-k*rx*Math.sin(a),A[1]+k*ry*Math.cos(a)],c2:[B[0]+k*rx*Math.sin(b),B[1]-k*ry*Math.cos(b)],b:B})}return o}
function arcPts(cx,cy,rx,ry,t0,t1){const n=Math.max(2,Math.ceil(Math.abs(t1-t0)/(Math.PI/2)*14)),o=[];
 for(let i=0;i<=n;i++){const t=t0+(t1-t0)*i/n;o.push([cx+rx*Math.cos(t),cy+ry*Math.sin(t)])}return o}
function shape(list){
 const it=list.map(e=>{
  if(!Array.isArray(e)){const [cx,cy,rx,ry,a0,a1]=e.arc,t0=a0*Math.PI/180,t1=a1*Math.PI/180,cs=arcCubics(cx,cy,rx,ry,t0,t1);
   return {cs,t:[cx,cy,rx,ry,t0,t1],i:cs[0].a,o:cs[cs.length-1].b}}
  return {p:[e[0],e[1]],r:e[2]||0,i:[e[0],e[1]],o:[e[0],e[1]]}}),n=it.length;
 it.forEach((c,j)=>{if(!c.p||!c.r)return;
  const P=it[(j+n-1)%n].o,N=it[(j+1)%n].i,V=c.p;let u=[P[0]-V[0],P[1]-V[1]],w=[N[0]-V[0],N[1]-V[1]];
  const lu=Math.hypot(u[0],u[1]),lw=Math.hypot(w[0],w[1]);if(lu<1e-9||lw<1e-9)return;
  u=[u[0]/lu,u[1]/lu];w=[w[0]/lw,w[1]/lw];
  const th=Math.acos(Math.max(-1,Math.min(1,u[0]*w[0]+u[1]*w[1])));if(th<1e-3||Math.PI-th<1e-3)return;
  let d=c.r/Math.tan(th/2);const dm=Math.min(lu,lw)*.99;if(d>dm)d=dm;const r=d*Math.tan(th/2);
  const A=[V[0]+u[0]*d,V[1]+u[1]*d],B=[V[0]+w[0]*d,V[1]+w[1]*d],bx=u[0]+w[0],by=u[1]+w[1],bl=Math.hypot(bx,by),h=r/Math.sin(th/2),
   C=[V[0]+bx/bl*h,V[1]+by/bl*h],ta=Math.atan2(A[1]-C[1],A[0]-C[0]);
  let dt=Math.atan2(B[1]-C[1],B[0]-C[0])-ta;while(dt>Math.PI)dt-=2*Math.PI;while(dt<-Math.PI)dt+=2*Math.PI;
  c.i=A;c.o=B;c.t=[C[0],C[1],r,r,ta,ta+dt];c.cs=arcCubics(...c.t)});
 const e=[],pts=[],push=q=>{const l=pts[pts.length-1];if(!l||Math.hypot(l[0]-q[0],l[1]-q[1])>1e-9)pts.push(q)};
 it.forEach((c,j)=>{const nx=it[(j+1)%n];push(c.i);
  if(c.cs){c.cs.forEach(q=>e.push(q));arcPts(...c.t).forEach(push)}
  push(c.o);if(Math.hypot(c.o[0]-nx.i[0],c.o[1]-nx.i[1])>1e-9)e.push({a:c.o,b:nx.i})});
 if(pts.length>2&&Math.hypot(pts[0][0]-pts[pts.length-1][0],pts[0][1]-pts[pts.length-1][1])<1e-9)pts.pop();
 return {pts,e}}
const pathD=e=>'M'+e[0].a[0]+' '+e[0].a[1]+e.map(q=>q.c1?`C${q.c1[0]} ${q.c1[1]} ${q.c2[0]} ${q.c2[1]} ${q.b[0]} ${q.b[1]}`:`L${q.b[0]} ${q.b[1]}`).join('')+'Z';
const bz=(q,t)=>{const m=1-t,f=i=>m*m*m*q.a[i]+3*m*m*t*q.c1[i]+3*m*t*t*q.c2[i]+t*t*t*q.b[i];return [f(0),f(1)]};
let G={};
const ip=(x,X,Y)=>{x=Math.max(X[0],Math.min(X[X.length-1],x));let i=0;while(i<X.length-2&&x>X[i+1])i++;return Y[i]+(Y[i+1]-Y[i])*(x-X[i])/(X[i+1]-X[i])};