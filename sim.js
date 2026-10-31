(function(){
const S=720;let ctx;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=id=>document.getElementById(id);
const D2R=Math.PI/180,R2D=180/Math.PI;
// quaternion helpers [w,x,y,z]
const qm=(a,b)=>[a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];
const qn=q=>{const n=Math.hypot(...q);return q.map(x=>x/n)};
const qc=q=>[q[0],-q[1],-q[2],-q[3]];
const rot=(q,v)=>{const [w,x,y,z]=q;const t=[2*(y*v[2]-z*v[1]),2*(z*v[0]-x*v[2]),2*(x*v[1]-y*v[0])];return[v[0]+w*t[0]+(y*t[2]-z*t[1]),v[1]+w*t[1]+(z*t[0]-x*t[2]),v[2]+w*t[2]+(x*t[1]-y*t[0])]};
const integ=(q,w,dt)=>{const dq=qm(q,[0,w[0]*.5*dt,w[1]*.5*dt,w[2]*.5*dt]);return qn([q[0]+dq[0],q[1]+dq[1],q[2]+dq[2],q[3]+dq[3]])};
const axAng=(a,ang)=>{const n=Math.hypot(...a)||1,s=Math.sin(ang/2);return[Math.cos(ang/2),a[0]/n*s,a[1]/n*s,a[2]/n*s]};
const rnd3=()=>{const d=[Math.random()-.5,Math.random()-.5,Math.random()-.5];const n=Math.hypot(...d)||1;return d.map(x=>x/n)};
const mix=(a,b,t)=>a.map((x,i)=>Math.round(x+(b[i]-x)*t));
const poly=(pts)=>{ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath()};

/* ---------------- Satellite: detumble then point ---------------- */
const sat=(function(){
 let q,w,mode,tt;
 const hx=.5,hy=.5,hz=1.5;
 const V=[];for(const x of[-1,1])for(const y of[-1,1])for(const z of[-1,1])V.push([x*hx,y*hy,z*hz]);
 const idx=(x,y,z)=>((x>0)<<2)|((y>0)<<1)|(z>0);
 const F=[
 {n:[1,0,0],v:[idx(1,-1,-1),idx(1,1,-1),idx(1,1,1),idx(1,-1,1)],k:'cell'},
 {n:[-1,0,0],v:[idx(-1,-1,-1),idx(-1,-1,1),idx(-1,1,1),idx(-1,1,-1)],k:'cell'},
 {n:[0,1,0],v:[idx(-1,1,-1),idx(-1,1,1),idx(1,1,1),idx(1,1,-1)],k:'cell'},
 {n:[0,-1,0],v:[idx(-1,-1,-1),idx(1,-1,-1),idx(1,-1,1),idx(-1,-1,1)],k:'cell'},
 {n:[0,0,1],v:[idx(-1,-1,1),idx(1,-1,1),idx(1,1,1),idx(-1,1,1)],k:'end'},
 {n:[0,0,-1],v:[idx(-1,-1,-1),idx(-1,1,-1),idx(1,1,-1),idx(1,-1,-1)],k:'end'}];
 const light=[.4,.7,.6];const L=Math.hypot(...light);
 const cam=qn([0.93,-0.3,0.2,0.0]);
 const Rv=qm([Math.cos(.26),0,Math.sin(.26),0],[Math.cos(-.57),Math.sin(-.57),0,0]);
 const target=qn(qm(qc(cam),Rv));
 function proj(p){const r=rot(cam,p);const s=128/(1+r[2]*0.04);return[S/2+r[0]*s,S/2-r[1]*s,r[2]]}
 function reset(){q=qn([Math.random()-.5,Math.random()-.5,Math.random()-.5,Math.random()-.5]);w=rnd3().map(x=>x*0.9);mode='Tumbling';tt=0}
 function settle(){q=target.slice();w=[0,0,0];mode='Pointing'}
 function err(){const r=qm(qc(target),q);return 2*Math.acos(Math.min(1,Math.abs(r[0])))*R2D}
 function step(dt){
  const wm=Math.hypot(...w)*R2D;
  if(mode==='Tumbling'){tt+=dt;if(tt>2.5)mode='Detumbling'}
  else if(mode==='Detumbling'){w=w.map(x=>x*Math.exp(-0.55*dt));if(wm<1.2)mode='Pointing'}
  else{let r=qm(qc(target),q);if(r[0]<0)r=r.map(x=>-x);const Kp=2.2,Kd=2.6;w=[0,1,2].map(i=>w[i]+(-Kp*r[i+1]-Kd*w[i])*dt)}
  q=integ(q,w,dt);
 }
 function draw(){
  ctx.strokeStyle='#c9d1db';ctx.lineWidth=1.5;ctx.beginPath();
  for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;const p=proj([Math.cos(a)*2.7,Math.sin(a)*2.7,0]);i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])}ctx.stroke();
  const faces=F.map(f=>{const n=rot(q,f.n);const pts=f.v.map(i=>proj(rot(q,V[i])));const cn=rot(cam,n);return{f,n,cn,pts,d:pts.reduce((a,p)=>a+p[2],0)/4}});
  faces.sort((a,b)=>b.d-a.d);
  for(const o of faces){
   if(o.cn[2]>0)continue;
   const sh=Math.max(0,(o.n[0]*light[0]+o.n[1]*light[1]+o.n[2]*light[2])/L);
   const base=o.f.k==='cell'?[31,63,115]:[182,122,18];
   const col=mix(base.map(x=>x*.55),base.map(x=>Math.min(255,x*1.25)),sh);
   poly(o.pts);ctx.fillStyle=`rgb(${col})`;ctx.fill();ctx.strokeStyle='#14233a';ctx.lineWidth=2;ctx.stroke();
   if(o.f.k==='cell'){const [a,b,cc,d]=o.pts;ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=1;
    for(let i=1;i<3;i++){const t=i/3;ctx.beginPath();ctx.moveTo(a[0]+(d[0]-a[0])*t,a[1]+(d[1]-a[1])*t);ctx.lineTo(b[0]+(cc[0]-b[0])*t,b[1]+(cc[1]-b[1])*t);ctx.stroke()}
    ctx.beginPath();ctx.moveTo((a[0]+b[0])/2,(a[1]+b[1])/2);ctx.lineTo((d[0]+cc[0])/2,(d[1]+cc[1])/2);ctx.stroke()}
  }
  const o0=proj(rot(q,[0,0,0]));const ax=[[1.9,0,0,'#c0392b'],[0,1.9,0,'#2e8b57'],[0,0,2.7,'#14233a']];
  ctx.lineWidth=3;for(const a of ax){const p=proj(rot(q,[a[0],a[1],a[2]]));ctx.strokeStyle=a[3];ctx.beginPath();ctx.moveTo(o0[0],o0[1]);ctx.lineTo(p[0],p[1]);ctx.stroke()}
 }
 function read(){return[(Math.hypot(...w)*R2D).toFixed(1)+' °/s',err().toFixed(1)+'°',mode]}
 return{labels:['Spin rate','Pointing error','Mode'],note:'Simplified detumble and pointing demo, not flight data.',btn:'Spin it again',
  aria:'A 3U CubeSat tumbling, then settling into a fixed pointing attitude as a simulated controller removes its spin.',reset,settle,step,draw,read};
})();

