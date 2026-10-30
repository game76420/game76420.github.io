// ===== 方形運輸箱（RSC 標準開槽箱）：4 面板 + 糊邊 + 上下各 4 片蓋；L 面為大蓋、W 面為小蓋 =====
function buildR(L,W,H,T){
 const s=T,fh=W/2+T/2,gw=Math.min(47,.6*W),gc=Math.min(.28*gw,.2*H),X=[0,L,L+W,2*L+W,2*L+2*W],P=[],Hn=[],N=['L面','W面','L面','W面'],WN=[[0,0],[0,.3],[.05,.4],[.1,.5]];
 const one=(n,l,id,par,hg,w,sh)=>P.push({n,...shape(l),id,par,hg,w,sh});
 for(let i=0;i<4;i++){const a=X[i],b=X[i+1],f0=a+s,f1=b-s,maj=i%2===0,wt=maj?[.86,1]:[.78,.92],wb=maj?[.62,.8]:[.5,.66];
  one(N[i],[[a,0],[f0,0],[f1,0],[b,0],[b,H],[f1,H],[f0,H],[a,H]],'p'+i,i?'p'+(i-1):null,i?[[a,0],[a,H]]:null,WN[i]);
  one(maj?'大蓋':'小蓋',[[f0,0],[f1,0],[f1,-fh],[f0,-fh]],'t'+i,'p'+i,[[f0,0],[f1,0]],wt,maj?T:0);
  one(maj?'大蓋':'小蓋',[[f0,H],[f1,H],[f1,H+fh],[f0,H+fh]],'b'+i,'p'+i,[[f0,H],[f1,H]],wb,maj?-T:0);
  Hn.push([[f0,0],[f1,0]],[[f0,H],[f1,H]]);if(i)Hn.push([[a,0],[a,H]])}
 one('糊邊',[[0,0],[-gw,gc],[-gw,H-gc],[0,H]],'gl','p0',[[0,0],[0,H]],[.3,.45]);
 Hn.push([[0,0],[0,H]]);
 return {P,Hn,SL:[],SWd:0,yT:0}}
