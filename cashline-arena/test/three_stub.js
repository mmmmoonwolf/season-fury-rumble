(function(){
  function mk(){ var store={}; var fn=function(){};
    return new Proxy(fn,{ get:function(t,k){ if(k===Symbol.toPrimitive) return function(){return 0;}; if(k==='then'||k==='toJSON') return undefined; if(k in store) return store[k]; var v=mk(); store[k]=v; return v; },
      set:function(t,k,v){ store[k]=v; return true; }, apply:function(){ return mk(); }, construct:function(){ return mk(); } }); }
  window.THREE = mk(); window.__threeStub = true;
})();