/* ---------------- Shared drone renderer (world z up) ---------------- */
const VIEW={yaw:-35*D2R,pitch:46*D2R};
function view(p,sc,cy){
 const cy_=Math.cos(VIEW.yaw),sy=Math.sin(VIEW.yaw),cp=Math.cos(VIEW.pitch),sp=Math.sin(VIEW.pitch);
 const x1=p[0]*cy_-p[1]*sy,y1=p[0]*sy+p[1]*cy_,z1=p[2];
 const up=y1*sp+z1*cp,depth=y1*cp-z1*sp;
 const k=sc/(1+depth*0.03);
 return[S/2+x1*k,cy-up*k,depth];
}
function ground(sc,cy,z,ext,step){
 ctx.strokeStyle='rgba(201,209,219,.75)';ctx.lineWidth=1;
 for(let v=-ext;v<=ext+1e-6;v+=step){
  let a=view([v,-ext,z],sc,cy),b=view([v,ext,z],sc,cy);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
  a=view([-ext,v,z],sc,cy);b=view([ext,v,z],sc,cy);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
 }
}
// draws a quadcopter at world position pos with attitude q (body->world), size s (arm length)
function drawDrone(pos,q,s,sc,cy,spin,gz){
 const W=v=>{const r=rot(q,v.map(x=>x*s));return[r[0]+pos[0],r[1]+pos[1],r[2]+pos[2]]};
 const P=v=>view(W(v),sc,cy);
 // shadow on ground
 if(gz!==undefined){const sh=[];for(let i=0;i<20;i++){const a=i/20*Math.PI*2;sh.push(view([pos[0]+Math.cos(a)*s*1.15,pos[1]+Math.sin(a)*s*1.15,gz],sc,cy))}
  poly(sh);ctx.fillStyle='rgba(20,35,58,.10)';ctx.fill()}
 const items=[];
 const rotors=[[1,1],[1,-1],[-1,1],[-1,-1]].map(([a,b])=>[a*.72,b*.72,0]);
 rotors.forEach((r,i)=>{
  const front=r[0]>0;
  const ctr=P([r[0],r[1],.08]);
  items.push({d:ctr[2],f:()=>{
   // arm
   const a0=P([0,0,0]),a1=P(r);ctx.strokeStyle='#14233a';ctx.lineWidth=Math.max(2,s*sc*.07);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a0[0],a0[1]);ctx.lineTo(a1[0],a1[1]);ctx.stroke();
   // motor
   const m=P([r[0],r[1],.05]);ctx.fillStyle='#14233a';ctx.beginPath();ctx.arc(m[0],m[1],Math.max(2,s*sc*.05),0,7);ctx.fill();
   // rotor disc
   const disc=[];for(let k=0;k<24;k++){const a=k/24*Math.PI*2;disc.push(P([r[0]+Math.cos(a)*.34,r[1]+Math.sin(a)*.34,.1]))}
   poly(disc);ctx.fillStyle=front?'rgba(182,122,18,.22)':'rgba(31,63,115,.16)';ctx.fill();ctx.strokeStyle=front?'#b67a12':'#1f3f73';ctx.lineWidth=Math.max(1,s*sc*.018);ctx.stroke();
   // blades
   const ph=spin*(i%2?1:-1);ctx.strokeStyle=front?'#8a5a08':'#1f3f73';ctx.lineWidth=Math.max(1.5,s*sc*.03);
   const b1=P([r[0]+Math.cos(ph)*.32,r[1]+Math.sin(ph)*.32,.1]),b2=P([r[0]-Math.cos(ph)*.32,r[1]-Math.sin(ph)*.32,.1]);
   ctx.beginPath();ctx.moveTo(b1[0],b1[1]);ctx.lineTo(b2[0],b2[1]);ctx.stroke();
  }});
 });
 // body box
 const bx=.26,by=.2,bz=.09;
 const bv=[];for(const x of[-1,1])for(const y of[-1,1])for(const z of[-1,1])bv.push([x*bx,y*by,z*bz]);
 const id=(x,y,z)=>((x>0)<<2)|((y>0)<<1)|(z>0);
 const bf=[{n:[0,0,1],v:[id(-1,-1,1),id(1,-1,1),id(1,1,1),id(-1,1,1)],c:[31,63,115]},{n:[0,0,-1],v:[id(-1,-1,-1),id(-1,1,-1),id(1,1,-1),id(1,-1,-1)],c:[20,35,58]},
  {n:[1,0,0],v:[id(1,-1,-1),id(1,1,-1),id(1,1,1),id(1,-1,1)],c:[182,122,18]},{n:[-1,0,0],v:[id(-1,-1,-1),id(-1,-1,1),id(-1,1,1),id(-1,1,-1)],c:[31,63,115]},
  {n:[0,1,0],v:[id(-1,1,-1),id(-1,1,1),id(1,1,1),id(1,1,-1)],c:[31,63,115]},{n:[0,-1,0],v:[id(-1,-1,-1),id(1,-1,-1),id(1,-1,1),id(-1,-1,1)],c:[31,63,115]}];
 const ctrD=P([0,0,0])[2];
 items.push({d:ctrD,f:()=>{
  const fs=bf.map(f=>{const pts=f.v.map(i=>P(bv[i]));const nW=rot(q,f.n);const o=W([0,0,0]);const nTip=view([o[0]+nW[0],o[1]+nW[1],o[2]+nW[2]],sc,cy),c0=view(o,sc,cy);return{f,pts,nW,vis:nTip[2]<c0[2],d:pts.reduce((a,p)=>a+p[2],0)/4}});
  fs.filter(o=>o.vis).sort((a,b)=>b.d-a.d).forEach(o=>{const sh=Math.max(0,.35+.65*(o.nW[2]*.7+o.nW[0]*.3));
   poly(o.pts);ctx.fillStyle=`rgb(${mix(o.f.c.map(x=>x*.6),o.f.c.map(x=>Math.min(255,x*1.3)),sh)})`;ctx.fill();ctx.strokeStyle='#14233a';ctx.lineWidth=1.5;ctx.stroke()});
 }});
 items.sort((a,b)=>b.d-a.d).forEach(o=>o.f());
}

