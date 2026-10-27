// ===== 插口式軟件盒（反向插口 Reverse Tuck End）：A/B/C/D 四面 + 左側糊邊；A 面上方為蓋、C 面下方為底插片，B/D 面上下各有防塵翼 =====
// ===== 指扣鎖扣蓋（Lock Tuck Lid）：折線上方有指扣半圓缺口，蓋角（耳）隨厚度高出折線並帶割縫；對面板另有雙折鎖扣小舌 =====
// 於 hinge 線 hy 往 dir 方向（-1 向上 / +1 向下）展開，x0~x1 為所接面板範圍；回傳蓋、插舌輪廓與折線
function lockLid(x0,x1,hy,dir,W,T){
 const Lw=x1-x0,xc=(x0+x1)/2,Y=d=>hy+dir*d,m=x=>x0+x1-x,
  e=ip(T,[.5,1,1.5,2,2.5,3],[0,.8,1.2,2,2.3,3]),           // 蓋角高出插舌折線的量（約等於厚度）
  nh=ip(T,[.5,1,1.5,2,2.5,3],[0,1.85,2.5,3.3,4.3,4.6]),    // 指扣梯形缺口高出折線的量
  so=ip(T,[1,1.5,2,2.5,3],[0,0,.8,1.2,2]),                 // 指扣兩側割縫超出折線的長度
  ear=e>.3,se=T<.75?0:T,                                    // 蓋角側邊割縫長度
  tl=Math.min(8,.12*Lw),ti=Math.min(.6*tl,ip(T,[.2,.5,1,1.5,2,3],[0,.2,1,1.6,2.2,3.2])),g=.05,
  hwMax=Math.max(2,Lw/2-tl-1.5),r=Math.max(1,Math.min(7.5,Lw*.0625,hwMax-1)),
  hw=Math.min(hwMax,11.6+.3*nh),hb=Math.min(hwMax+1,hw+.26*(nh+so)),
  tgN=Math.max(5,Math.min(14.6,.24*W)-.8*Math.max(0,T-.2)),
  dF=W-e,dN=dF+nh,ri=Math.min(8,.55*tgN),rr=Math.min(2.5,e+.5),
  P=(x,d,q)=>q?[x,Y(d),q]:[x,Y(d)],mp=p=>p.length>2?[m(p[0]),p[1],p[2]]:[m(p[0]),p[1]],
  f=nh>.01?(so>.01?nh/(nh+so):1):0,off=nh>.01?hw+(hb-hw)*f:hw,xl=xc-off,fx=ear?x0+tl+g:x0+tl;
 const LL=[[x0,hy]];
 if(ear)LL.push(P(x0,W),P(x0+tl,W,rr),P(x0+tl,dF-se),P(x0+tl+g,dF-se),P(x0+tl+g,dF));else LL.push(P(x0,dF),P(x0+tl,dF));
 LL.push(P(xl,dF));
 if(nh>.01){if(so>.01)LL.push(P(xc-hb,dF-so),P(xc-hb+g,dF-so));LL.push(P(xc-hw,dN))}
 LL.push(P(xc-r,dN));
 const lid=[...LL,{arc:[xc,Y(dN),r,r,180,dir<0?0:360]},...LL.slice(1).reverse().map(mp),[x1,hy]];
 const TL=[];
 if(ear)TL.push(P(x0+ti,W),P(x0+tl,W,rr),P(x0+tl,dF),P(x0+tl+g,dF));else TL.push(P(x0+ti,dF),P(x0+tl,dF));
 TL.push(P(xl,dF));if(nh>.01)TL.push(P(xc-hw,dN));
 const tg=[...TL,...TL.slice().reverse().map(mp),P(m(x0+ti),W+tgN,ri),P(x0+ti,W+tgN,ri)];
 return {lid,tg,hole:shape([[xc-r,Y(dN)],{arc:[xc,Y(dN),r,r,180,dir<0?0:360]},[xc+r,Y(dN)]]),hg:[[fx,Y(dF)],[m(fx),Y(dF)]],fold:[[[fx,Y(dF)],[xl,Y(dF)]],[[m(xl),Y(dF)],[m(fx),Y(dF)]]]}}
