const CL=require(require('path').join(__dirname, '..', 'src', 'core.js'));
const w=new CL.World(); CL.genMap(w);
let solid=0; for(let i=0;i<CL.N;i++) if(w.c[i]) solid++;
console.log('solid cells',solid);
for (const fmt of ['1v1v1','1v1v1v1','2v2']) {
  const n=CL.slotCount(fmt);
  const w2=new CL.World(); CL.genMap(w2);
  const M=new CL.Match({fmt,seed:1234,world:w2,slots:Array.from({length:n},()=>({human:false}))});
  let t=0, phases={}, lastPh='', kills=0;
  const dt=1/30;
  while(!M.over && t<520){ M.tick(dt); t+=dt; if(M.ph!==lastPh){phases[M.ph]=(phases[M.ph]||0)+1; lastPh=M.ph;} }
  kills=M.slots.reduce((a,s)=>a+s.k,0);
  const snap=JSON.stringify(M.snap());
  console.log(fmt,'t',t.toFixed(0),'over',M.over,'winner',M.winner,'scores',M.sc.join('/'),'phases',JSON.stringify(phases),'kills',kills,'ops',M.ops.length,'snapLen',snap.length);
  console.log('  slots', M.slots.map(s=>`${s.name}:${s.cls}/${s.wpn} k${s.k} d${s.d} @${s.x.toFixed(1)},${s.y.toFixed(1)},${s.z.toFixed(1)}`).join(' | '));
}
