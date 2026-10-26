'use strict';
(() => {
const $=id=>document.getElementById(id), canvas=$('canvas'),ctx=canvas.getContext('2d');
const N=24, PI=Math.PI, add=(a,b)=>a.map((v,i)=>v+b[i]), sub=(a,b)=>a.map((v,i)=>v-b[i]), mul=(a,s)=>a.map(v=>v*s), dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0), cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const rot=(v,a,t)=>add(add(mul(v,Math.cos(t)),mul(cross(a,v),Math.sin(t))),mul(a,dot(a,v)*(1-Math.cos(t))));
let angles=[],shown=[],history=[],selected=11,yaw=-.55,pitch=-.4,vx=0,vy=0,auto=false,playing=false,lastFold=0,faces=[],w=0,h=0,dpr=1,sent=false,last=0;
const verts=[[0,0,-.5],[1,0,-.5],[0,1,-.5],[0,0,.5],[1,0,.5],[0,1,.5]], polygons=[[0,2,1],[3,4,5],[0,1,4,3],[0,3,5,2],[1,2,5,4]];
function shape(name){return Array.from({length:23},(_,i)=>name==='wand'?2:name==='wave'?(i%6===5?0:2):name==='coil'?(i%4===3?1:2):(i%8===3?1:i%8===7?3:2));}
function sync(){ $('code').value=angles.map(v=>((Math.round(v/(PI/2))%4)+4)%4).join('');$('jointLabel').value=`${selected+1} / 23`;$('joint').value=selected+1;$('undo').disabled=!history.length;}
function save(){history.push(angles.slice());if(history.length>80)history.shift();}
function twist(dir){save();angles[selected]+=dir*PI/2;sync();$('status').textContent=`Joint ${selected+1} turned ${dir>0?'+':'−'}90°.`;}
function preset(name){angles=shape(name).map(v=>v*PI/2);shown=angles.slice();sync();}
function geometry(){let origin=[0,0,0],x=[1,0,0],y=[0,1,0],z=[0,0,1],blocks=[];
 for(let i=0;i<N;i++){const points=verts.map(v=>add(origin,add(mul(x,v[0]),add(mul(y,v[1]),mul(z,v[2])))));blocks.push(points);
 const joint=add(origin,mul(x,.5));const nx=mul(y,-1),ny=rot(x,nx,shown[i]||0),nz=rot(z,nx,shown[i]||0);origin=sub(joint,mul(ny,.5));x=nx;y=ny;z=nz;}
 const all=blocks.flat(),min=[0,1,2].map(k=>Math.min(...all.map(v=>v[k]))),max=[0,1,2].map(k=>Math.max(...all.map(v=>v[k]))),center=mul(add(min,max),.5);
 return blocks.map(b=>b.map(v=>sub(v,center)));}
function camera(v){const a=rot(v,[0,1,0],yaw);return rot(rot(a,[1,0,0],pitch),[0,0,1],1.1);}
function draw(){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const bg=ctx.createRadialGradient(w*.45,h*.44,0,w*.5,h*.5,Math.max(w,h)*.75);bg.addColorStop(0,'#294852');bg.addColorStop(.6,'#172e3a');bg.addColorStop(1,'#0c1823');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 const blocks=geometry().map(b=>b.map(camera)),all=blocks.flat();let extentX=Math.max(...all.map(v=>Math.abs(v[0]))),extentY=Math.max(...all.map(v=>Math.abs(v[1])));const scale=Math.min(w*.39/(extentX+.6),h*.35/(extentY+.6),Math.min(w,h)*.105);
 const project=v=>[w*.5+v[0]*scale,h*.48-v[1]*scale,v[2]];
 ctx.save();ctx.translate(w*.5,h*.48+(extentY+.75)*scale);ctx.scale(1,.22);const shadow=ctx.createRadialGradient(0,0,0,0,0,w*.4);shadow.addColorStop(0,'#030d18aa');shadow.addColorStop(1,'#030d1800');ctx.fillStyle=shadow;ctx.beginPath();ctx.arc(0,0,w*.4,0,PI*2);ctx.fill();ctx.restore();
 // Quiet drafting grid gives the object a spatial setting without adding interface chrome.
 ctx.strokeStyle='#a2d0c00b';ctx.lineWidth=1;const gap=32;for(let gx=w%gap;gx<w;gx+=gap){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,h);ctx.stroke();}for(let gy=h%gap;gy<h;gy+=gap){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(w,gy);ctx.stroke();}
 faces=[];blocks.forEach((b,i)=>polygons.forEach((poly,j)=>{const ps=poly.map(k=>b[k]),n=cross(sub(ps[1],ps[0]),sub(ps[2],ps[0]));if(n[2]<=.001)return;faces.push({i,j,points:ps.map(project),depth:ps.reduce((s,p)=>s+p[2],0)/ps.length,n});}));faces.sort((a,b)=>a.depth-b.depth);
 for(const f of faces){const pts=f.points;ctx.beginPath();pts.forEach((p,k)=>k?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();const light=.7+.25*dot(f.n,[-.3,.5,.8])/Math.hypot(...f.n);const color=f.i%2?[240,185,104]:[104,204,188];ctx.fillStyle=`rgb(${color.map(c=>Math.round(c*light)).join(',')})`;ctx.fill();ctx.strokeStyle='#112e35';ctx.lineWidth=1.2;ctx.lineJoin='round';ctx.stroke();
 // Inset lines keep the construction legible at phone scale.
 const cx=pts.reduce((s,p)=>s+p[0],0)/pts.length,cy=pts.reduce((s,p)=>s+p[1],0)/pts.length;ctx.beginPath();pts.forEach((p,k)=>{let x=cx+(p[0]-cx)*.87,y=cy+(p[1]-cy)*.87;k?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.strokeStyle='#ffffff22';ctx.lineWidth=.7;ctx.stroke();
 if(f.i===selected&&!$('panel').hidden){ctx.strokeStyle='#fff4ce';ctx.lineWidth=2;ctx.stroke();}}
}
function resize(){const r=canvas.getBoundingClientRect();w=r.width;h=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);draw();}
function frame(t){const dt=Math.min((t-last)/16.67||1,3);last=t;shown=shown.map((v,i)=>v+(angles[i]-v)*Math.min(1,.18*dt));if(auto)yaw+=.003*dt;else{yaw+=vx*dt;pitch=Math.max(-1.35,Math.min(1.35,pitch+vy*dt));vx*=Math.pow(.92,dt);vy*=Math.pow(.92,dt);}if(playing&&t-lastFold>1100){lastFold=t;selected=(selected+1)%23;twist(1);}draw();if(!sent&&window.__gbSandbox){window.__gbSandbox.ready();sent=true;}requestAnimationFrame(frame);}
function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
let drag=null;canvas.addEventListener('pointerdown',e=>{if(drag)return;canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};vx=vy=0;});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>5)drag.moved=true;if(drag.moved){vx=dx*.006;vy=dy*.006;yaw+=vx;pitch=Math.max(-1.35,Math.min(1.35,pitch+vy));}drag.x=e.clientX;drag.y=e.clientY;});
canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;if(!drag.moved){const r=canvas.getBoundingClientRect(),hit=[...faces].reverse().find(f=>inside([e.clientX-r.left,e.clientY-r.top],f.points));if(hit){selected=Math.min(hit.i,22);twist(1);}}drag=null;});canvas.addEventListener('pointercancel',()=>{drag=null;vx=vy=0;});
$('toggle').onclick=()=>{const open=$('panel').hidden;$('panel').hidden=!open;$('toggle').setAttribute('aria-expanded',String(open));$('toggle').setAttribute('aria-label',open?'Close controls':'Open controls');$('toggle').textContent=open?'×':'☰';resize();};
for(const el of [$('panel'),$('toggle')])for(const type of ['pointerdown','pointermove','pointerup','touchstart'])el.addEventListener(type,e=>e.stopPropagation());
$('joint').oninput=e=>{selected=+e.target.value-1;sync();};$('twist').onclick=()=>twist(1);$('reverse').onclick=()=>twist(-1);
$('undo').onclick=()=>{if(history.length){angles=history.pop();sync();$('status').textContent='Last fold undone.';}};
$('preset').onchange=e=>{save();preset(e.target.value);$('status').textContent=`${e.target.selectedOptions[0].text} loaded.`;};
$('spin').onclick=()=>{auto=!auto;$('spin').textContent=auto?'Stop orbit':'Auto orbit';};$('play').onclick=()=>{playing=!playing;lastFold=performance.now();$('play').textContent=playing?'Stop folds':'Play folds';};
$('reset').onclick=()=>{yaw=-.55;pitch=-.4;vx=vy=0;};$('load').onclick=()=>{const code=$('code').value.trim();if(!/^[0-3]{23}$/.test(code)){$('status').textContent='Use exactly 23 digits, each from 0 to 3.';return;}save();angles=[...code].map(v=>+v*PI/2);sync();$('status').textContent='Your shape is loaded.';};
preset('ribbon');new ResizeObserver(resize).observe($('stage'));resize();requestAnimationFrame(frame);
})();