// 鎖扣小舌：位於與蓋（或底蓋）相對的面板邊緣，內段（面板內 td）＋外段（伸出 tu）雙折；面板輪廓需挖出對應缺口
function tabGeom(xc,ey,s,L,W,T){
 const tw=Math.min(.2*L,24),tu=Math.min(20,.33*W),td=Math.min(19.2,.32*W),ts=T<1.5?0:ip(T,[1.5,3],[0,2]),g=.05,rt=Math.min(4.5,tw/4),
  x0=xc-tw/2,x1=xc+tw/2,Y=d=>ey+s*d;
 return {pts:[[x0-g,ey],[x0-g,Y(td+ts)],[x0,Y(td+ts)],[x0,Y(td)],[x1,Y(td)],[x1,Y(td+ts)],[x1+g,Y(td+ts)],[x1+g,ey]],
  inn:[[x0,Y(td)],[x1,Y(td)],[x1,ey],[x0,ey]],out:[[x0,ey],[x1,ey],[x1,Y(-tu),rt],[x0,Y(-tu),rt]],h2:[[x0,Y(td)],[x1,Y(td)]],h1:[[x0,ey],[x1,ey]]}}
function buildT(L,W,H,T,game,lidC,lock,botA){
 // 依原站截圖（25/35/50/100 立方體、120×60×160 五種厚度）量測：C、D 面相對 A、B 面下移 sh（取代舊的補強邊）
 const sg=Math.min(4.7,.095*W),ti=.5,tg=Math.min(14.6,Math.max(5,.22*W)),u=Math.min(1,Math.max(0,(T-.75)/1.25)),
  sh=game?ip(T,[.2,.5,1,1.5,2,3],[.2,.5,.9,1.3,1.6,2]):ip(T,[.2,.5,1,2,3],[.2,.5,.8,.8,2]),
  g=Math.min(4,.12*W)+2.3*Math.max(0,T-1),gb=g*(.45+.55*u),arcOn=u>.3,
  dh=.5*W+.125*Math.max(0,L-W)+(T>1?3.5*Math.min(1,T-1)+.5*Math.max(0,Math.min(1,T-2)):0),
  ri=Math.min(8,.55*tg),rd=Math.min(5,.1*W+.5),tl=Math.min(8,.12*L),rx=gb/2,ry=Math.min(rx,3*u),
  gw=game?ip(H,[20.6,25,35,50,161],[9.1,9.3,13,13,15.8]):lock?Math.min(16,.27*W):Math.min(13,.37*W),gc=game?ip(H,[20.6,35,50,161],[2.4,2.5,3.7,4.7]):Math.min(3.5,.1*H,2.5+Math.max(0,H-35)/15),a=L,b=L+W,c=2*L+W,d=2*L+2*W,P=[],Hn=[],HL=[],
  one=(n,l,id,par,hg,w)=>P.push({n,...shape(l),id,par,hg,w}),
  Hs=H+sh;
 const TT=lock?(lidC?{p:'p0',...tabGeom(L/2,0,1,L,W,T)}:{p:'p2',...tabGeom((b+c)/2,sh,1,L,W,T)}):null,
  TB=lock&&!game?(botA?{p:'p2',...tabGeom((b+c)/2,Hs,-1,L,W,T)}:{p:'p0',...tabGeom(L/2,H,-1,L,W,T)}):null;
 const bx0=botA?0:b,bx1=botA?L:c,by=botA?H:Hs,bp=botA?'p0':'p2';
 one('A面',[[0,0],...(TT&&lidC?TT.pts:[]),[L,0],[L,H],...(TB&&!botA?TB.pts.slice().reverse():[]),[0,H]],'p0',null,null,[0,0]);
 one('B面',[[a,0],...(arcOn?[{arc:[a+rx,0,rx,ry,180,0]}]:[[a+gb,0]]),[b,0],[b,sh],[b,H],...(game?[]:arcOn?[{arc:[b-rx,H,rx,ry,0,-180]}]:[[b-gb,H]]),[a,H]],'p1','p0',[[a,0],[a,H]],[0,.3]);
 one('C面',[[b,sh],...(TT&&!lidC?TT.pts:[]),[c,sh],[c,Hs],...(TB&&botA?TB.pts.slice().reverse():[]),[b,Hs],[b,H]],'p2','p1',[[b,sh],[b,H]],[.05,.4]);
 one('D面',[[c,sh],...(arcOn?[{arc:[d-rx,sh,rx,ry,180,0]}]:[[d-gb,sh],[d,sh]]),[d,Hs],...(game?[]:arcOn?[{arc:[c+rx,Hs,rx,ry,0,-180]}]:[[c+gb,Hs]]),[c,Hs]],'p3','p2',[[c,sh],[c,Hs]],[.1,.5]);
 one('糊邊',[[0,0],[-gw,gc],[-gw,H-gc],[0,H]],'gl','p0',[[0,0],[0,H]],[.3,.45]);
 // 蓋位置：預設在 A 面上方；lidC 時改接在 C 面上方（C 面頂邊為 y=sh）
 const lx0=lidC?b:0,lx1=lidC?c:L,ly=lidC?sh:0;
 if(!lock)one('蓋',[[lx0,ly],[lx1,ly],[lx1,ly-W],[lx1-tl,ly-W],[lx0+tl,ly-W],[lx0,ly-W]],'lid',lidC?'p2':'p0',[[lx0,ly],[lx1,ly]],[.62,.84]);
 if(!lock)one('插舌',[[lx0+ti,ly-W],[lx0+tl,ly-W],[lx1-tl,ly-W],[lx1-ti,ly-W],[lx1-ti,ly-W-tg,ri],[lx0+ti,ly-W-tg,ri]],'lt','lid',[[lx0+tl,ly-W],[lx1-tl,ly-W]],[.82,.97]);
 if(!game&&!lock)one('底',[[bx0,by],[bx1,by],[bx1,by+W],[bx1-tl,by+W],[bx0+tl,by+W],[bx0,by+W]],'bf',bp,[[bx0,by],[bx1,by]],[.62,.84]);
 if(!game&&!lock)one('插舌',[[bx0+ti,by+W],[bx0+tl,by+W],[bx1-tl,by+W],[bx1-ti,by+W],[bx1-ti,by+W+tg,ri],[bx0+ti,by+W+tg,ri]],'bt','bf',[[bx0+tl,by+W],[bx1-tl,by+W]],[.82,.97]);
 if(lock){
  const o=lockLid(lx0,lx1,ly,-1,W,T);HL.push(o.hole);one('蓋',o.lid,'lid',lidC?'p2':'p0',[[lx0,ly],[lx1,ly]],[.62,.84]);one('插舌',o.tg,'lt','lid',o.hg,[.82,.97]);o.fold.forEach(q=>Hn.push(q));
  if(!game){const o2=lockLid(bx0,bx1,by,1,W,T);HL.push(o2.hole);one('底',o2.lid,'bf',bp,[[bx0,by],[bx1,by]],[.62,.84]);one('插舌',o2.tg,'bt','bf',o2.hg,[.82,.97]);o2.fold.forEach(q=>Hn.push(q))}
  [[TT,'t1'],[TB,'t2']].forEach(([q,k])=>{if(!q)return;one('鎖扣舌',q.inn,'ti'+k,q.p,q.h2,[.86,.97]);P[P.length-1].bump=.5;one('鎖扣舌',q.out,'to'+k,'ti'+k,q.h1,[.9,.97]);Hn.push(q.h2,q.h1)})}
 // 防塵翼：頂端圓角後接陡斜邊，再接 45° 小斜邊回到折線端點
 one('防塵翼',[[a+gb,0],[a+g,-dh,rd],[a+.87*W,-dh,rd],[a+.94*W,-.3*dh],[b,-sg],[b,0]],'dBt','p1',[[a+gb,0],[b,0]],[.5,.64]);
 if(!game)one('防塵翼',[[b-gb,H],[b-g,H+dh,rd],[a+.13*W,H+dh,rd],[a+.06*W,H+.3*dh],[a,H+sg],[a,H]],'dBb','p1',[[a,H],[b-gb,H]],[.5,.64]);
 one('防塵翼',[[c,sh],[c,sh-sg],[c+.06*W,sh-.3*dh],[c+.13*W,sh-dh,rd],[d-g,sh-dh,rd],[d-gb,sh]],'dDt','p3',[[c,sh],[d-gb,sh]],[.5,.64]);
 if(!game)one('防塵翼',[[c+gb,Hs],[c+g,Hs+dh,rd],[d-.13*W,Hs+dh,rd],[d-.06*W,Hs+.3*dh],[d,Hs+sg],[d,Hs]],'dDb','p3',[[c+gb,Hs],[d,Hs]],[.5,.64]);
 [0,a].forEach(x=>Hn.push([[x,0],[x,H]]));Hn.push([[b,sh],[b,H]],[[c,sh],[c,Hs]]);
 Hn.push([[a+gb,0],[b,0]],[[a,H],[b-(game?0:gb),H]],[[c,sh],[d-gb,sh]],[[c+(game?0:gb),Hs],[d,Hs]],
  [[0,H],[L,H]],[[b,sh],[c,sh]],[[b,Hs],[c,Hs]]);if(!lock)Hn.push([[lx0+tl,ly-W],[lx1-tl,ly-W]]);if(!lidC)Hn.push([[0,0],[L,0]]);if(!game&&!lock)Hn.push([[bx0+tl,by+W],[bx1-tl,by+W]]);

 // 自動鎖底：A 面底襯（中間缺口）、C 面底襯（斜肩＋中央舌片）、B/D 面斜肩小翼
 if(game){const r_=Math.max(0,Math.min(1.3,L/W-1)),fl=W<10.6?.745*W:W>60.6?.815*W:ip(W,[10.6,25,50,60.6],[7.9,18.9,39,49.4]),
  gap=L<15.6?.42*L:L>120.6?.5*L:ip(L,[15.6,25,50,120.6],[6.6,9,18,60]),gd=.34*fl,tw=(L-gap)/2,rr=Math.min(3.6,.09*fl+.5),
  dep=W*(.5+.24*r_),ex=.49*W,ey=W*(.33+.15*r_),rb=Math.min(4,.1*W),k=Math.min(1.5,.04*L),tab=1.1*gd,
  fb=[[0,0],[ex,ey],[ex+.7,ey+2],[ex+.7,dep,rb],[W-.7,dep],[W,0]];
  one('底襯',[[0,H],[0,H+fl],[tw,H+fl,rr],[tw,H+fl-gd],[L-tw,H+fl-gd],[L-tw,H+fl,rr],[L,H+fl],[L,H]],'fa','p0',[[0,H],[L,H]],[.62,.84]);
  one('底',[[b,Hs],[b+tw-k,Hs+fl-tab-k],[b+tw,Hs+fl-tab],[b+tw,Hs+fl,rr],[c-tw,Hs+fl,rr],[c-tw,Hs+fl-tab],[c-tw+k,Hs+fl-tab-k],[c,Hs]],'bf','p2',[[b,Hs],[c,Hs]],[.62,.84]);
  one('底翼',fb.map(([x,y,r])=>[a+x,H+y,r]),'fB','p1',[[a,H],[b,H]],[.5,.64]);
  one('底翼',fb.map(([x,y,r])=>[d-x,Hs+y,r]),'fD','p3',[[c,Hs],[d,Hs]],[.5,.64]);}
  return {P,Hn,SL:[],SWd:0,yT:0,HL}}
