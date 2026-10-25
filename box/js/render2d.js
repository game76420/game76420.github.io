// ===== 盒型切換 + 2D 刀模繪製 =====
$('kd').onclick=e=>{const b=e.target.dataset.b;if(!b||b===S.kind)return;S.kind=b;[...$('kd').children].forEach(c=>c.classList.toggle('on',c.dataset.b===b));
 S.type='mfg';[...$('ty').children].forEach(c=>c.classList.toggle('on',c.dataset.k==='mfg'));
 const r=b!=='mailer'&&b!=='dd';
 S.m=b==='tgable'?[302,152,182]:b==='gable'?[302,152,182]:b==='dd'?[361,261,52]:b==='rsc'?[300,200,200]:b==='gtuck'?[120.6,60.6,161.1]:b==='tuck'?[120,60,160]:[315,202,62];
 cur=b==='rsc'?{c:1,i:2}:(b==='tuck'||b==='gtuck')?{c:0,i:0}:{c:1,i:1};
 const it=MATS[cur.c].items[cur.i];
 S.T=b==='dd'||b==='gable'||b==='tgable'?1.5:(b==='tuck'||b==='gtuck')?.5:it.t;
 TH.yaw=r?-.5:0;TH.zoom=1;TH.panX=0;TH.panY=0;
 $('matName').textContent=it.n;$('dot').style.background=it.col;$('dot').style.border=it.w?'1px solid #ebebeb':'0';setMat3d(it.col);
 // 拱型盒原站只有「製造尺寸 / 內尺寸」，插口端山形盒則支援全部三種
 [...$('ty').children].forEach(c=>{if(c.dataset.k==='out')c.style.display=b==='gable'?'none':''});
 $('s3').parentElement.style.display=b==='gable'?'none':'';
 fill();refit()};

