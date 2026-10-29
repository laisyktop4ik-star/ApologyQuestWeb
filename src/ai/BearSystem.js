import * as THREE from 'three';
import { BearFSM } from './BearFSM.js';

export class BearSystem {
  constructor(scene,world){
    this.scene=scene;this.world=world;this.fsm=new BearFSM({alertDelay:1.15,searchDuration:4.5,attackDistance:1.65,attackCooldown:1.25});
    this.group=new THREE.Group();this.home=new THREE.Vector3(world.pathX(-37)+5,0,-37);this.home.y=world.heightAt(this.home.x,this.home.z);
    this.group.position.copy(this.home);this.group.visible=false;this.active=false;this.elapsed=0;this.lastKnown=this.home.clone();
    this.#build();scene.add(this.group);
  }
  #mesh(geo,color,pos,parent=this.group){const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true}));m.position.copy(pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
  #build(){
    const fur=0x4a2d20,dark=0x241913,muzzle=0x7b5437;
    this.body=this.#mesh(new THREE.SphereGeometry(1,9,7),fur,new THREE.Vector3(0,1.25,0));this.body.scale.set(1.15,1,1.65);
    this.shoulders=this.#mesh(new THREE.SphereGeometry(.78,8,6),0x563426,new THREE.Vector3(0,1.62,-.85));this.shoulders.scale.set(1.25,1.15,1.1);
    this.head=new THREE.Group();this.head.position.set(0,1.85,-1.55);this.group.add(this.head);
    this.#mesh(new THREE.SphereGeometry(.64,8,6),fur,new THREE.Vector3(),this.head);
    this.#mesh(new THREE.SphereGeometry(.34,7,5),muzzle,new THREE.Vector3(0,-.12,-.57),this.head);
    this.#mesh(new THREE.SphereGeometry(.12,6,4),dark,new THREE.Vector3(0,-.06,-.86),this.head);
    this.#mesh(new THREE.SphereGeometry(.18,6,4),fur,new THREE.Vector3(-.42,.42,-.12),this.head);
    this.#mesh(new THREE.SphereGeometry(.18,6,4),fur,new THREE.Vector3(.42,.42,-.12),this.head);
    this.#mesh(new THREE.SphereGeometry(.055,5,4),0xf0c981,new THREE.Vector3(-.2,.1,-.58),this.head);
    this.#mesh(new THREE.SphereGeometry(.055,5,4),0xf0c981,new THREE.Vector3(.2,.1,-.58),this.head);
    this.legs=[];
    for(const [x,z] of [[-.65,-.75],[.65,-.75],[-.65,.75],[.65,.75]]){const leg=new THREE.Group();leg.position.set(x,.82,z);this.group.add(leg);this.#mesh(new THREE.CylinderGeometry(.24,.3,.95,7),fur,new THREE.Vector3(0,-.42,0),leg);this.#mesh(new THREE.BoxGeometry(.48,.22,.7),dark,new THREE.Vector3(0,-.92,-.15),leg);this.legs.push(leg)}
  }
  trigger(){this.active=true;this.group.visible=true;this.fsm.state='alert';this.fsm.timer=0}
  reset(){this.group.position.copy(this.home);this.group.visible=false;this.active=false;this.fsm.state='idle';this.fsm.timer=0}
  update(delta,playerPosition){
    if(!this.active)return{state:'idle',didAttack:false,distance:Infinity};
    this.elapsed+=delta;
    const distance=this.group.position.distanceTo(playerPosition);const visible=distance<34;const inHome=this.group.position.distanceTo(this.home)<2.2;
    if(visible)this.lastKnown.copy(playerPosition);
    const result=this.fsm.update(delta,{playerVisible:visible,distance,inHomeRange:inHome});
    let target=null,speed=0;
    if(result.state==='chase'||result.state==='attack'){target=playerPosition;speed=result.state==='attack'?0:6.1}
    else if(result.state==='search'){target=this.lastKnown;speed=2.4}
    else if(result.state==='return'){target=this.home;speed=2.8}
    if(target&&speed>0)this.#moveToward(target,speed,delta);
    this.#animate(result.state,delta);
    return{...result,distance};
  }
  #moveToward(target,speed,delta){
    const dir=new THREE.Vector3(target.x-this.group.position.x,0,target.z-this.group.position.z);if(dir.lengthSq()<.05)return;dir.normalize();
    const angles=[0,.45,-.45,.9,-.9];let chosen=dir;
    for(const a of angles){const candidate=dir.clone().applyAxisAngle(new THREE.Vector3(0,1,0),a);const nx=this.group.position.x+candidate.x*speed*delta,nz=this.group.position.z+candidate.z*speed*delta;if(!this.world.isBlocked(nx,nz,.75)){chosen=candidate;break}}
    this.group.position.addScaledVector(chosen,speed*delta);this.group.position.y=this.world.heightAt(this.group.position.x,this.group.position.z);
    const angle=Math.atan2(chosen.x,chosen.z)+Math.PI;this.group.rotation.y+=Math.atan2(Math.sin(angle-this.group.rotation.y),Math.cos(angle-this.group.rotation.y))*(1-Math.exp(-delta*7));
  }
  #animate(state){
    const moving=['chase','search','return'].includes(state);const frequency=state==='chase'?11:5;const swing=moving?Math.sin(this.elapsed*frequency)*.45:Math.sin(this.elapsed*2)*.04;
    this.legs[0].rotation.x=swing;this.legs[1].rotation.x=-swing;this.legs[2].rotation.x=-swing;this.legs[3].rotation.x=swing;
    this.body.position.y=1.25+(moving?Math.abs(Math.sin(this.elapsed*frequency))*.08:Math.sin(this.elapsed*2)*.025);
    this.head.rotation.x=state==='alert'?-.22:state==='attack'?.35:Math.sin(this.elapsed*1.5)*.025;
    if(state==='attack')this.head.position.z=-1.55-Math.abs(Math.sin(this.elapsed*12))*.28;
    else this.head.position.z=THREE.MathUtils.lerp(this.head.position.z,-1.55,.12);
  }
}
