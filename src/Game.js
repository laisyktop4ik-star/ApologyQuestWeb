import * as THREE from 'three';
import { RendererSystem } from './rendering/RendererSystem.js';
import { WorldSystem } from './world/WorldSystem.js';
import { PlayerSystem } from './player/PlayerSystem.js';
import { ThirdPersonCamera } from './player/ThirdPersonCamera.js';
import { BearSystem } from './ai/BearSystem.js';
import { QuestSystem } from './game/QuestSystem.js';
import { AudioSystem } from './audio/AudioSystem.js';
import { UISystem } from './ui/UISystem.js';
import { AssetManager } from './assets/AssetManager.js';

export class Game {
  constructor(canvas){
    this.canvas=canvas;this.isMobile=matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0||/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(this.isMobile?64:58,innerWidth/innerHeight,.1,220);this.renderer=new RendererSystem(canvas);this.assets=new AssetManager();this.world=new WorldSystem(this.scene);this.player=new PlayerSystem(this.scene,this.world,canvas);this.followCamera=new ThirdPersonCamera(this.camera,this.player,this.world,canvas);this.bear=new BearSystem(this.scene,this.world);this.quest=new QuestSystem();this.audio=new AudioSystem();this.ui=new UISystem();this.clock=new THREE.Clock();this.running=false;this.modal=false;this.recovering=false;this.checkpoint=null;this.interaction=null;this.warmth=0;this.idleRenderTimer=0;this.finalFogColor=new THREE.Color(0x8a8662);this.finalSunColor=new THREE.Color(0xffd18b);
    this.#bind();this.ui.updateQuest(this.quest);const quality=this.isMobile?'medium':'high';this.renderer.setQuality(quality);this.world.setQuality(quality);this.ui.quality.value=quality;this.renderer.render(this.scene,this.camera);
  }
  #bind(){
    const controls=document.querySelector('#mobile-controls');
    if(this.isMobile){
      const stick=document.querySelector('#move-stick'),base=stick.querySelector('.joystick-base'),knob=document.querySelector('#joystick-knob');let movePointer=null;
      const updateStick=(e)=>{const r=base.getBoundingClientRect(),max=(r.width-knob.offsetWidth)/2,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dy)||1,scale=Math.min(1,max/d),x=dx*scale,y=dy*scale;knob.style.transform=`translate(${x}px,${y}px)`;const strength=Math.hypot(x,y)/max;this.player.setTouchInput(strength<.12?0:x/max,strength<.12?0:-y/max)};
      const releaseStick=(e)=>{if(movePointer!==null&&e.pointerId!==movePointer)return;movePointer=null;this.player.setTouchInput(0,0);knob.style.transform='translate(0,0)'};
      stick.addEventListener('pointerdown',(e)=>{e.preventDefault();movePointer=e.pointerId;stick.setPointerCapture?.(movePointer);updateStick(e)});stick.addEventListener('pointermove',(e)=>{if(e.pointerId===movePointer)updateStick(e)});stick.addEventListener('pointerup',releaseStick);stick.addEventListener('pointercancel',releaseStick);stick.addEventListener('lostpointercapture',releaseStick);
      const run=document.querySelector('#run-button'),stopRun=()=>{this.player.setTouchRunning(false);run.classList.remove('pressed')};run.addEventListener('pointerdown',(e)=>{e.preventDefault();run.setPointerCapture?.(e.pointerId);this.player.setTouchRunning(true);run.classList.add('pressed')});run.addEventListener('pointerup',stopRun);run.addEventListener('pointercancel',stopRun);run.addEventListener('lostpointercapture',stopRun);
      document.querySelector('#action-button').addEventListener('pointerdown',(e)=>{e.preventDefault();this.#interact()});
    }
    this.ui.onStart(async()=>{await this.audio.start();this.ui.showGame();this.running=true;if(this.isMobile)controls.classList.remove('hidden');else this.canvas.requestPointerLock?.();this.ui.toast('Следуйте по тропе. Лес хранит ответы.');});
    this.ui.onFinish(()=>{this.ui.showEnding();this.quest.stage='complete';this.ui.updateQuest(this.quest)});
    this.ui.onReplay(()=>location.reload());this.ui.onQuality((q)=>{this.renderer.setQuality(q);this.world.setQuality(q)});this.ui.onSound((v)=>this.audio.setEnabled(v));
    addEventListener('keydown',(e)=>{if(e.code==='KeyE'&&!e.repeat)this.#interact()});
    addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.resize()});
  }
  start(){this.clock.start();requestAnimationFrame(()=>this.#loop())}
  #loop(){
    requestAnimationFrame(()=>this.#loop());
    const delta=Math.min(this.clock.getDelta(),.05);
    let shouldRender=false;
    if(this.running&&!this.modal){this.#update(delta);shouldRender=true}
    else{this.idleRenderTimer-=delta;if(this.idleRenderTimer<=0){this.idleRenderTimer=.2;shouldRender=true}}
    if(shouldRender)this.renderer.render(this.scene,this.camera)
  }
  #update(delta){
    this.world.update(delta);const movement=this.player.update(delta,this.followCamera.yaw,!this.modal&&!this.recovering);this.followCamera.update(delta);this.audio.update(delta,movement.moving,movement.running);this.ui.setStamina(movement.stamina);
    this.interaction=this.world.nearestInteractable(this.player.group.position);this.ui.setInteraction(this.#interactionLabel(this.interaction));
    if(this.quest.stage==='find-path'&&this.player.group.position.distanceTo(this.world.bearZone)<7)this.#startChase();
    if(this.quest.stage==='escape-bear'&&!this.recovering&&this.player.group.position.distanceTo(this.world.safeZone)<7)this.#finishChase();
    const bearResult=this.bear.update(delta,this.player.group.position);const danger=this.quest.stage==='escape-bear'&&bearResult.distance<22;this.ui.setDanger(danger);this.audio.setChase(danger);
    if(bearResult.didAttack)this.#defeat();
    if(this.quest.stage==='final-clearing'){this.warmth=Math.min(1,this.warmth+delta*.18);this.scene.fog.color.lerp(this.finalFogColor,delta*.25);this.world.sun.color.lerp(this.finalSunColor,delta*.3)}
  }
  #interactionLabel(item){if(!item)return null;const {kind,label}=item.userData;if(kind==='sign'&&this.quest.stage!=='find-trail')return null;if(kind==='memory'&&this.quest.stage!=='memories')return null;if(kind==='final'&&this.quest.stage!=='final-clearing')return null;return label}
  #interact(){
    if(this.modal){return}
    const item=this.interaction;if(!item||!this.#interactionLabel(item))return;
    if(item.userData.kind==='sign'&&this.quest.activateSignpost()){this.ui.toast('На дереве вырезано: «Три вещи укажут верный путь»');this.ui.updateQuest(this.quest)}
    else if(item.userData.kind==='memory'&&this.quest.collectMemory(item.userData.id)){item.visible=false;const messages={photo:'Фотография: тёплый момент, который хочется сохранить.',letter:'Письмо: слова имеют вес, если за ними следуют поступки.',gift:'Подарок: маленькие вещи иногда говорят громче слов.'};this.ui.toast(messages[item.userData.id],3800);this.ui.updateQuest(this.quest);if(this.quest.stage==='find-path')this.ui.toast('Вдали зажглись фонари. Следуйте за ними.',3500)}
    else if(item.userData.kind==='final'&&this.quest.openFinalLetter()){this.modal=true;this.ui.showLetter();this.ui.updateQuest(this.quest);this.audio.setChase(false)}
  }
  #startChase(){
    if(!this.quest.enterBearZone())return;this.checkpoint={quest:this.quest.createCheckpoint(),position:new THREE.Vector3(this.world.pathX(-24),0,-24)};this.bear.trigger();this.audio.roar();this.audio.setChase(true);this.followCamera.addShake(.55);this.player.react();this.ui.toast('РЫЧАНИЕ. БЕГИТЕ К СВЕТУ!',3200);this.ui.updateQuest(this.quest)
  }
  #finishChase(){
    if(!this.quest.reachSafeZone())return;this.bear.reset();this.audio.setChase(false);this.ui.setDanger(false);this.ui.toast('Вы в безопасности. Впереди — тёплый свет.',3400);this.ui.updateQuest(this.quest)
  }
  #defeat(){
    if(this.recovering)return;this.recovering=true;this.followCamera.addShake(.9);this.ui.toast('Медведь догнал вас. Возвращение к контрольной точке…',2600);this.bear.reset();const cp=this.checkpoint;setTimeout(()=>{if(!cp){this.recovering=false;return}this.quest.restoreCheckpoint(cp.quest);this.player.teleport(cp.position);this.bear.trigger();this.recovering=false;this.ui.updateQuest(this.quest);this.audio.roar()},900)
  }
}