/* ---------------- Formation: three drones holding a triangle ---------------- */
const form=(function(){
 const sc=118,cy=S*0.5,gz=-.4,R=.8,A=1.65;
 let t,ds,mode,gustT;
 function centre(tt){const u=tt*.32;return{p:[A*Math.sin(u),A*.62*Math.sin(2*u),0],v:[A*.32*Math.cos(u),A*.62*.64*Math.cos(2*u),0]}}
 function slots(tt){const c=centre(tt);const h=Math.atan2(c.v[1],c.v[0]);
  return[0,1,2].map(i=>{const a=h+i*2*Math.PI/3;return{p:[c.p[0]+R*Math.cos(a),c.p[1]+R*Math.sin(a),0],h}})}
 function init(){t=0;mode='Holding';gustT=0;ds=slots(0).map(s=>({p:s.p.slice(),v:[0,0,0],a:[0,0,0],h:s.h}))}
 function reset(){if(!ds)init();const i=Math.floor(Math.random()*3),d=rnd3();ds[i].v=[d[0]*3.2,d[1]*3.2,0];mode='Recovering';gustT=0}
 function settle(){init()}
 function step(dt){
  t+=dt;const sl=slots(t),sl2=slots(t+dt);
  ds.forEach((d,i)=>{const sv=[0,1,2].map(k=>(sl2[i].p[k]-sl[i].p[k])/dt);
   const a=[0,1].map(k=>6*(sl[i].p[k]-d.p[k])+4.2*(sv[k]-d.v[k]));d.a=[a[0],a[1],0];
   d.v[0]+=a[0]*dt;d.v[1]+=a[1]*dt;d.p[0]+=d.v[0]*dt;d.p[1]+=d.v[1]*dt;d.h=sl[i].h;});
  if(mode==='Recovering'){gustT+=dt;if(err()<1&&gustT>.6)mode='Holding'}
 }
 function err(){let e=0;const L=R*Math.sqrt(3);for(let i=0;i<3;i++){const a=ds[i].p,b=ds[(i+1)%3].p;e+=Math.abs(Math.hypot(a[0]-b[0],a[1]-b[1])-L)/L}return e/3*100}
 function draw(){
  ground(sc,cy,gz,2.5,.5);
  // path
  ctx.strokeStyle='rgba(182,122,18,.45)';ctx.lineWidth=1.5;ctx.setLineDash([6,6]);ctx.beginPath();
  for(let i=0;i<=120;i++){const c=centre(i/120*2*Math.PI/.32).p;const p=view([c[0],c[1],gz],sc,cy);i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])}ctx.stroke();ctx.setLineDash([]);
  // slots
  slots(t).forEach(s=>{const p=view(s.p,sc,cy);ctx.strokeStyle='rgba(20,35,58,.35)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p[0],p[1],9,0,7);ctx.stroke()});
  // formation edges
  const P=ds.map(d=>view(d.p,sc,cy));ctx.strokeStyle='#b67a12';ctx.lineWidth=2;ctx.setLineDash([8,6]);poly(P);ctx.stroke();ctx.setLineDash([]);
  // drones, far first
  ds.map((d,i)=>({d,i,z:P[i][2]})).sort((a,b)=>b.z-a.z).forEach(({d})=>{
   const yaw=axAng([0,0,1],d.h);const am=Math.hypot(d.a[0],d.a[1]);
   const tq=am>1e-3?axAng([-d.a[1],d.a[0],0],Math.min(.45,am*.05)):[1,0,0,0];
   drawDrone(d.p,qm(tq,yaw),.48,sc,cy,t*26,gz);
  });
 }
 function read(){return[err().toFixed(1)+' %','Triangle',mode]}
 init();
 return{pitch:46*D2R,labels:['Spacing error','Formation','Mode'],note:'Simplified formation-keeping demo, not flight data.',btn:'Push a drone',
  aria:'Three quadcopters flying a figure-eight path while holding an equilateral triangle formation; a pushed drone returns to its slot.',reset,settle,step,draw,read};
})();