function draw(){
 const [L,W,H]=S.m,T=S.T;
 const g=({
  mailer:buildM,
  rsc:buildR,
  tuck:buildT,
  gtuck:(L,W,H,T)=>buildT(L,W,H,T,1),
  dd:buildD,
  gable:buildG,
  tgable:buildTG
 })[S.kind](L,W,H,T);
 const {P,Hn}=g,B=3;
 const hk=new Set(Hn.map(h=>key(h[0],h[1])));
 const cut=[];
 for(const p of P)for(const q of p.e){if(!q.c1){if(q.a[0]===q.b[0]&&q.a[1]===q.b[1])continue;if(hk.has(key(q.a,q.b)))continue}cut.push(q)}
 const cutD=(()=>{let d='',l=null;for(const q of cut){if(!l||Math.abs(l[0]-q.a[0])>1e-6||Math.abs(l[1]-q.a[1])>1e-6)d+=`M${q.a[0]} ${q.a[1]}`;d+=q.c1?`C${q.c1[0]} ${q.c1[1]} ${q.c2[0]} ${q.c2[1]} ${q.b[0]} ${q.b[1]}`:`L${q.b[0]} ${q.b[1]}`;l=q.b}return d})();
 const xs=P.flatMap(p=>p.pts.map(q=>q[0])),ys=P.flatMap(p=>p.pts.map(q=>q[1]));
 const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
 const m=Math.max(x1-x0,y1-y0)*.07,vx=x0-m,vy=y0-m,vw=x1-x0+2*m,vh=y1-y0+2*m,sw=Math.max(vw,vh)/1000,fs=sw*14;
 const pt=p=>p.map(q=>q[0].toFixed(2)+','+q[1].toFixed(2)).join(' ');
 const slots=[];if($('oSlot').checked)for(const [a,b] of g.SL)for(const x of [0,L-g.SWd])slots.push([x,a,g.SWd,b-a]);
 const notch=S.T<.85&&slots.length>0,fold=notch?Hn.flatMap(h=>{const x=h[0][0];if(x!==h[1][0]||(Math.abs(x)>1e-9&&Math.abs(x-L)>1e-9))return [h];let seg=[[Math.min(h[0][1],h[1][1]),Math.max(h[0][1],h[1][1])]];for(const [a,b] of g.SL)seg=seg.flatMap(([p,q])=>a>=q||b<=p?[[p,q]]:[[p,Math.max(p,a)],[Math.min(q,b),q]].filter(([u,v])=>v-u>1e-9));return seg.map(([p,q])=>[[x,p],[x,q]])}):Hn;
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" font-family="sans-serif">`;
 if($('oBleed').checked){const ps=P.map(p=>`<path d="${pathD(p.e)}"/>`).join(''),bw=sw*1.1;
  s+=`<g id="Bleed"><g fill="#5dbb1a" stroke="#5dbb1a" stroke-width="${2*B+bw}" stroke-linejoin="round">${ps}</g><g style="fill:@CV;stroke:@CV" stroke-width="${2*B-bw}" stroke-linejoin="round">${ps}</g></g>`}
 s+='<g id="Fill">'+P.map(p=>`<path d="${pathD(p.e)}" style="fill:@PF"/>`).join('')+'</g>';
 s+=`<g id="Fold"><path d="${fold.map(h=>`M${h[0][0]} ${h[0][1]}L${h[1][0]} ${h[1][1]}`).join('')}" stroke="#e11" stroke-width="${sw*1.1}" stroke-dasharray="${sw*3} ${sw*1.6}" fill="none"/></g>`;
 s+='<g id="Cut">';
 s+=slots.map(q=>S.T<.85?`<polyline points="${pt(slotPts(q))}" fill="none" stroke="#1c1ccf" stroke-width="${sw*1.3}" stroke-linejoin="round"/>`:`<rect x="${q[0]}" y="${q[1]}" width="${q[2]}" height="${q[3]}" rx="${q[2]/2}" style="fill:@PF" stroke="#333" stroke-width="${sw*1.3}"/>`).join('');
 s+=`<path d="${cutD}" stroke="#1c1ccf" stroke-width="${sw*1.3}" stroke-linejoin="round" fill="none"/></g>`;
 if($('oName').checked){s+='<g id="Labels">';for(const p of P){if(!p.n)continue;const a=p.pts.map(q=>q[0]),b=p.pts.map(q=>q[1]);
  s+=`<text x="${(Math.min(...a)+Math.max(...a))/2}" y="${(Math.min(...b)+Math.max(...b))/2}" font-size="${fs}" text-anchor="middle" fill="#8a91a0">${p.n}</text>`}s+='</g>'}
 if($('oDim').checked){s+='<g id="Dimensions">';const k=kk(),dv=S.m.map((v,i)=>nf((v+offs(S.type,T)[i])/k)+' '+S.unit);
  const hd=(x,y,dx,dy)=>{const a=sw*7,b=sw*3,nx=-dy,ny=dx;return `<polygon points="${x},${y} ${x-dx*a+nx*b},${y-dy*a+ny*b} ${x-dx*a-nx*b},${y-dy*a-ny*b}" fill="#1677ff"/>`};
  const dm=(ax,ay,bx,by,t)=>{const cx=(ax+bx)/2,cy=(ay+by)/2,w=t.length*fs*.6+fs*1.2,n=Math.hypot(bx-ax,by-ay)||1,ux=(bx-ax)/n,uy=(by-ay)/n;
   return `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#1677ff" stroke-width="${sw*1.1}"/>${hd(ax,ay,-ux,-uy)}${hd(bx,by,ux,uy)}<g transform="translate(${cx} ${cy})"><rect x="${-w/2}" y="${-fs*.95}" width="${w}" height="${fs*1.9}" rx="${fs*.3}" style="fill:@CV"/><text y="${fs*.35}" font-size="${fs}" text-anchor="middle" fill="#1677ff">${t}</text></g>`};
  const ddDm=(D,v)=>dm(D.ox,D.oy+D.b*.75,D.ox+D.a,D.oy+D.b*.75,v[0])+dm(D.ox+D.a*.8,D.oy,D.ox+D.a*.8,D.oy+D.b,v[1])+dm(D.ox-D.h,D.oy+D.b*.12,D.ox,D.oy+D.b*.12,v[2]);
  s+=S.kind==='tgable'?dm(0,H*.27,L,H*.27,dv[0])+dm(L,H*.73,L+W,H*.73,dv[1])+dm(L+W+L*.28,0,L+W+L*.28,H,dv[2]):S.kind==='gable'?dm(0,H*.62,L,H*.62,dv[0])+dm(L,H*.37,L+W,H*.37,dv[1])+dm(2*L+W+W*.747,0,2*L+W+W*.747,H,dv[2]):S.kind==='dd'?ddDm(g.D,dv)+(g.D2?ddDm(g.D2,[g.D2.a,g.D2.b,g.D2.h].map((v,i)=>nf((v+offs(S.type,T)[i])/k)+' '+S.unit)):''):S.kind==='rsc'||S.kind==='tuck'||S.kind==='gtuck'?dm(L+W+L*(S.kind==='tuck'||S.kind==='gtuck'?.75:.33),0,L+W+L*(S.kind==='tuck'||S.kind==='gtuck'?.75:.33),H,dv[2])+dm(0,H*.75,L,H*.75,dv[0])+dm(L,H*.25,L+W,H*.25,dv[1]):dm(L/2,-H,L/2,0,dv[2])+dm(L*.75,0,L*.75,W,dv[1])+dm(0,W*.9,L,W*.9,dv[0]);s+='</g>'}
 s+='</svg>';
 G={raw:s,P,cut,fold:fold.map(h=>({a:h[0],b:h[1]})),slots,vx,vy,vw,vh};
 if(!V||!touched)V={x:vx,y:vy,w:vw,h:vh};
 st.innerHTML=s.replace(/@PF/g,'var(--pf)').replace(/@CV/g,'var(--canvas)');setV();
 const k=kk(),f=a=>a.map(v=>S.unit==='in'?nf(v/k):Math.round(v*10)/10).join(' × ')+' '+S.unit;
 $('s1').textContent=f(S.m);$('s2').textContent=f(S.m.map((v,i)=>v+offs('in',T)[i]));$('s3').textContent=f(S.m.map((v,i)=>v+offs('out',T)[i]));
 build3d(P,T);syncLid(true);show()}