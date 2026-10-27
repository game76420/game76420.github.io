// ===== 插口式軟件盒（反向插口 Reverse Tuck End）：A/B/C/D 四面 + 左側糊邊；A 面上方為蓋、C 面下方為底插片，B/D 面上下各有防塵翼 =====
function buildT(L,W,H,T,game,lidC){
 // 依原站截圖（25/35/50/100 立方體、120×60×160 五種厚度）量測：C、D 面相對 A、B 面下移 sh（取代舊的補強邊）
 const sg=Math.min(4.7,.095*W),ti=.5,tg=Math.min(14.6,Math.max(5,.22*W)),u=Math.min(1,Math.max(0,(T-.75)/1.25)),
  sh=game?ip(T,[.2,.5,1,1.5,2,3],[.2,.5,.9,1.3,1.6,2]):ip(T,[.2,.5,1,2,3],[.2,.5,.8,.8,2]),
  g=Math.min(4,.12*W)+2.3*Math.max(0,T-1),gb=g*(.45+.55*u),arcOn=u>.3,
  dh=.5*W+.125*Math.max(0,L-W)+(T>1?3.5*Math.min(1,T-1)+.5*Math.max(0,Math.min(1,T-2)):0),
  ri=Math.min(8,.55*tg),rd=Math.min(5,.1*W+.5),tl=Math.min(8,.12*L),rx=gb/2,ry=Math.min(rx,3*u),
  gw=game?ip(H,[20.6,25,35,50,161],[9.1,9.3,13,13,15.8]):Math.min(13,.37*W),gc=game?ip(H,[20.6,35,50,161],[2.4,2.5,3.7,4.7]):Math.min(3.5,.1*H,2.5+Math.max(0,H-35)/15),a=L,b=L+W,c=2*L+W,d=2*L+2*W,P=[],Hn=[],
  one=(n,l,id,par,hg,w)=>P.push({n,...shape(l),id,par,hg,w}),
  Hs=H+sh;
 one('A面',[[0,0],[L,0],[L,H],[0,H]],'p0',null,null,[0,0]);
 one('B面',[[a,0],...(arcOn?[{arc:[a+rx,0,rx,ry,180,0]}]:[[a+gb,0]]),[b,0],[b,sh],[b,H],...(game?[]:arcOn?[{arc:[b-rx,H,rx,ry,0,-180]}]:[[b-gb,H]]),[a,H]],'p1','p0',[[a,0],[a,H]],[0,.3]);
 one('C面',[[b,sh],[c,sh],[c,Hs],[b,Hs],[b,H]],'p2','p1',[[b,sh],[b,H]],[.05,.4]);
 one('D面',[[c,sh],...(arcOn?[{arc:[d-rx,sh,rx,ry,180,0]}]:[[d-gb,sh],[d,sh]]),[d,Hs],...(game?[]:arcOn?[{arc:[c+rx,Hs,rx,ry,0,-180]}]:[[c+gb,Hs]]),[c,Hs]],'p3','p2',[[c,sh],[c,Hs]],[.1,.5]);
 one('糊邊',[[0,0],[-gw,gc],[-gw,H-gc],[0,H]],'gl','p0',[[0,0],[0,H]],[.3,.45]);
 // 蓋位置：預設在 A 面上方；lidC 時改接在 C 面上方（C 面頂邊為 y=sh）
 const lx0=lidC?b:0,lx1=lidC?c:L,ly=lidC?sh:0;
 one('蓋',[[lx0,ly],[lx1,ly],[lx1,ly-W],[lx1-tl,ly-W],[lx0+tl,ly-W],[lx0,ly-W]],'lid',lidC?'p2':'p0',[[lx0,ly],[lx1,ly]],[.62,.84]);
 one('插舌',[[lx0+ti,ly-W],[lx0+tl,ly-W],[lx1-tl,ly-W],[lx1-ti,ly-W],[lx1-ti,ly-W-tg,ri],[lx0+ti,ly-W-tg,ri]],'lt','lid',[[lx0+tl,ly-W],[lx1-tl,ly-W]],[.82,.97]);
 if(!game)one('底',[[b,Hs],[c,Hs],[c,Hs+W],[c-tl,Hs+W],[b+tl,Hs+W],[b,Hs+W]],'bf','p2',[[b,Hs],[c,Hs]],[.62,.84]);
 if(!game)one('插舌',[[b+ti,Hs+W],[b+tl,Hs+W],[c-tl,Hs+W],[c-ti,Hs+W],[c-ti,Hs+W+tg,ri],[b+ti,Hs+W+tg,ri]],'bt','bf',[[b+tl,Hs+W],[c-tl,Hs+W]],[.82,.97]);
 // 防塵翼：頂端圓角後接陡斜邊，再接 45° 小斜邊回到折線端點
 one('防塵翼',[[a+gb,0],[a+g,-dh,rd],[a+.87*W,-dh,rd],[a+.94*W,-.3*dh],[b,-sg],[b,0]],'dBt','p1',[[a+gb,0],[b,0]],[.5,.64]);
 if(!game)one('防塵翼',[[b-gb,H],[b-g,H+dh,rd],[a+.13*W,H+dh,rd],[a+.06*W,H+.3*dh],[a,H+sg],[a,H]],'dBb','p1',[[a,H],[b-gb,H]],[.5,.64]);
 one('防塵翼',[[c,sh],[c,sh-sg],[c+.06*W,sh-.3*dh],[c+.13*W,sh-dh,rd],[d-g,sh-dh,rd],[d-gb,sh]],'dDt','p3',[[c,sh],[d-gb,sh]],[.5,.64]);
 if(!game)one('防塵翼',[[c+gb,Hs],[c+g,Hs+dh,rd],[d-.13*W,Hs+dh,rd],[d-.06*W,Hs+.3*dh],[d,Hs+sg],[d,Hs]],'dDb','p3',[[c+gb,Hs],[d,Hs]],[.5,.64]);
 [0,a].forEach(x=>Hn.push([[x,0],[x,H]]));Hn.push([[b,sh],[b,H]],[[c,sh],[c,Hs]]);
 Hn.push([[a+gb,0],[b,0]],[[a,H],[b-(game?0:gb),H]],[[c,sh],[d-gb,sh]],[[c+(game?0:gb),Hs],[d,Hs]],
  [[0,H],[L,H]],[[b,sh],[c,sh]],[[b,Hs],[c,Hs]],[[lx0+tl,ly-W],[lx1-tl,ly-W]]);if(!lidC)Hn.push([[0,0],[L,0]]);if(!game)Hn.push([[b+tl,Hs+W],[c-tl,Hs+W]]);

 // 自動鎖底：A 面底襯（中間缺口）、C 面底襯（斜肩＋中央舌片）、B/D 面斜肩小翼
 if(game){const r_=Math.max(0,Math.min(1.3,L/W-1)),fl=W<10.6?.745*W:W>60.6?.815*W:ip(W,[10.6,25,50,60.6],[7.9,18.9,39,49.4]),
  gap=L<15.6?.42*L:L>120.6?.5*L:ip(L,[15.6,25,50,120.6],[6.6,9,18,60]),gd=.34*fl,tw=(L-gap)/2,rr=Math.min(3.6,.09*fl+.5),
  dep=W*(.5+.24*r_),ex=.49*W,ey=W*(.33+.15*r_),rb=Math.min(4,.1*W),k=Math.min(1.5,.04*L),tab=1.1*gd,
  fb=[[0,0],[ex,ey],[ex+.7,ey+2],[ex+.7,dep,rb],[W-.7,dep],[W,0]];
  one('底襯',[[0,H],[0,H+fl],[tw,H+fl,rr],[tw,H+fl-gd],[L-tw,H+fl-gd],[L-tw,H+fl,rr],[L,H+fl],[L,H]],'fa','p0',[[0,H],[L,H]],[.62,.84]);
  one('底',[[b,Hs],[b+tw-k,Hs+fl-tab-k],[b+tw,Hs+fl-tab],[b+tw,Hs+fl,rr],[c-tw,Hs+fl,rr],[c-tw,Hs+fl-tab],[c-tw+k,Hs+fl-tab-k],[c,Hs]],'bf','p2',[[b,Hs],[c,Hs]],[.62,.84]);
  one('底翼',fb.map(([x,y,r])=>[a+x,H+y,r]),'fB','p1',[[a,H],[b,H]],[.5,.64]);
  one('底翼',fb.map(([x,y,r])=>[d-x,Hs+y,r]),'fD','p3',[[c,Hs],[d,Hs]],[.5,.64]);}
  return {P,Hn,SL:[],SWd:0,yT:0}}