/* ---------------- Two canvases side by side ---------------- */
const panes=[['sat',sat],['form',form]].map(([k,sc])=>{const cv=$('sim-'+k);cv.width=S;cv.height=S;
 return{sc,ctx:cv.getContext('2d'),t:[$(k+'-w'),$(k+'-e'),$(k+'-m')],btn:$(k+'-re')}});
function show(p){ctx=p.ctx;ctx.clearRect(0,0,S,S);p.sc.draw();const r=p.sc.read();p.t.forEach((e,i)=>e.textContent=r[i])}
panes.forEach(p=>{if(reduce)p.sc.settle();else if(p.sc===sat)p.sc.reset();show(p)});
if(reduce){panes.forEach(p=>p.btn.hidden=true);return}
panes.forEach(p=>p.btn.addEventListener('click',()=>p.sc.reset()));
// only animate panes that are on screen
const vis=new Map(panes.map(p=>[p.ctx.canvas,true]));
if('IntersectionObserver'in window){const io=new IntersectionObserver(es=>es.forEach(e=>vis.set(e.target,e.isIntersecting)));panes.forEach(p=>io.observe(p.ctx.canvas))}
let last=performance.now();
function frame(t){const dt=Math.min(.05,(t-last)/1000);last=t;
 panes.forEach(p=>{if(!vis.get(p.ctx.canvas))return;for(let i=0;i<4;i++)p.sc.step(dt/4);show(p)});
 requestAnimationFrame(frame)}
requestAnimationFrame(frame);
})();
