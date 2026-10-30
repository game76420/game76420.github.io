// ===== 匯出：AI(SVG) / PDF / DXF(ZIP) / JPG 與下載 =====
const ERR={rejected_extension:'此檔案格式不被允許',too_large:'檔案過大',rate_limited:'操作太頻繁，請稍後再試',bad_request:'檔案內容無效',unavailable:'此環境不支援下載，請在 claude.ai 開啟'};
async function save(name,data){
 let d=null;try{d=window.claude&&claude.use?await claude.use('downloads'):null}catch(e){d=null}
 if(d){try{const r=await d.save({filename:name,data});if(r&&r.status==='saved')toast('已儲存：'+name);return}catch(e){if(e&&e.code==='declined')return}}
 try{const blob=data instanceof Blob?data:new Blob([data]),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();setTimeout(()=>a.remove(),1500);
  const e=$('toast');e.innerHTML='';e.append('已下載：'+name+'　若沒有自動下載，');const l=document.createElement('a');l.href=u;l.download=name;l.textContent='請點此儲存';l.style.cssText='color:#7cc4ff;text-decoration:underline;cursor:pointer';e.appendChild(l);e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',9000);setTimeout(()=>URL.revokeObjectURL(u),120000)}catch(e){toast('下載失敗：'+((e&&e.message)||e))}}
const slotPts=([x,y,w,h])=>{if(S.T<.85){const t=Math.min(w,S.T);return x>0?[[x+w,y],[x,y+t],[x,y+h-t],[x+w,y+h]]:[[x,y],[x+w,y+t],[x+w,y+h-t],[x,y+h]]}const r=w/2,o=[];for(let i=0;i<=8;i++){const a=Math.PI*i/8;o.push([x+r-r*Math.cos(a),y+r-r*Math.sin(a)])}for(let i=0;i<=8;i++){const a=Math.PI*i/8;o.push([x+r+r*Math.cos(a),y+h-r+r*Math.sin(a)])}return o};
const pick=id=>{document.querySelectorAll('.fb button').forEach(b=>b.classList.toggle('on',b.id===id))};
const svgOut=()=>G.raw.replace(/@PF/g,'#ffffff').replace(/@CV/g,'#ffffff').replace('<svg ',`<svg width="${G.vw.toFixed(3)}mm" height="${G.vh.toFixed(3)}mm" `);
const svgBlob=()=>new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n'+svgOut()],{type:'image/svg+xml'});
const toPng=(svg,w,h,name)=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);c.toBlob(b=>save(name,b),'image/png')};img.onerror=()=>toast('圖片轉換失敗');
 img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)};
$('dAI').onclick=()=>{pick('dAI');save(nm()+'.svg',svgBlob())};
$('dPNG').onclick=()=>{pick('dPNG');const k=Math.min(150/25.4,4096/Math.max(G.vw,G.vh)),w=Math.round(G.vw*k),h=Math.round(G.vh*k),img=new Image();
 img.onload=()=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);c.toBlob(b=>save(nm()+'.jpg',b),'image/jpeg',.92)};
 img.onerror=()=>toast('圖片轉換失敗');img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgOut())};
