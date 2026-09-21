// Phaser stub ขั้นต่ำ — พอให้ Player/CombatSystem/Scene ทำงานได้โดยไม่มี renderer
class Body {
  constructor(o){ this.o=o; this.velocity={x:0,y:0}; this.blocked={down:true}; this.touching={down:true};
    this.y=0;this.width=40;this.height=180;this.offset={x:0,y:0};this.sourceHeight=180;this.enable=true;}
  get x(){return this.o.x-20} set x(v){}
  get right(){return this.o.x+20} get bottom(){return this.o.y+90} get center(){return {x:this.o.x,y:this.o.y}}
  setGravityY(){} setCollideWorldBounds(){} setDragX(){} setSize(){} setOffset(){} updateBounds(){} setAllowGravity(){}
  setVelocityX(v){this.velocity.x=v} setVelocityY(v){this.velocity.y=v} setVelocity(x,y){this.velocity.x=x;this.velocity.y=y}
}
class Sprite {
  constructor(scene,x,y,tex){ this.texture={key:tex};this.frame={name:'__BASE'};this.x=x;this.y=y;this.width=100;this.height=200;this.alpha=1;this.scaleX=1;this.scaleY=1;this.anims={currentAnim:null}; this.tint=null;}
  play(k){ this.lastAnim=k; this.anims.currentAnim={key:k}; this.anims.currentFrame={index:1}; return this }
  setTexture(k,f){ this.texture={key:k}; this.frame={name:f}; return this }
  get displayHeight(){ return this.height*this.scaleY } set displayHeight(v){ this.scaleY=v/this.height }
  get tintTopLeft(){ return this.tint ?? 0xffffff } setScale(x,y){this.scaleX=x;this.scaleY=y??x;return this} setAlpha(a){this.alpha=a;return this}
  setTint(t){this.tint=t;return this} clearTint(){this.tint=null;return this} setTintFill(t){this.tint='fill';return this}
  setFlipX(){return this} setFrame(){return this} setPosition(x,y){this.x=x;this.y=y;return this} setVisible(){return this} setDepth(){return this} setOrigin(){return this}
}
globalThis.Phaser = { BlendModes:{ADD:1,NORMAL:0}, Scene: class { constructor(){} }, Physics:{Arcade:{Sprite}}, GameObjects:{Sprite}, Math:{Clamp:(v,a,b)=>Math.min(b,Math.max(a,v))} };
export function makeScene(){
  const log=[];
  const scene = {
    log,
    add:{ existing(){}, sprite(x,y,tex,fr){ const sp=new Sprite(null,x,y,tex); sp.frame={name:fr}; sp.displayHeight=0; sp.destroy=()=>{sp.dead=true}; sp.setFlipX=(f)=>{sp.flipX=f;return sp}; log.push('sprite:'+tex); return sp },
      ellipse(x,y,w,h,c,a2){ const e={x,y,alpha:a2??1,setDepth(){return e},setPosition(x2,y2){e.x=x2;e.y=y2;return e},setFillStyle(){return e},destroy(){e.dead=true}}; return e },
      circle(x,y,r,c,a2){ const o={x,y,radius:r,color:c,alpha:a2??1,setDepth(d){o.depth=d;return o},setBlendMode(){return o},setStrokeStyle(){return o},setScrollFactor(f){o.scrollFactor=f;return o},setFillStyle(col,al){o.color=col;o.alpha=al;return o},setInteractive(){o.interactive=true;return o},setPosition(){return o},destroy(){o.dead=true}}; log.push('circle'); return o },
      rectangle(x,y,w,h,c,a2){ const r={x,y,width:w,height:h,color:c,alpha:a2??1,handlers:{},setOrigin(){return r},setDepth(d){r.depth=d;return r},setScrollFactor(f){r.scrollFactor=f;return r},setStrokeStyle(){return r},setFillStyle(){return r},setInteractive(){r.interactive=true;return r},on(ev,fn){r.handlers[ev]=fn;return r},emit(ev){r.handlers[ev]?.()},destroy(){r.dead=true}}; log.push('rect'); return r },
      image(x,y,tex){ const im={x,y,texture:tex,displayWidth:0,displayHeight:0,setOrigin(){return im},setDisplaySize(w,h){im.displayWidth=w;im.displayHeight=h;return im},setDepth(d){im.depth=d;return im},setScrollFactor(f){im.scrollFactor=f;return im},setTexture(t){im.texture=t;return im},destroy(){im.dead=true}}; log.push('image:'+tex); return im },
      graphics(){ const g={setDepth(){return g},fillStyle(){return g},fillCircle(){return g},lineStyle(){return g},strokeCircle(){return g},setPosition(){return g},destroy(){}};return g},
      text(x,y,s){const t={text:s,x,y,setOrigin(){return t},setDepth(d){t.depth=d;return t},setScrollFactor(f){t.scrollFactor=f;return t},setStyle(){return t},setText(v){t.text=v;return t},setVisible(){return t},destroy(){t.dead=true}}; log.push('text:'+s); return t} },
    physics:{ add:{ existing(o){ o.body=new Body(o) } }, world:{ gravity:{y:0}, paused:false, pause(){this.paused=true; log.push('physics.pause')}, resume(){this.paused=false; log.push('physics.resume')} } },
    anims:{ exists:()=>true, paused:false, pauseAll(){this.paused=true}, resumeAll(){this.paused=false} },
    tweens:{ add(){}, paused:false, pauseAll(){this.paused=true}, resumeAll(){this.paused=false} },
    time:{ paused:false, now:0, delayedCall(ms,fn){ } },
    cameras:{ main:{ shake(){ log.push('shake') }, flash(){ log.push('flash') }, setBackgroundColor(){}, worldView:{x:0,y:0,width:1280,height:720} } },
    sys:{ game:{ config:{ width:1280, height:720 } } },
    children:{ removeAll(){ log.push('children.removeAll') } },
    load:{ atlas(k){ log.push('load.atlas:'+k) }, image(){}, audio(){} },
    input:{ _added:0, manager:{ pointers:[], pointersTotal:2 },
            addPointer(n){ this._added+=n; this.manager.pointersTotal+=n; log.push('addPointer:'+n) },
            keyboard:{ addKey(){ return { isDown:false, on(){} } } }, on(){} },
    transformFx:{ erupt(){ log.push('fx.erupt') }, shatterCrystals(){ log.push('fx.shatter') }, revertPuff(){ log.push('fx.revertPuff') }, end(){} },
    audio:{ play(n,o){ log.push('sfx:'+n+':'+(o?.pitch??1)) }, playHit(){ log.push('sfx:hit') }, playJump(n){ log.push('sfx:jump:'+n) } },
  };
  return scene;
}
