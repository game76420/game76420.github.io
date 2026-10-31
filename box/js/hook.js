// ===== 反插式掛勾彩盒（Hook Reverse Tuck Box / Pacdora PairWithHook）=====
// 由 6 組截圖（70×40×110、100×40×120、70×40×150 @T=.5/3、19×10.6×20.6 @T=.5/.2）疊圖反推的規律：
//  ‧ 掛勾片/背片高度 Ph = max(13, W)（與 H、L 無關）；延伸片 PF = floor(Ph/4)（最小 3）；圓角 PR = floor(Ph/4)
//  ‧ 掛孔：長 PSW=clamp(L/4,30,L1-4)、寬 PSD=5、中央半圓缺口 PSR=4；孔心距摺線 PSP≈0.4125·Ph（不小於 PSD/2+PSR+.5）
//  ‧ 插舌長 C = max(clamp(.15L,5,25), .33W)；側翼高 A = ceil(min(.7W, .385L, H/2))
//  ‧ A 面底邊指扣缺口：半橢圓 rx=min(10,.32L)、ry=min(7.4,.33W)，置中；L≥100 時不出現（100×40×120 截圖無缺口）
//  ‧ 內/外尺寸補償與最大厚度見 core.js（tkO / maxT）
// 座標系：x=0 為 H 面左摺線（糊邊在 x<0）；y=0 為 H 面頂邊（上方翼片 y<0、下方翼片 y>H）。
// 輸入：L=長(H/F 面寬)、W=寬(FR/FL 面寬)、H=高、T=厚度收位 D（Pacdora 的 size.D，預設 1）。
function buildHook(L,W,H,T,ov){
 const P=[],Hn=[],o=ov||{},g=(k,v)=>o[k]!==undefined?o[k]:v;
 const cl=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));           // 上限優先
 const lerp=(x,t)=>{if(x<=t[0][0])return t[0][1];for(let i=1;i<t.length;i++)if(x<=t[i][0]){const[a,b]=t[i-1],[c,d]=t[i];return b+(d-b)*(x-a)/(c-a)}return t[t.length-1][1]};
 const rad=Math.PI/180;
 // ---------- 厚度相關 ----------
 const D=cl(T,.2,5);
 const OF=g('OF',D<.3?0:D<=1.5?D:Math.min(D-1,3));
 const R=g('R',D<.3?0:lerp(D,[[.5,.65],[.6,.7],[1,1.2],[1.5,1.8],[2,2.4],[2.5,2.75],[3,3],[5,4]]));
 const AXX1=g('AXX1',2*D), CX=g('CX',D), Y1=g('Y1',D<.55?1.5*D:D), AX1=g('AX1',D<.3?.5*D:D<.55?.6*D:D);
 const AX=g('AX',D+(W<20?2:3)), AXX=g('AXX',AX+(D<2?1:2)), AS=g('AS',AX);
 const FLw=g('FLw',W-(D<.55?.5:D<=3?1:1+(D-3)/2));
 const L1=L-2*D;
 // ---------- 尺寸相關 ----------
 const G=g('G',cl(.16*L,13,Math.min(45,Math.max(5,W-Math.max(1.5,AXX1))))), GT=g('GT',15);
 const E=g('E',cl(Math.max(Math.round(.08*L),2*D),2,Math.min(11,Math.max(2,L/2-D-CX))));
 const C=g('C',Math.max(cl(.15*L,5,25),.33*W)), CR=g('CR',cl(Math.ceil(C/2),0,L1/2));
 const S=g('S',cl(.06*L,2,9)), NX=g('NX',cl(Math.round(.03*L),2,3)), NY=g('NY',NX);
 const A=g('A',Math.max(5,Math.ceil(Math.min(.7*W,.385*L,H/2))));
 const AR=g('AR',Math.max(0,Math.min(Math.round(.2*A),A-S-NY)));
 const ATT=g('ATT',(A-S-NY-AR<4)?0:13);
 const Ph=g('P',Math.max(13,W)), PF=g('PF',cl(Math.floor(Ph/4),3,40)), PFT=g('PFT',10), P1X=g('P1X',2), PPY=g('PPY',D);
 const PR=g('PR',Math.max(0,Math.min(Math.floor(Ph/4),L1/2-2)));
 const PSW=g('PSW',cl(L/4,30,L1-4)), PSD=g('PSD',Math.min(Math.max(5,Ph/8),Ph/2));
 const PSR=g('PSR',Math.max(0,Math.min(Math.max(4,Ph/10),(PSW-PSD)/2)));
 const PSP=g('PSP',cl(Math.max(Ph*.4125,PSD/2+PSR+.5),PSD/2+1,Ph-PSD/2-1));
 // ---------- 基本量 ----------
 const hp=H-OF, xF=L+W, xFL=2*L+W;
 const RD=g('RD',Math.max(R,D+.4,.04*Math.min(L,W)));   // 3D 圓弧轉折半徑（僅預覽用）
 const q0=Math.sqrt(Math.max(R*R-OF*OF,0)), t0=Math.atan2(OF,q0)/rad;
 // ---------- 工具 ----------
 const arc=(cx,cy,r,a0,a1)=>{const st=cl(Math.acos(Math.max(-1,1-.03/Math.max(r,.05)))*2/rad,1,6),n=Math.max(2,Math.ceil(Math.abs(a1-a0)/st)),p=[];for(let i=0;i<=n;i++){const t=(a0+(a1-a0)*i/n)*rad;p.push([cx+r*Math.cos(t),cy+r*Math.sin(t)])}return p};
 const ell=(cx,cy,rx,ry,a0,a1)=>{const n=Math.max(8,Math.ceil(Math.abs(a1-a0)/4)),p=[];for(let i=0;i<=n;i++){const t=(a0+(a1-a0)*i/n)*rad;p.push([cx+rx*Math.cos(t),cy+ry*Math.sin(t)])}return p};
 const clean=a=>{const r=[];for(const p of a){const l=r[r.length-1];if(!l||Math.hypot(p[0]-l[0],p[1]-l[1])>1e-9)r.push(p)}return r};
 const shp=a=>shape(clean(a));
 const mk=(n,pts,id,par,hg,w,x)=>P.push({n,...shp(pts),id,par,hg,w,...x});
 const fold=(a,b)=>Hn.push([a,b]);
 // ---------- 四面筒身 ----------
 const FR=[[L,0],...(R>0?arc(L+R,0,R,180,t0):[]),[xF,OF],[xF,H],...(R>0?arc(xF-R,H,R,0,-(180-t0)):[]),[L,hp]];
 const FLp=[[xFL,OF],[xFL+FLw,OF],[xFL+FLw,hp],...(R>0?arc(xFL+R,H,R,-t0,-180):[[xFL,hp]])];
 const NT=g('NT',L<100?1:0),NRX=g('NRX',Math.min(10,.32*L)),NRY=g('NRY',Math.max(0,Math.min(7.4,.33*W,hp/2)));
 mk('A面',[[0,0],[L,0],[L,hp],...(NT&&NRX>0&&NRY>0?ell(L/2,hp,NRX,NRY,0,-180):[]),[0,hp]],'p0',null,null,[0,.2]);
 mk('B面',FR,'p1','p0',[[L,0],[L,hp]],[0,.2],{rd:RD});
 mk('C面',[[xF,OF],[xFL,OF],[xFL,H],[xF,H]],'p2','p1',[[xF,OF],[xF,H]],[0,.2],{rd:RD});
 mk('D面',FLp,'p3','p2',[[xFL,OF],[xFL,H]],[0,.2],{rd:RD});
 const gd=G*Math.tan(GT*rad);
 mk('糊邊',[[0,hp],[-G,hp-gd],[-G,OF+gd],[0,OF]],'glue','p0',[[0,OF],[0,hp]],[.12,.22],{shx:2*D});
 fold([0,hp],[0,OF]);fold([L,0],[L,hp]);fold([xF,OF],[xF,H]);fold([xFL,OF],[xFL,H]);
 // ---------- 上/下蓋（母鎖缺口 + 插舌）----------
 const lid=(x0,y0,s,dc,idS,idT,parId,parHg,w1,w2,nm,nt)=>{
  const M=a=>a.map(([u,v])=>[x0+u,y0+s*v]), yf=dc-Y1, vt=yf+C;
  const capUV=[[0,0],[0,dc],...arc(E-CX,dc-CX,CX,90,0),[E,yf],[L-E,yf],[L-E,dc-CX],...arc(L-E+CX,dc-CX,CX,180,90),[L,dc],[L,0]];
  const tuck=[[D,dc],[D,vt-CR],...(CR>0?arc(D+CR,vt-CR,CR,180,90):[[D,vt]]),...(CR>0?arc(L-D-CR,vt-CR,CR,90,0):[[L-D,vt]]),[L-D,dc],
   ...arc(L-E+CX,dc-CX,CX,90,180),[L-E,yf],[E,yf],[E,dc-CX],...arc(E-CX,dc-CX,CX,0,90)];
  const h=[M([[E,yf]])[0],M([[L-E,yf]])[0]];
  mk(nm,M(capUV),idS,parId,parHg,w1,{rd:RD});
  mk(nt,M(tuck),idT,idS,h,w2);
  fold(M([[0,0]])[0],M([[L,0]])[0]);fold(h[0],h[1]);
 };
 lid(0,0,-1,W-AXX1,'top','top2','p0',[[0,0],[L,0]],[.82,.92],[.92,1],'上蓋','上插舌');
 lid(xF,H,+1,W,'bottom','bottom2','p2',[[xF,H],[xF+L,H]],[.34,.46],[.46,.54],'底蓋','底插舌');
 // ---------- 側翼（局部座標 (u,h)：u 自面板左緣，h 自根部朝外）----------
 const slotL=()=>{const p=[];
   if(R>0){const px=AX-R,py=AS-OF,d=Math.hypot(px,py);let tT=-t0;
     if(d>R)tT=Math.max(-t0,(Math.atan2(py,px)-Math.acos(R/d))/rad);
     p.push(...arc(R,OF,R,-t0,tT))}
   else p.push([0,0]);
   p.push([AX,AS],[AXX,A]);return p};
 const slotR=()=>slotL().map(([u,h])=>[W-u,h]);
 const cutR=()=>[[FLw,0],[W-AX,AS],[W-AXX,A]];
 const male=(um,e)=>{
   const a=ATT*rad,Q=[um+e*NX,S+NY],t=(A-AR-Q[1]+AR*Math.sin(a))/Math.cos(a);
   const T2=[Q[0]+t*e*Math.sin(a),Q[1]+t*Math.cos(a)],Cu=T2[0]+AR*e*Math.cos(a);
   const pts=[[um,0],[um,S],Q];
   if(AR>0)pts.push(...arc(Cu,A-AR,AR,e<0?ATT:180-ATT,90));else pts.push(T2);
   pts.push([Cu,A]);return pts};
 const flap=(nm,id,par,x0,yb,sg,Lp,Rp,w)=>{
   const pts=[...Lp,...Rp.slice().reverse()].map(([u,h])=>[x0+u,yb+sg*h]);
   const hg=[[x0+Lp[0][0],yb],[x0+Rp[0][0],yb]];
   mk(nm,pts,id,par,hg,w);fold(hg[0],hg[1])};
 flap('上側翼','dust1','p1',L,OF,-1,slotL(),male(W-AXX1,-1),[.22,.34]);   // FRT
 flap('上側翼','dust2','p3',xFL,OF,-1,male(AXX1,+1),cutR(),[.22,.34]);     // FLT
 flap('底側翼','bd1','p1',L,hp,+1,male(AX1,+1),slotR(),[.22,.34]);         // FRB
 flap('底側翼','bd2','p3',xFL,hp,+1,slotL(),male(FLw,-1),[.22,.34]);       // FLB
 // ---------- 掛勾（F 面上方：FT / FT3 / FT1 / FT2）----------
 const thin=PPY<1, gap=thin?0:PPY, yT=OF-Ph, yB1=yT-gap, yT1=yB1-Ph, xa=xF+D, xb=xF+L-D;
 const x3a=xa+PR+(thin?1:0), x3b=xb-PR-(thin?1:0), k=thin?1:0;
 let FT,FT1;
 if(thin){
  FT=[[xa,OF],...(PR>0?arc(xa+PR,yT+k+PR,PR,180,270):[[xa,yT+k]]),...arc(xa+PR,yT,1,90,0),
      ...arc(xb-PR,yT,1,180,90),...(PR>0?arc(xb-PR,yT+k+PR,PR,270,360):[[xb,yT+k]]),[xb,OF]];
  FT1=[...arc(xa+PR,yB1,1,0,-90),...(PR>0?arc(xa+PR,yB1-k-PR,PR,90,180):[[xa,yB1-k]]),[xa,yT1+P1X],[xa+P1X,yT1],[xb-P1X,yT1],[xb,yT1+P1X],
       ...(PR>0?arc(xb-PR,yB1-k-PR,PR,0,90):[[xb,yB1-k]]),...arc(xb-PR,yB1,1,-90,-180)];
 }else{
  FT=[[xa,OF],...(PR>0?arc(x3a,yT+PR,PR,180,270):[[xa,yT]]),...(PR>0?arc(x3b,yT+PR,PR,270,360):[[xb,yT]]),[xb,OF]];
  FT1=[...(PR>0?arc(x3a,yB1-PR,PR,90,180):[[xa,yB1]]),[xa,yT1+P1X],[xa+P1X,yT1],[xb-P1X,yT1],[xb,yT1+P1X],...(PR>0?arc(x3b,yB1-PR,PR,0,90):[[xb,yB1]])];
 }
 // 掛孔：半圓端 r=PSD/2、中央半圓缺口 PSR；FT 缺口朝上緣，FT1 缺口朝摺線
 const hole=(cx,hy,f)=>{const r=PSD/2,hw=PSW/2;
   const uv=[...arc(-hw+r,0,r,-90,-270),...(PSR>0?arc(0,r,PSR,180,0):[]),...arc(hw-r,0,r,90,-90)];
   return uv.map(([u,v])=>[cx+u,hy-f*v])};
 const hx=xF+L/2;
  const HP1=hole(hx,yT+PSP,+1),HP2=hole(hx,yB1-PSP,-1);
 // 3D：FT 保持直立(ang:0)；薄款時背片直接對摺 180°；掛勾延伸片反向摺入盒內(dir:-1)；孔以 hp 挖在 FT/FT1 上
 mk('掛勾片',FT,'hanger','p2',[[xa,OF],[xb,OF]],[.5,.54],{ang:0,hp:[HP1]});
 if(!thin){
  const ra=PPY/2;
  // 原版(1~3.json 的 FT3)兩端半圓 dir=0：向內凹的缺口，而非向外凸
  mk('掛勾厚度條',[...arc(x3a,yT-ra,ra,90,-90),...arc(x3b,yT-ra,ra,270,90)],'hanger3','hanger',[[x3a,yT],[x3b,yT]],[.54,.6]);
  fold([x3a,yT],[x3b,yT]);
 }
 mk('掛勾背片',FT1,'hanger2',thin?'hanger':'hanger3',[[x3a,yB1],[x3b,yB1]],[.6,.74],{ang:thin?Math.PI:Math.PI/2,hp:[HP2],...(thin?{}:{sh:D})});
 const dx=PF*Math.tan(PFT*rad);
 mk('掛勾延伸',[[xa+P1X,yT1],[xb-P1X,yT1],[xb-P1X-dx,yT1-PF],[xa+P1X+dx,yT1-PF]],'hanger4','hanger2',[[xa+P1X,yT1],[xb-P1X,yT1]],[.74,.82],{dir:-1});
 fold([xa,OF],[xb,OF]);fold([x3a,yB1],[x3b,yB1]);fold([xa+P1X,yT1],[xb-P1X,yT1]);
 P.push({n:'掛孔',...shp(HP1)});
 P.push({n:'掛孔(背)',...shp(HP2)});
 return {P,Hn,SL:[],SWd:0};
}