$('dPDF').onclick=()=>{pick('dPDF');const sc=2.83465,w=G.vw*sc,h=G.vh*sc,X=x=>((x-G.vx)*sc).toFixed(2),Y=y=>(h-(y-G.vy)*sc).toFixed(2);
 const ln=a=>a.map(q=>q.c1?`${X(q.a[0])} ${Y(q.a[1])} m ${X(q.c1[0])} ${Y(q.c1[1])} ${X(q.c2[0])} ${Y(q.c2[1])} ${X(q.b[0])} ${Y(q.b[1])} c`:`${X(q.a[0])} ${Y(q.a[1])} m ${X(q.b[0])} ${Y(q.b[1])} l`).join('\n')+'\nS\n';
 const sl=G.slots.map(q=>{const a=slotPts(q);return a.map((v,i)=>`${X(v[0])} ${Y(v[1])} ${i?'l':'m'}`).join('\n')+(S.T<.85?'\nS\n':'\nh S\n')}).join('');
 const c=`1 0 0 RG 0.6 w [3 2] 0 d\n${ln(G.fold)}0 0 0.8 RG 0.8 w [] 0 d\n${ln(G.cut)}${sl}`;
 const o=['<</Type/Catalog/Pages 2 0 R>>','<</Type/Pages/Kids[3 0 R]/Count 1>>',`<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${w.toFixed(2)} ${h.toFixed(2)}]/Contents 4 0 R>>`,`<</Length ${new TextEncoder().encode(c).length}>>\nstream\n${c}endstream`];
 let p='%PDF-1.4\n',off=[];o.forEach((b,i)=>{off.push(p.length);p+=`${i+1} 0 obj\n${b}\nendobj\n`});
 const xr=p.length;p+=`xref\n0 ${o.length+1}\n0000000000 65535 f \n`+off.map(v=>String(v).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<</Size ${o.length+1}/Root 1 0 R>>\nstartxref\n${xr}\n%%EOF`;
 save(nm()+'.pdf',new Blob([new TextEncoder().encode(p)],{type:'application/pdf'}))};
function crc32(u){let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}let r=-1;for(const b of u)r=t[(r^b)&255]^(r>>>8);return(r^-1)>>>0}
function zip(name,text){const e=new TextEncoder(),nm=e.encode(name),d=e.encode(text),c=crc32(d),n=d.length;
 const u32=v=>[v&255,v>>8&255,v>>16&255,v>>>24&255],u16=v=>[v&255,v>>8&255];
 const lh=[0x50,0x4b,3,4,...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0x21),...u32(c),...u32(n),...u32(n),...u16(nm.length),...u16(0)];
 const cd=[0x50,0x4b,1,2,...u16(20),...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0x21),...u32(c),...u32(n),...u32(n),...u16(nm.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(0)];
 const eo=[0x50,0x4b,5,6,0,0,0,0,...u16(1),...u16(1),...u32(cd.length+nm.length),...u32(lh.length+nm.length+n),...u16(0)];
 return new Blob([new Uint8Array(lh),nm,d,new Uint8Array(cd),nm,new Uint8Array(eo)],{type:'application/zip'})}
$('dDXF').onclick=()=>{pick('dDXF');let t=`0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n9\n$MEASUREMENT\n70\n1\n9\n$LUNITS\n70\n2\n9\n$EXTMIN\n10\n${G.vx.toFixed(3)}\n20\n${(-G.vy-G.vh).toFixed(3)}\n30\n0\n9\n$EXTMAX\n10\n${(G.vx+G.vw).toFixed(3)}\n20\n${(-G.vy).toFixed(3)}\n30\n0\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLTYPE\n70\n1\n0\nLTYPE\n2\nCONTINUOUS\n70\n0\n3\nSolid line\n72\n65\n73\n0\n40\n0\n0\nENDTAB\n0\nTABLE\n2\nLAYER\n70\n2\n0\nLAYER\n2\nCUT\n70\n0\n62\n5\n6\nCONTINUOUS\n0\nLAYER\n2\nCREASE\n70\n0\n62\n1\n6\nCONTINUOUS\n0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;
 const L=(a,b,ly,co)=>t+=`0\nLINE\n8\n${ly}\n62\n${co}\n10\n${a[0].toFixed(3)}\n20\n${(-a[1]).toFixed(3)}\n30\n0\n11\n${b[0].toFixed(3)}\n21\n${(-b[1]).toFixed(3)}\n31\n0\n`;
 G.cut.forEach(q=>{if(!q.c1)return L(q.a,q.b,'CUT',5);let l=q.a;for(let i=1;i<=24;i++){const m=bz(q,i/24);L(l,m,'CUT',5);l=m}});G.fold.forEach(q=>L(q.a,q.b,'CREASE',1));
 G.slots.forEach(q=>{const p=slotPts(q);p.forEach((a,i)=>{if(!(S.T<.85&&i===p.length-1))L(a,p[(i+1)%p.length],'CUT',5)})});
 t+='0\nENDSEC\n0\nEOF\n';save(nm()+'_DXF.zip',zip(nm()+'.dxf',t))};

// ===== 3D 線條圖 DXF：輸出目前折疊狀態的稜線；勾選「隱藏線消除」時只輸出目前視角看得到的線（2D 投影） =====
function edgeList(){const T3=THREE,o=[];TH.sc.updateMatrixWorld(true);
 TH.content.traverse(n=>{if(!n.isLineSegments)return;const ps=n.geometry.attributes.position;
  for(let i=0;i+1<ps.count;i+=2)o.push([new T3.Vector3().fromBufferAttribute(ps,i).applyMatrix4(n.matrixWorld),new T3.Vector3().fromBufferAttribute(ps,i+1).applyMatrix4(n.matrixWorld)])});return o}
function visibleRuns(E){
 const T3=THREE,cam=TH.cam,cp=cam.position.clone(),rc=new T3.Raycaster(),ms=[],eps=Math.max(.03,S.T*.3),out=[];
 TH.content.traverse(n=>{if(n.isMesh)ms.push(n)});
 const vis=p=>{const d=p.clone().sub(cp),dist=d.length();d.normalize();rc.set(cp,d);rc.near=0;rc.far=dist+1;const h=rc.intersectObjects(ms,false);return !h.length||h[0].distance>=dist-eps};
 for(const [a,b] of E){const len=a.distanceTo(b),n=Math.max(1,Math.min(80,Math.ceil(len/2))),v=[];
  for(let k=0;k<n;k++)v.push(vis(a.clone().lerp(b,(k+.5)/n)));
  let s=-1;for(let k=0;k<=n;k++){const on=k<n&&v[k];if(on&&s<0)s=k;if(!on&&s>=0){out.push([a.clone().lerp(b,s/n),a.clone().lerp(b,k/n)]);s=-1}}}
 return out}
function dxf3d(hide){
 const T3=THREE;show();const E=edgeList();let L;
 if(hide){const sc=TH.lastDist*Math.tan(TH.cam.fov*Math.PI/360),as=TH.cam.aspect,
   pj=p=>{const q=p.clone().project(TH.cam);return new T3.Vector3(q.x*as*sc,q.y*sc,0)};
  L=visibleRuns(E).map(([a,b])=>[pj(a),pj(b)])}
 else{const m=new T3.Matrix4();m.copy(TH.spin.matrixWorld);const iv=m.clone();iv.invert?iv.invert():iv.getInverse(m);L=E.map(([a,b])=>[a.clone().applyMatrix4(iv),b.clone().applyMatrix4(iv)])}
 let t=`0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLTYPE\n70\n1\n0\nLTYPE\n2\nCONTINUOUS\n70\n0\n3\nSolid line\n72\n65\n73\n0\n40\n0\n0\nENDTAB\n0\nTABLE\n2\nLAYER\n70\n1\n0\nLAYER\n2\nEDGE\n70\n0\n62\n7\n6\nCONTINUOUS\n0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;
 const f=v=>v.toFixed(3);
 for(const [a,b] of L){if(a.distanceTo(b)<1e-6)continue;t+=`0\nLINE\n8\nEDGE\n10\n${f(a.x)}\n20\n${f(a.y)}\n30\n${f(a.z)}\n11\n${f(b.x)}\n21\n${f(b.y)}\n31\n${f(b.z)}\n`}
 return t+'0\nENDSEC\n0\nEOF\n'}
$('d3D').onclick=()=>{pick('d3D');if(!TH.r||!TH.built){toast('此環境無法產生 3D 模型');return}
 const hide=$('oHide').checked;toast(hide?'正在計算可見線…':'正在輸出 3D 線條圖…');
 setTimeout(()=>{try{const n=nm()+(hide?'_3D線條圖(可見線)':'_3D線條圖');save(n+'_DXF.zip',zip(n+'.dxf',dxf3d(hide)))}catch(e){toast('輸出失敗：'+((e&&e.message)||e))}},30)};
