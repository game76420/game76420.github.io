// ===== 插口端山形盒（Tuck End Gable Top Box with 1-2-3 Snap Lock Bottom） =====
// 頂部沿用手提拱型盒的手把/屋頂結構，但 L>302 後手把、耳朵、屋頂尺寸不再隨 L 外推（原站實測）；
// 底部為 1-2-3 鎖底：B/D 面 45° 斜肩 + 0.7W 深腳，A/C 面互補鋸齒。
function tgN(L,W){return Math.max(1,Math.round(L/(1.55*W)))}
function buildTG(L, W, H, T) {
 const lin=(x,a,b,xa=150,xb=302)=>a+(b-a)*(x-xa)/(xb-xa),
  Lc=Math.min(L,302),                       // 頂部幾何用的上限長度
  F=Math.max(4,W/2-.9*T),
  Hu=Math.max(W/2-.2,25.85+.1*Math.min(L,150))-.5*T+1.5,
  Ht=F+Hu,
  dn=Math.min(29,Math.max(4,.5*(Hu-15))),
  yn=Ht-dn,
  sl=Math.max(.37*W,.96*(yn-F)+1),
  Hs=(.62/.37)*sl,
  rr=.145*W,
  sw2=Math.max(2.2,1.8*T+.5),
  fs=Lc<150?.22*Lc+.015*Math.min(Lc,50):Math.min(lin(Lc,33,44.4),.32*Lc),
  ew=Lc<150?(22/150)*Lc:Math.min(lin(Lc,22,28.6),fs*.9),
  rx=ew/2,
  ry=Math.min(.75*rx+2,.6*dn),
  // 提手孔：302 以下同拱型盒；302→600 線性過渡；600 以上 0.25L
  sw=L<=302?(L<150?.386*L-1:Math.min(.6*L,9.3+.2684*L)):L<600?90.4+(150-90.4)*(L-302)/298:.25*L,
  sh=Math.min(30,sw-.9,.51*Hu),
  sr=sh/2,
  sa=Math.max(.2,sw/2-sr),
  sy=-(F+Hu/2),                              // 垂直置中於手把片
  // 糊邊：上下對稱梯形，寬度不隨 L 增加
  gw=Math.min(45.5,.5*H+5,18.7+.175*Math.max(0,Lc-W)+7),
  gi=.27*gw,
  // 底部
  Dp=.7*W,                                   // 全深
  Dn=W/2,                                    // 缺口 / 斜肩深度（斜肩 45°）
  rf=Math.min(8,W*.052),                     // 腳圓角
  hw=Math.min(W/2,L/2),
  mid=L-2*hw,
  n=mid<2*rf+1?0:Math.max(1,Math.min(tgN(L,W),Math.floor((mid/(2*rf+1)+1)/2))),
  X=[0,L,L+W,2*L+W,2*L+2*W],P=[],Hn=[],
  one=(nm,l,id,par,hg,w,o)=>P.push({n:nm,...shape(l),id,par,hg,w,...o});

 const halfSpan=Math.min(F*.996,Math.max(0,W/2-T*1.02)),
  gableAng=Math.asin(halfSpan/F),
  zRidge=F*Math.cos(gableAng),
  zNotch=zRidge+(yn-F),
  zTop=zRidge+(Ht-F),
  angNotch=Math.atan2(ew,zNotch),
  angTop=Math.atan2(fs,zTop),
  angTip=Hs>zTop?Math.asin(Math.min(.85,fs/Hs)):angTop,
  roofAng=Math.max(.08,Math.min(angNotch,angTop,angTip)-.015),
  slot3d=Math.min(Hs-rr*.5,Math.max(sl,zNotch/Math.cos(roofAng)+T));

 [[0,'A面','p0',null,null,[0,0]],[1,'B面','p1','p0',[[X[1],0],[X[1],H]],[0,.24]],[2,'C面','p2','p1',[[X[2],0],[X[2],H]],[.04,.32]],[3,'D面','p3','p2',[[X[3],0],[X[3],H]],[.08,.38]]]
  .forEach(([i,nm,id,par,hg,w])=>one(nm,[[X[i],0],[X[i+1],0],[X[i+1],H],[X[i],H]],id,par,hg,w));

 // 糊邊（左側，上下對稱梯形）
 one('糊邊',[[0,0],[-gw,gi],[-gw,H-gi],[0,H]],'gl','p0',[[0,0],[0,H]],[.24,.38]);

 // 頂部：A 面與 C 面的蓋片 + 手把
 [0,2].forEach(i=>{const x=X[i],id='h'+i,hole=i===2;
  one('蓋片',[[x,0],[x+L,0],[x+L,-F],[x,-F]],id+'l','p'+i,[[x,0],[x+L,0]],[.48,.72],{ang:gableAng});
  const ear=cx=>({arc:[cx,-yn,rx,ry,180,360]});
  one('手把',[[x,-F],[x,-yn],ear(x+rx),[x+fs,-Ht],[x+L-fs,-Ht],[x+L-ew,-yn],ear(x+L-rx),[x+L,-yn],[x+L,-F]],id+'u',id+'l',[[x,-F],[x+L,-F]],[.48,.72],{dir:-1,ang:gableAng,hs:[[x+L/2,sy,sw,sh]]});
  const cx=x+L/2,holeShape=[{arc:[cx+sa,sy,sr,sr,-90,90]},{arc:[cx-sa,sy,sr,sr,90,270]}];
  if(hole){
   one('',holeShape,'ht2',id+'u',[[cx-sa,sy-sr],[cx+sa,sy-sr]],[.82,.98],{dir:1,ang:Math.PI/2});
   Hn.push([[cx-sa,sy-sr],[cx+sa,sy-sr]]);
  }else{
   P.push({n:'',...shape(holeShape)});
  }
  Hn.push([[x,-F],[x+L,-F]]);
 });

 // 頂部：B 面與 D 面的山形屋頂
 [1,3].forEach(i=>{const x=X[i],id='r'+i,cx=x+W/2,y1=-.3,y0=y1-sl;
  one('屋頂',[[x,0],[x+W,0],[cx,-Hs,rr]],id,'p'+i,[[x,0],[x+W,0]],[.64,.84],{
   ang:roofAng,holes:[[cx-sw2/2,y1-slot3d,sw2,slot3d]]});
  P.push({n:'',...shape([{arc:[cx,y0+sw2/2,sw2/2,sw2/2,180,360]},{arc:[cx,y1-sw2/2,sw2/2,sw2/2,0,180]}])});
 });

 // ===== 底部 1-2-3 鎖底 =====
 const y=H, seg=n?mid/(2*n-1):0;
 // A 面：腳(W/2) → 缺口,腳,缺口,…,缺口 → 腳(W/2)；腳圓角 rf，缺口轉角為直角
 {
  const pts=[[0,y],[0,y+Dp]];
  let xs=hw;
  for(let k=0;k<2*n-1;k++){
   const a=xs,b=xs+seg;
   if(k%2===0){ // 缺口
    pts.push([a,y+Dp,rf],[a,y+Dn],[b,y+Dn],[b,y+Dp,rf]);
   }
   xs=b;
  }
  pts.push([L,y+Dp],[L,y]);
  one('底片',pts,'b0','p0',[[0,y],[L,y]],[.42,.60],{ang:Math.PI/2});
  Hn.push([[0,y],[L,y]]);
 }
 // B 面：左上 45° 斜肩 → 垂直下到全深 → 水平腳到右緣
 one('底翼',[[X[1],y],[X[1]+W/2,y+Dn],[X[1]+W/2,y+Dp,rf],[X[2],y+Dp],[X[2],y]],'b1','p1',[[X[1],y],[X[2],y]],[.34,.52],{ang:1.52});
 Hn.push([[X[1],y],[X[2],y]]);
 // C 面：兩側 W/2 斜肩 + 與 A 面互補鋸齒（腳,缺口,腳,…,腳）
 {
  const x0=X[2],pts=[[x0,y],[x0+hw,y+hw],[x0+hw,y+Dp,rf]];
  let xs=x0+hw;
  for(let k=0;k<2*n-1;k++){
   const a=xs,b=xs+seg;
   if(k%2===1){ // 缺口
    pts.push([a,y+Dp,rf],[a,y+Dn],[b,y+Dn],[b,y+Dp,rf]);
   }
   xs=b;
  }
  pts.push([X[3]-hw,y+Dp,rf],[X[3]-hw,y+hw],[X[3],y]);
  one('底片',pts,'b2','p2',[[X[2],y],[X[3],y]],[.42,.62],{ang:Math.PI/2});
  Hn.push([[X[2],y],[X[3],y]]);
 }
 // D 面：B 面的鏡像
 one('底翼',[[X[3],y],[X[3],y+Dp],[X[4]-W/2,y+Dp,rf],[X[4]-W/2,y+Dn],[X[4],y]],'b3','p3',[[X[3],y],[X[4],y]],[.34,.52],{ang:1.50});
 Hn.push([[X[3],y],[X[4],y]]);

 [0,1,2,3].forEach(i=>Hn.push([[X[i],0],[X[i],H]]));
 [0,1,2,3].forEach(i=>Hn.push([[X[i],0],[X[i+1],0]]));
 return {P,Hn,SL:[],SWd:0,yT:0};
}
