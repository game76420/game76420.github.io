// ===== 箱內隔板（十字格柵隔板）=====
// L/W/H = 隔板外框的長/寬/高；nL/nW = 長度/寬度方向的隔間數；T = 紙板厚度
// S.dvOut = true ：含四周外牆（如實物圖：外框＋內部格柵）
//   A 板（長向）共 nW+1 片、B 板（寬向）共 nL+1 片；L/W 為外牆外緣到外緣
//   外牆與內牆同樣以十字槽互相卡合：每片板為完整全高長方形（含穿出凸片），在每個交叉處（含外牆角落）開槽
//   S.dvE（穿出外牆距離, mm）：四周每片板的「無槽半邊」兩端各多伸出 dvE，穿過對向外牆的槽口後凸出外牆外緣；0 = 不穿出（板端與外牆外緣齊平）
// S.dvOut = false：只有內部隔板（A: nW-1 片、B: nL-1 片），不含外牆與凸片（穿出距離無效）
// A 板：長 L × 高 H，槽口由上往下開 H/2（槽寬 = T）
// B 板：長 W × 高 H，槽口由下往上開 H/2（槽寬 = T）
function dvCells(L,W,T,nL,nW,out){
 const o=out?1:-1;
 return {cL:Math.max(1,(L-(nL+o)*T)/nL),cW:Math.max(1,(W-(nW+o)*T)/nW)}
}
function buildDV(L,W,H,T){
 const nL=Math.max(1,S.nL|0),nW=Math.max(1,S.nW|0),out=!!S.dvOut,
  e=out?Math.max(0,+S.dvE||0):0,{cL,cW}=dvCells(L,W,T,nL,nW,out),
  gap=12,gut=Math.max(12,Math.max(L,W)*.1),P=[],D=[],ext=[[0,0]];
 // 隔板（牆）在長度 / 寬度方向的起始位置
 const pos=(j,c)=>j*(c+T)-(out?0:T);
 const range=(a,b)=>{const r=[];for(let j=a;j<=b;j++)r.push(j);return r};
 const jx=out?range(0,nL):range(1,nL-1),jy=out?range(0,nW):range(1,nW-1);
 const xsAll=jx.map(j=>pos(j,cL)),ysAll=jy.map(j=>pos(j,cW));        // 所有牆位置（外牆＋內牆）
 const xsIn=range(1,nL-1).map(j=>pos(j,cL)),ysIn=range(1,nW-1).map(j=>pos(j,cW)); // 內牆位置（= 對向板需要開槽處）
 const grid=(n,a,b)=>{const cols=Math.max(1,Math.min(n,Math.round(Math.sqrt(n*b/a))));return {cols,rows:Math.ceil(n/cols)}};
 let cx=gut;
 const group=(kind,n,a,slots,fromTop,starts,name)=>{
  if(n<1)return;const aw=a+2*e,{cols}=grid(n,aw,H);
  for(let k=0;k<n;k++){
   const c=k%cols,r=Math.floor(k/cols),ox=cx+e+c*(aw+gap),oy=gut+r*(H+gap),h2=oy+H/2,l=[],
    x0=out?ox+T:ox,x1=out?ox+a-T:ox+a,xl=ox-e,xr=ox+a+e;   // x0~x1 = 有槽半的範圍；xl~xr = 無槽半（含凸片）的範圍
   if(out){   // 含外牆：整片全高長方形（含穿出凸片），每個交叉處（含外牆角落）開十字槽互卡
    if(fromTop){
     l.push([xl,oy]);
     for(const s of slots)l.push([ox+s,oy],[ox+s,h2],[ox+s+T,h2],[ox+s+T,oy]);
     l.push([xr,oy],[xr,oy+H],[xl,oy+H]);
    }else{
     l.push([xl,oy],[xr,oy],[xr,oy+H]);
     for(let q=slots.length-1;q>=0;q--){const s=slots[q];l.push([ox+s+T,oy+H],[ox+s+T,h2],[ox+s,h2],[ox+s,oy+H])}
     l.push([xl,oy+H]);
    }
    for(let i=l.length-1;i>0;i--)if(Math.hypot(l[i][0]-l[i-1][0],l[i][1]-l[i-1][1])<1e-6)l.splice(i,1);
    if(l.length>2&&Math.hypot(l[0][0]-l[l.length-1][0],l[0][1]-l[l.length-1][1])<1e-6)l.pop();
   }else if(fromTop){
    l.push([x0,oy]);
    for(const s of slots)l.push([ox+s,oy],[ox+s,h2],[ox+s+T,h2],[ox+s+T,oy]);
    l.push([x1,oy],[x1,h2],[xr,h2],[xr,oy+H],[xl,oy+H],[xl,h2],[x0,h2]);
   }else{
    l.push([xl,oy],[xr,oy],[xr,h2],[x1,h2],[x1,oy+H]);
    for(let q=slots.length-1;q>=0;q--){const s=slots[q];l.push([ox+s+T,oy+H],[ox+s+T,h2],[ox+s,h2],[ox+s,oy+H])}
    l.push([x0,oy+H],[x0,h2],[xl,h2]);
   }
   P.push({n:`${kind} ${name}`,...shape(l),ly:fromTop?oy+H*.8:oy+H*.3,dv:{kind,ox,oy,a,b:H,s:starts[k]}});
   if(k===0)D.push({ox:xl,oy,a:aw,b:H,kind,name,n,e});
  }
  cx+=cols*(aw+gap)-gap+gut+gap;
 };
 group('A',ysAll.length,L,out?xsAll:xsIn,true,ysAll,'長向隔板');
 group('B',xsAll.length,W,out?ysAll:ysIn,false,xsAll,'寬向隔板');
 // 預留標註空間
 const maxX=Math.max(...P.flatMap(p=>p.pts.map(q=>q[0])));ext.push([maxX,0]);
 return {P,Hn:[],SL:[],SWd:0,yT:0,D,gut,ext}
}
