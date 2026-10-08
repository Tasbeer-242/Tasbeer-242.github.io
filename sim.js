(function(){
const c=document.getElementById('sim'),ctx=c.getContext('2d');
const S=720;c.width=S;c.height=S;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const el={w:document.getElementById('t-w'),e:document.getElementById('t-e'),m:document.getElementById('t-m')};
const qm=(a,b)=>[a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];
const qn=q=>{const n=Math.hypot(...q);return q.map(x=>x/n)};
const rot=(q,v)=>{const [w,x,y,z]=q;const t=[2*(y*v[2]-z*v[1]),2*(z*v[0]-x*v[2]),2*(x*v[1]-y*v[0])];return[v[0]+w*t[0]+(y*t[2]-z*t[1]),v[1]+w*t[1]+(z*t[0]-x*t[2]),v[2]+w*t[2]+(x*t[1]-y*t[0])]};
let q,w,mode;
function reset(){q=qn([Math.random()-.5,Math.random()-.5,Math.random()-.5,Math.random()-.5]);const d=[Math.random()-.5,Math.random()-.5,Math.random()-.5];const n=Math.hypot(...d)||1;w=d.map(x=>x/n*0.9);mode='Detumble';}
reset();
// 3U body: 1 x 1 x 3 units, long axis = z
const hx=.5,hy=.5,hz=1.5;
const V=[];for(const x of[-1,1])for(const y of[-1,1])for(const z of[-1,1])V.push([x*hx,y*hy,z*hz]);
// faces: vertex idx (by x,y,z sign order), normal, kind
const idx=(x,y,z)=>((x>0)<<2)|((y>0)<<1)|(z>0);
const F=[
{n:[1,0,0],v:[idx(1,-1,-1),idx(1,1,-1),idx(1,1,1),idx(1,-1,1)],k:'cell'},
{n:[-1,0,0],v:[idx(-1,-1,-1),idx(-1,-1,1),idx(-1,1,1),idx(-1,1,-1)],k:'cell'},
{n:[0,1,0],v:[idx(-1,1,-1),idx(-1,1,1),idx(1,1,1),idx(1,1,-1)],k:'cell'},
{n:[0,-1,0],v:[idx(-1,-1,-1),idx(1,-1,-1),idx(1,-1,1),idx(-1,-1,1)],k:'cell'},
{n:[0,0,1],v:[idx(-1,-1,1),idx(1,-1,1),idx(1,1,1),idx(-1,1,1)],k:'end'},
{n:[0,0,-1],v:[idx(-1,-1,-1),idx(-1,1,-1),idx(1,1,-1),idx(1,-1,-1)],k:'end'}];
const light=[.4,.7,.6];const L=Math.hypot(...light);
// fixed camera tilt
const cam=qn([0.93,-0.3,0.2,0.0]);
const Rv=qm([Math.cos(.26),0,Math.sin(.26),0],[Math.cos(-.57),Math.sin(-.57),0,0]);
const target=qn(qm([cam[0],-cam[1],-cam[2],-cam[3]],Rv)); // pointing attitude chosen for a 3/4 view
function proj(p){const r=rot(cam,p);const s=128/(1+r[2]*0.04);return[S/2+r[0]*s,S/2-r[1]*s,r[2]]}
function mix(a,b,t){return a.map((x,i)=>Math.round(x+(b[i]-x)*t))}
function draw(){
ctx.clearRect(0,0,S,S);
// reference grid ring (orbit plane)
ctx.strokeStyle='#c9d1db';ctx.lineWidth=1.5;ctx.beginPath();
for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;const p=proj([Math.cos(a)*2.7,Math.sin(a)*2.7,-.0]);i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])}ctx.stroke();
const faces=F.map(f=>{const n=rot(q,f.n);const pts=f.v.map(i=>proj(rot(q,V[i])));const cn=rot(cam,n);return{f,n,cn,pts,d:pts.reduce((a,p)=>a+p[2],0)/4}});
faces.sort((a,b)=>b.d-a.d);
for(const o of faces){
 if(o.cn[2]>0.0)continue; // back-face cull (camera looks along +z after rot; visible normals face -z)
 const sh=Math.max(0,(o.n[0]*light[0]+o.n[1]*light[1]+o.n[2]*light[2])/L);
 const base=o.f.k==='cell'?[31,63,115]:[182,122,18];
 const col=mix(base.map(x=>x*.55),base.map(x=>Math.min(255,x*1.25)),sh);
 ctx.beginPath();o.pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();
 ctx.fillStyle=`rgb(${col})`;ctx.fill();ctx.strokeStyle='#14233a';ctx.lineWidth=2;ctx.stroke();
 if(o.f.k==='cell'){ // solar cell grid
  const [a,b,cc,d]=o.pts;ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=1;
  for(let i=1;i<3;i++){const t=i/3;ctx.beginPath();ctx.moveTo(a[0]+(d[0]-a[0])*t,a[1]+(d[1]-a[1])*t);ctx.lineTo(b[0]+(cc[0]-b[0])*t,b[1]+(cc[1]-b[1])*t);ctx.stroke();}
  ctx.beginPath();ctx.moveTo((a[0]+b[0])/2,(a[1]+b[1])/2);ctx.lineTo((d[0]+cc[0])/2,(d[1]+cc[1])/2);ctx.stroke();
 }
}
// body axes
const o0=proj(rot(q,[0,0,0]));const ax=[[1.9,0,0,'#c0392b'],[0,1.9,0,'#2e8b57'],[0,0,2.7,'#14233a']];
ctx.lineWidth=3;for(const a of ax){const p=proj(rot(q,[a[0],a[1],a[2]]));ctx.strokeStyle=a[3];ctx.beginPath();ctx.moveTo(o0[0],o0[1]);ctx.lineTo(p[0],p[1]);ctx.stroke()}
}
function errDeg(){const ti=[target[0],-target[1],-target[2],-target[3]];const r=qm(ti,q);return 2*Math.acos(Math.min(1,Math.abs(r[0])))*180/Math.PI}
function step(dt){
 const wm=Math.hypot(...w)*180/Math.PI;
 if(mode==='Detumble'){const k=0.55;w=w.map(x=>x*Math.exp(-k*dt));if(wm<1.2)mode='Pointing';}
 else{ // PD toward target
  const ti=[target[0],-target[1],-target[2],-target[3]];let r=qm(ti,q);if(r[0]<0)r=r.map(x=>-x);
  // error quaternion r (body vs target); torque opposes vector part and rate
  const Kp=2.2,Kd=2.6;w=[0,1,2].map(i=>w[i]+(-Kp*r[i+1]-Kd*w[i])*dt);
 }
 const dq=qm(q,[0,w[0]*.5*dt,w[1]*.5*dt,w[2]*.5*dt]);q=qn([q[0]+dq[0],q[1]+dq[1],q[2]+dq[2],q[3]+dq[3]]);
}
function readout(){el.w.textContent=(Math.hypot(...w)*180/Math.PI).toFixed(1)+' °/s';el.e.textContent=errDeg().toFixed(1)+'°';el.m.textContent=mode}
if(reduce){q=target.slice();w=[0,0,0];mode='Pointing';draw();readout();document.getElementById('re').hidden=true;return}
let last=performance.now();
function frame(t){const dt=Math.min(.05,(t-last)/1000);last=t;step(dt);draw();readout();requestAnimationFrame(frame)}
requestAnimationFrame(frame);
document.getElementById('re').addEventListener('click',reset);
})();
