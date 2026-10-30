const CL=require(require('path').join(__dirname, '..', 'src', 'core.js'));
for (const fmt of ['2v2','1v1']) for (const seed of [1,7,42]) {
  const w=new CL.World(); CL.genMap(w,'push');
  const M=new CL.Match({fmt,mode:'push',seed,world:w,slots:Array.from({length:CL.slotCount(fmt)},()=>({human:false}))});
  let t=0, states={}; const dt=1/30;
  while(!M.over && t<450){ M.tick(dt); t+=dt; states[M.pst]=(states[M.pst]||0)+dt; }
  console.log(fmt,'seed',seed,'t',t.toFixed(0),'winner',M.winner,'pp',M.pp.toFixed(2),'sc',M.sc.join('/'),'kills',M.slots.reduce((a,s)=>a+s.k,0),
    'states',Object.entries(states).map(([k,v])=>k+':'+v.toFixed(0)).join(' '),'fx',M.fx.map(f=>f[1]).join(','),'snap',JSON.stringify(M.snap()).length);
}
