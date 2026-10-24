function build(L,W,H,T){
 // 厚度相關尺寸：由 T=1.5 與 T=5 兩張 Pacdora 截圖逐像素量測後擬合
 const cT=v=>ip(T,[.5,.8,.9,1.5],v),q=H/62,g=3*T,s=3*T,f=1.5*T,fw=H-1.5*T+ip(W,[97.5,120,202],[-.55,.4,1.1])+cT([-1.18,-2.33,.52,0]),wW=Math.min(H-T+.5+ip(T,[.8,.9,1.5],[-1.5,-1,0]),.5*W-.4),fi=ip(T,[.5,1.5,3,5],[.65,1.575,2.25,3.15]),SWd=T*Math.min(3,.75+.0407*W,2.6+.0121*(H-29))+cT([.21,.77,.59,0]),tp=ip(T,[.5,1.5,3,5],[2.1,3.83,6,10])+cT([0,.58,.31,0]),ba=ip(T,[.5,1.5,3,5],[3,3.15,4.8,7]),bt=H-.7*T;
 const eW=.4*W+Math.max(0,1-(W-22)/28),eTw=Math.min(.927*H-4.9+ip(T,[.8,.9,1.5],[1.4,.3,0]),.5705*W+1.2*Math.min(1,Math.max(0,(W-22)/28))),rc=Math.min(.45*eTw,Math.max(eTw*(.26+.027*Math.max(0,T-1.5)),8+.02*H)),fH=H-.2*T+.4*Math.min(1,T/3),eo=ip(T,[.5,1.5,3],[.65,2.47,1.5]),ry=Math.min((H<=100?ip(H,[22,50,100],[16.1,34.3,79.9]):.8*H)+cT([5.6,5.2,4.9,0])*H/50,fH-.5*T-rc-eo);
 const lid=W+T,yB=-H,yT=-H-lid,fT=yT-fH,yE=yT-.5*T,x0=-H-s,x1=x0-fw;
 const P=[],Hn=[],mx=p=>[L-p[0],p[1]],mxe=e=>Array.isArray(e)?[L-e[0],...e.slice(1)]:{arc:[L-e.arc[0],e.arc[1],e.arc[2],e.arc[3],180-e.arc[4],180-e.arc[5]]};
 const one=(n,list,id,par,hg,w)=>P.push({n,...shape(list),id,par,hg,w});
 const both=(n,pts,id,par,hg,w)=>{const lp=par[0]==='!'?par.slice(1):par+'l',rp=par[0]==='!'?par.slice(1):par+'r';
  P.push({n,...shape(pts),id:id+'l',par:lp,hg,w});P.push({n:'',...shape(pts.map(mxe)),id:id+'r',par:rp,hg:hg.map(mx),w})};
 one('底面',[[0,0],[T,0],[L-T,0],[L,0],[L,W],[L-f,W],[f,W],[0,W]],'bot');
 one('後壁',[[T,-bt],[g,-bt],[g,-H],[L-g,-H],[L-g,-bt],[L-T,-bt],[L-T,0],[T,0]],'back','bot',[[T,0],[L-T,0]],[0,.15]);
 one('前壁',[[f,W],[L-f,W],[L-f,W+H-T],[f,W+H-T]],'front','bot',[[f,W],[L-f,W]],[0,.15]);
 one('蓋子',[[g,yT],[L-g,yT],[L-g,yB],[g,yB]],'lid','back',[[g,yB],[L-g,yB]],[.68,.94]);
 one('蓋頂插片',[[T+Math.min(2.2,1+.7*T),fT],[L-T-Math.min(2.2,1+.7*T),fT],[L-T,fT+eo],[L-T,yE],[L-T,yT],[L-g,yT],[g,yT],[T,yT],[T,yE],[T,fT+eo]],'flap','lid',[[g,yT],[L-g,yT]],[.55,.96]);
 both('',[[T,yE],{arc:[T-eTw+rc,yE-rc,rc,rc,90,180]},{arc:[T,fT+eo+ry,eTw,ry,180,270]}],'te','!flap',[[T,fT+eo],[T,yE]],[.50,.76]);
 both('側壁',[[-H,0],[0,0],[0,W],[-H,W]],'w','!bot',[[0,0],[0,W]],[.27,.42]);
 both('',[[x0,fi],[-H,0],[-H,W],[x0,W-fi]],'s','w',[[-H,0],[-H,W]],[.40,.49]);
 const SL=W<120?[[.3*W,.7*W]]:[[.2*W,.4*W],[.6*W,.8*W]];
 P[0].holes=[0,L-SWd].flatMap(x=>SL.map(([a,b])=>[x,a,SWd,b-a]));
 both('內襯',[[x0,fi],[x1,fi,Math.max(0,Math.min(1.2,T-.2))],...SL.flatMap(([a,b])=>[[x1,a],[x1-tp,a+T],[x1-tp,b-T],[x1,b]]),[x1,W-fi,Math.max(0,Math.min(1.2,T-.2))],[x0,W-fi]],'i','s',[[x0,fi],[x0,W-fi]],[.48,.62]);
 both('後角翼',[[T,-bt],[T-eW,-bt],[T-eW,-ba],[T-ba,-ba],[T,0]],'be','!back',[[T,-bt],[T,0]],[.15,.27]);
 both('前角翼',[[f,W],[f-ba,W+ba],[f-eW,W+ba],[f-eW,W+H-T],[f,W+H-T]],'fe','!front',[[f,W],[f,W+H-T]],[.15,.27]);
 both('防塵翼',[[g,yT],[g-wW,yT+.4*wW,Math.min(9*q,10)],[g-wW,yB-.4*wW,Math.min(9*q,10)],[g,yB]],'g','!lid',[[g,yT],[g,yB]],[.56,.68]);
 const hl=[[[0,0],[0,W]],[[-H,0],[-H,W]],[[x0,fi],[x0,W-fi]],[[T,-bt],[T,0]],[[f,W],[f,W+H-T]],[[g,yT],[g,yB]],[[T,fT+eo],[T,yE]]];
 hl.forEach(h=>{Hn.push(h);Hn.push(h.map(mx))});
 Hn.push([[T,0],[L-T,0]],[[f,W],[L-f,W]],[[g,yB],[L-g,yB]],[[g,yT],[L-g,yT]]);
 return {P,Hn,yT,SL,SWd};
}
// ===== 方形運輸箱（RSC 標準開槽箱）：4 面板 + 糊邊 + 上下各 4 片蓋；L 面為大蓋、W 面為小蓋 =====
