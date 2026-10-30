const CL=require(require('path').join(__dirname, '..', 'src', 'core.js'));
let tot=[0,0], wins=[0,0,0];
for(let seed=1;seed<=20;seed++){
  const w=new CL.World(); CL.genMap(w,'push');
  const M=new CL.Match({fmt:'2v2',mode:'push',seed,world:w,slots:Array.from({length:4},()=>({human:false,cls:'medium',wpn:'ar'}))});
  let t=0; while(!M.over && t<240){ M.tick(1/30); t+=1/30; }
  M.slots.forEach(s=>tot[s.team]+=s.k); wins[M.pp<-0.05?0:M.pp>0.05?1:2]++;
}
console.log('kills by team',tot,'pushed-ahead wins t0/t1/even',wins);
