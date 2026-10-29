import * as THREE from 'three';

export class PlayerSystem {
  constructor(scene, world, canvas) {
    this.world = world;
    this.canvas = canvas;
    this.group = new THREE.Group();
    this.group.position.set(world.pathX(66), world.heightAt(world.pathX(66),66), 66);
    this.velocity = new THREE.Vector3();
    this.keys = new Set();
    this.touchInput = new THREE.Vector2();
    this.touchRunning = false;
    this.stamina = 1;
    this.isRunning = false;
    this.state = 'idle';
    this.scaredTimer = 0;
    this.elapsed = 0;
    this.#buildModel();
    this.#bindInput();
    scene.add(this.group);
  }

  #part(geometry, color, position, parent = this.group) {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: .9, flatShading: true }));
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  #buildModel() {
    const torso = this.#part(new THREE.BoxGeometry(.72,1.05,.42),0x294052,new THREE.Vector3(0,1.35,0));
    this.#part(new THREE.BoxGeometry(.78,.28,.5),0x7b4d34,new THREE.Vector3(0,1.82,0));
    this.#part(new THREE.SphereGeometry(.34,8,6),0xc58e69,new THREE.Vector3(0,2.16,0));
    this.#part(new THREE.BoxGeometry(.38,.16,.4),0x3b2b24,new THREE.Vector3(0,2.43,0));
    this.backpack = this.#part(new THREE.BoxGeometry(.64,.82,.3),0x67422c,new THREE.Vector3(0,1.36,.34));
    this.leftArm = new THREE.Group(); this.leftArm.position.set(-.48,1.7,0); this.group.add(this.leftArm);
    this.rightArm = new THREE.Group(); this.rightArm.position.set(.48,1.7,0); this.group.add(this.rightArm);
    this.leftLeg = new THREE.Group(); this.leftLeg.position.set(-.22,.85,0); this.group.add(this.leftLeg);
    this.rightLeg = new THREE.Group(); this.rightLeg.position.set(.22,.85,0); this.group.add(this.rightLeg);
    this.#part(new THREE.CylinderGeometry(.13,.15,.88,6),0x314a59,new THREE.Vector3(0,-.36,0),this.leftArm);
    this.#part(new THREE.CylinderGeometry(.13,.15,.88,6),0x314a59,new THREE.Vector3(0,-.36,0),this.rightArm);
    this.#part(new THREE.CylinderGeometry(.16,.18,.88,6),0x493d46,new THREE.Vector3(0,-.4,0),this.leftLeg);
    this.#part(new THREE.CylinderGeometry(.16,.18,.88,6),0x493d46,new THREE.Vector3(0,-.4,0),this.rightLeg);
    this.#part(new THREE.BoxGeometry(.32,.18,.52),0x27241f,new THREE.Vector3(0,-.86,-.08),this.leftLeg);
    this.#part(new THREE.BoxGeometry(.32,.18,.52),0x27241f,new THREE.Vector3(0,-.86,-.08),this.rightLeg);
    torso.userData.name = 'hero';
  }

  #bindInput() {
    addEventListener('keydown', (e) => this.keys.add(e.code));
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }

  setTouchInput(x,y) { this.touchInput.set(x,y); }
  setTouchRunning(value) { this.touchRunning = value; }

  update(delta, cameraYaw, movementEnabled = true) {
    this.elapsed += delta;
    this.scaredTimer = Math.max(0, this.scaredTimer - delta);
    const input = new THREE.Vector2(
      (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0) + this.touchInput.x,
      (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0) + this.touchInput.y,
    );
    if (!movementEnabled) input.set(0,0);
    if (input.lengthSq() > 1) input.normalize();
    const forward = new THREE.Vector3(Math.sin(cameraYaw),0,-Math.cos(cameraYaw));
    const right = new THREE.Vector3(Math.cos(cameraYaw),0,Math.sin(cameraYaw));
    const direction = forward.multiplyScalar(input.y).add(right.multiplyScalar(input.x));
    const wantsRun = (this.keys.has('ShiftLeft') || this.touchRunning) && this.stamina > .04 && input.lengthSq() > 0;
    this.isRunning = wantsRun;
    const speed = wantsRun ? 7.4 : 4.25;
    if (wantsRun) this.stamina = Math.max(0,this.stamina-delta*.19);
    else this.stamina = Math.min(1,this.stamina+delta*.11);
    this.velocity.lerp(direction.multiplyScalar(speed), 1-Math.exp(-delta*12));
    const nx = this.group.position.x + this.velocity.x*delta;
    const nz = this.group.position.z + this.velocity.z*delta;
    if (!this.world.isBlocked(nx,this.group.position.z,.38)) this.group.position.x=nx;
    else this.velocity.x=0;
    if (!this.world.isBlocked(this.group.position.x,nz,.38)) this.group.position.z=nz;
    else this.velocity.z=0;
    this.group.position.y = this.world.heightAt(this.group.position.x,this.group.position.z);
    const moving = this.velocity.lengthSq() > .35;
    if (moving) {
      const target = Math.atan2(this.velocity.x,this.velocity.z);
      this.group.rotation.y = this.#lerpAngle(this.group.rotation.y,target,1-Math.exp(-delta*12));
    }
    this.state = this.scaredTimer > 0 ? 'scared' : moving ? (wantsRun?'run':'walk') : 'idle';
    this.#animate(delta);
    return { moving, running:wantsRun, speed:this.velocity.length(), stamina:this.stamina };
  }

  #animate(delta) {
    const frequency = this.state==='run'?12:this.state==='walk'?8:2;
    const amount = this.state==='run'?.82:this.state==='walk'?.55:.035;
    const swing = Math.sin(this.elapsed*frequency)*amount;
    this.leftArm.rotation.x = swing;
    this.rightArm.rotation.x = -swing;
    this.leftLeg.rotation.x = -swing;
    this.rightLeg.rotation.x = swing;
    const scareBlend = 1 - Math.exp(-delta * 12);
    this.leftArm.rotation.z = THREE.MathUtils.lerp(this.leftArm.rotation.z, this.state==='scared' ? -1.1 : 0, scareBlend);
    this.rightArm.rotation.z = THREE.MathUtils.lerp(this.rightArm.rotation.z, this.state==='scared' ? 1.1 : 0, scareBlend);
    this.group.position.y += this.state==='idle'?Math.sin(this.elapsed*2)*.015:Math.abs(Math.sin(this.elapsed*frequency))*.035;
    this.backpack.rotation.z = Math.sin(this.elapsed*frequency)*.025;
  }

  react() {
    this.scaredTimer = 0.8;
  }

  teleport(position) {
    this.group.position.copy(position);
    this.group.position.y=this.world.heightAt(position.x,position.z);
    this.velocity.set(0,0,0);
    this.stamina=1;
  }

  #lerpAngle(a,b,t) { return a + Math.atan2(Math.sin(b-a),Math.cos(b-a))*t; }
}
