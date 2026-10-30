// BroadcastChannel mock of the artifact `room` capability (lobby + named rooms), for local multi-tab tests only.
(function(){
  var me = Math.random().toString(36).slice(2,10)+Math.random().toString(36).slice(2,10);
  var bc = new BroadcastChannel('cl-mockroom');
  var rooms = {};
  function Room(name){ this.name=name; this.mine={}; this.others={}; this.subs=[]; this.snap=Object.freeze([]); this.dirty=true; this.left=false; this.connected=true; }
  Room.prototype.build=function(){ var arr=[]; arr.push(Object.freeze({peer:me,isMe:true,sameTab:true,kind:'viewer',guest:false,by:null,presence:Object.freeze(JSON.parse(JSON.stringify(this.mine))),updatedAt:Date.now()}));
    for (var p in this.others) arr.push(Object.freeze({peer:p,isMe:false,sameTab:false,kind:'viewer',guest:false,by:null,presence:this.others[p].presence,updatedAt:this.others[p].t}));
    this.snap=Object.freeze(arr); this.dirty=false; };
  Room.prototype.peers=function(){ if(this.dirty) this.build(); return this.snap; };
  Room.prototype.notify=function(){ this.dirty=true; var self=this; if(this.pend) return; this.pend=true; setTimeout(function(){ self.pend=false; var ps=self.peers(); self.subs.forEach(function(f){ try{f({peers:ps,joined:[],left:[],updated:[]});}catch(e){console.error(e);} }); },16); };
  Room.prototype.presence=function(patch){ if(this.left) return Promise.reject({code:'invalid_argument'}); var m=JSON.parse(JSON.stringify(this.mine)); for(var k in patch){ if(patch[k]===null) delete m[k]; else m[k]=patch[k]; }
    var s=JSON.stringify(m); if (new TextEncoder().encode(s).length>4096){ window.__presenceOver=(window.__presenceOver||0)+1; return Promise.reject({code:'invalid_argument',message:'presence over 4KiB: '+s.length}); }
    this.mine=m; bc.postMessage({t:'p',r:this.name,peer:me,p:m}); this.notify(); return Promise.resolve(); };
  Room.prototype.onPeers=function(fn){ this.subs.push(fn); this.notify(); var s=this.subs; return function(){ var i=s.indexOf(fn); if(i>=0) s.splice(i,1); }; };
  Room.prototype.emit=function(){ return Promise.resolve(); }; Room.prototype.on=function(){ return function(){}; };
  Room.prototype.leave=function(){ this.left=true; bc.postMessage({t:'l',r:this.name,peer:me}); delete rooms[this.name]; return Promise.resolve(); };
  Room.prototype.connected=function(){ return true; }; Room.prototype.onConnection=function(fn){ setTimeout(function(){fn(true);},0); return function(){}; };
  bc.onmessage=function(e){ var d=e.data, r=rooms[d.r]; if(!r) return;
    if(d.t==='p'){ r.others[d.peer]={presence:Object.freeze(d.p),t:Date.now()}; r.notify(); }
    else if(d.t==='l'){ delete r.others[d.peer]; r.notify(); }
    else if(d.t==='h'){ bc.postMessage({t:'p',r:d.r,peer:me,p:r.mine}); } };
  setInterval(function(){ var now=Date.now(); for(var n in rooms){ var r=rooms[n]; bc.postMessage({t:'p',r:n,peer:me,p:r.mine}); for(var p in r.others) if(now-r.others[p].t>4000){ delete r.others[p]; r.notify(); } } },1000);
  addEventListener('beforeunload',function(){ for(var n in rooms) bc.postMessage({t:'l',r:n,peer:me}); });
  var lobby=new Room(''); rooms['']=lobby; bc.postMessage({t:'h',r:''});
  lobby.join=function(name){ var r=rooms[name]||(rooms[name]=new Room(name)); bc.postMessage({t:'h',r:name}); return new Promise(function(res){ setTimeout(function(){res(r);},120); }); };
  window.claude={ use:function(n){ return new Promise(function(res){ setTimeout(function(){ res(n==='room'?lobby:null); },60); }); } };
  window.__mockPeer=me;
})();
