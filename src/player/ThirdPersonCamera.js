import * as THREE from 'three';

export class ThirdPersonCamera {
  constructor(camera, player, world, canvas) {
    this.camera=camera; this.player=player; this.world=world; this.canvas=canvas;
    this.yaw=0; this.pitch=.28; this.distance=6.2; this.shake=0;
    this.target=new THREE.Vector3(); this.desired=new THREE.Vector3();
    canvas.addEventListener('click',()=>canvas.requestPointerLock?.());
    addEventListener('mousemove',(e)=>{
      if(document.pointerLockElement!==canvas)return;
      this.yaw-=e.movementX*.0025;
      this.pitch=THREE.MathUtils.clamp(this.pitch-e.movementY*.0018,-.12,.72);
    });
    addEventListener('wheel',(e)=>{this.distance=THREE.MathUtils.clamp(this.distance+Math.sign(e.deltaY)*.5,3.5,8.5)},{passive:true});
    const lookZone=document.querySelector('#look-zone');
    if(lookZone){
      let pointerId=null,lastX=0,lastY=0;
      lookZone.addEventListener('pointerdown',(e)=>{e.preventDefault();pointerId=e.pointerId;lastX=e.clientX;lastY=e.clientY;lookZone.setPointerCapture?.(pointerId)});
      lookZone.addEventListener('pointermove',(e)=>{if(e.pointerId!==pointerId)return;e.preventDefault();const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;this.yaw-=dx*.006;this.pitch=THREE.MathUtils.clamp(this.pitch-dy*.004,-.12,.72)});
      const release=(e)=>{if(pointerId===e.pointerId)pointerId=null};
      lookZone.addEventListener('pointerup',release);lookZone.addEventListener('pointercancel',release);lookZone.addEventListener('lostpointercapture',()=>{pointerId=null});
    }
  }
  addShake(amount){this.shake=Math.max(this.shake,amount)}
  update(delta){
    const p=this.player.group.position;
    this.target.set(p.x,p.y+1.55,p.z);
    const horizontal=Math.cos(this.pitch)*this.distance;
    const offset=new THREE.Vector3(-Math.sin(this.yaw)*horizontal,Math.sin(this.pitch)*this.distance+1.15,Math.cos(this.yaw)*horizontal);
    this.desired.copy(this.target).add(offset);
    const safe=this.world.cameraSafeDistance(this.target,this.desired,this.distance);
    if(safe<this.distance){const ratio=safe/this.distance;this.desired.lerpVectors(this.target,this.desired,ratio)}
    this.desired.y=Math.max(this.desired.y,this.world.heightAt(this.desired.x,this.desired.z)+.6);
    const smoothing=1-Math.exp(-delta*8);
    this.camera.position.lerp(this.desired,smoothing);
    if(this.shake>0){this.camera.position.x+=(Math.random()-.5)*this.shake;this.camera.position.y+=(Math.random()-.5)*this.shake;this.shake=Math.max(0,this.shake-delta*.55)}
    this.camera.lookAt(this.target);
  }
}
