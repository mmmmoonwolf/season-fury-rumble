const CL=require(require('path').join(__dirname, '..', 'src', 'core.js'));
for (const mode of ['cash','push']) {
  const w=new CL.World(); CL.genMap(w,mode); const nav=new CL.Nav(w);
  const pts=[...CL.MAP.vaults.map(p=>['vault',p]), ...(mode==='cash'?CL.MAP.stations.map(p=>['station',p]):[]), ...CL.MAP.spawns.map(p=>['spawn',p]), ...CL.MAP.pspawns.flat().map(p=>['pspawn',p])];
  const f=nav.field(Math.floor(CL.CX), Math.floor(CL.CZ)+ (mode==='push'?0:-12));
  const bad=pts.filter(([n,p])=>f[Math.floor(p[2])*CL.W+Math.floor(p[0])]===65535 || w.solid(p[0],1,p[2]) || w.solid(p[0],2,p[2]));
  console.log(mode,'points',pts.length,'unreachable/blocked:',bad.map(([n,p])=>n+'@'+p.join(',')).join(' ')||'none');
}
// can a player climb tower stairs to the 3rd floor? simulate walking up both flights in the N tower
const w=new CL.World(); CL.genMap(w,'cash');
const b={x:41+1.5,y:1,z:6+1.5+0.5,vx:0,vy:0,vz:0,hw:0.3,h:1.75,onGround:true};
for(let i=0;i<120;i++){ b.vx=4; b.vz=0; CL.moveBody(w,b,1/30);} 
console.log('after flight 1: y',b.y.toFixed(2),'x',b.x.toFixed(1));
