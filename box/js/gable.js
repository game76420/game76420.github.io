function gableOff(T){const v=1.2*T;return v<1?Math.max(.2,Math.round(v*10)/10):Math.round(v)}
function buildG(L,W,H,T){
 const lin=(x,a,b,xa=150,xb=302)=>a+(b-a)*(x-xa)/(xb-xa),
  F=Math.max(4,W/2-.9*T),
  Hu=Math.max(W/2-.2,25.85+.1*Math.min(L,150))-.5*T,
  Ht=F+Hu,
  dn=Math.min(24,Math.max(4,.5*(Hu-15))),
  yn=Ht-dn,
  sl=Math.max(.37*W,.96*(yn-F)+1),
  Hs=(.62/.37)*sl,
  rr=.145*W,
  sw2=Math.max(2.2,1.8*T+.5),
  fs=L<150?.22*L+.015*Math.min(L,50):Math.min(lin(L,33,44.4),.32*L),
  ew=L<150?(22/150)*L:Math.min(lin(L,22,28.6),fs*.9),
  rx=ew/2,
  ry=Math.min(.75*rx,.6*dn),
  sw=L<150?.386*L-1:Math.min(.6*L,9.3+.2684*L),
  sh=Math.min(30,sw-.9,.51*Hu),
  sr=sh/2,
  sa=Math.max(.2,sw/2-sr),
  holeBot=F+Math.max(0,.5*(Hu-59)),
  sy=-(holeBot+sr),
  gw=Math.min(H*.48,L<150?11.3+.074*Math.max(0,L-50)+.088*Math.max(0,Math.min(L,50)-W):18.7+.175*Math.max(0,L-W)),
  D=.8*W,
  jg=.03*W,
  bl=.0816*W,
  nm_=Math.max(3.2,Math.min(8.7,.057*W+2.1)),
  rIn=Math.min(3,nm_*.6),
  pe=Math.max(L/2,L-W/2),
  X=[0,L,L+W,2*L+W,2*L+2*W],P=[],Hn=[],
  one=(n,l,id,par,hg,w,o)=>P.push({n,...shape(l),id,par,hg,w,...o});

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
  .forEach(([i,n,id,par,hg,w])=>one(n,[[X[i],0],[X[i+1],0],[X[i+1],H],[X[i],H]],id,par,hg,w));
 one('糊邊',[[0,0],[-gw,.29*gw],[-gw,Math.max(.32*gw,H-.85*gw),gw*.55],[0,H]],'gl','p0',[[0,0],[0,H]],[.24,.38]);

 [0,2].forEach(i=>{const x=X[i],id='h'+i,hole=i===2;
  one('蓋片',[[x,0],[x+L,0],[x+L,-F],[x,-F]],id+'l','p'+i,[[x,0],[x+L,0]],[.48,.72],{ang:gableAng});
  const ear=cx=>({arc:[cx,-yn,rx,ry,180,360]});
  one('手把',[[x,-F],[x,-yn],ear(x+rx),[x+fs,-Ht],[x+L-fs,-Ht],[x+L-ew,-yn],ear(x+L-rx),[x+L,-yn],[x+L,-F]].filter(Boolean),id+'u',id+'l',[[x,-F],[x+L,-F]],[.48,.72],{dir:-1,ang:gableAng,hs:[[x+L/2,sy,sw,sh]]});
  const cx=x+L/2,holeShape=[{arc:[cx+sa,sy,sr,sr,-90,90]},{arc:[cx-sa,sy,sr,sr,90,270]}];
  if(hole){
   one('',holeShape,'ht2',id+'u',[[cx-sa,sy-sr],[cx+sa,sy-sr]],[.82,.98],{dir:1,ang:Math.PI/2});
   Hn.push([[cx-sa,sy-sr],[cx+sa,sy-sr]]);
  }else{
   P.push({n:'',...shape(holeShape)});
  }
  Hn.push([[x,-F],[x+L,-F]]);
 });

 [1,3].forEach(i=>{const x=X[i],id='r'+i,cx=x+W/2,y1=-.3,y0=y1-sl;
  one('屋頂',[[x,0],[x+W,0],[cx,-Hs,rr]],id,'p'+i,[[x,0],[x+W,0]],[.64,.84],{
   ang:roofAng,
   holes:[[cx-sw2/2,y1-slot3d,sw2,slot3d]]
  });
  P.push({n:'',...shape([{arc:[cx,y0+sw2/2,sw2/2,sw2/2,180,360]},{arc:[cx,y1-sw2/2,sw2/2,sw2/2,0,180]}])})});

 [1,3].forEach(i=>{const x=X[i],y=H;
  one('底翼',[[x,y],[x+.18*W,y+W/2],[x+W/2,y+W/2],[x+W,y]],'b'+i,'p'+i,[[x,y],[x+W,y]],[.34,.48],{ang:i===1?1.52:1.50});
  Hn.push([[x,y],[x+W,y]])});

 [0,2].forEach(i=>{const x=X[i],y=H,id='b'+i,v=(u,t,r)=>r?[x+u,y+t,r]:[x+u,y+t],
  jOff=Math.min(1,.02*L),
  u1=Math.max(bl+.5,L/2-jOff-(D-(W/2+jg))),
  u2=Math.min(L-rIn-.5,pe+(D-W/2));
  one('底片',[v(0,0),v(bl,D),v(u1,D),v(L/2-jOff,W/2+jg),v(L/2,W/2),v(pe,W/2),v(u2,D),v(L-rIn,D,rIn),v(L-rIn,2*nm_-rIn),v(L-nm_,nm_),v(L,0)],id,'p'+i,[[x,y],[x+L,y]],[.42,.56],{ang:i?1.55:Math.PI/2});
  Hn.push([[x+pe,y+W/2],[x+L-nm_,y+nm_]],[[x,y],[x+L,y]])});

 [0,1,2,3].forEach(i=>Hn.push([[X[i],0],[X[i],H]]));
 [0,1,2,3].forEach(i=>Hn.push([[X[i],0],[X[i+1],0]]));
 return {P,Hn,SL:[],SWd:0,yT:0}}