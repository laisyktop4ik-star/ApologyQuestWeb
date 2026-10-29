import * as THREE from 'three';
import { GAME_CONFIG } from '../config.js';

function mulberry32(seed) {
  return () => {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLORS = {
  bark: [0x3d2b21, 0x563526, 0x694331],
  pine: [0x173c2a, 0x205137, 0x2c6040, 0x3b6c45],
  ground: 0x52603b,
  stone: [0x4e5851, 0x677066, 0x3f4944],
};

function addInstanceWind(material, amount) {
  const time = { value: 0 };
  material.userData.windTime = time;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat wind = sin(uWindTime * 1.35 + instanceMatrix[3].x * 0.09 + instanceMatrix[3].z * 0.07);\ntransformed.x += wind * ${amount.toFixed(3)} * max(position.y, 0.0);\n#endif`);
  };
  return material;
}

export class WorldSystem {
  constructor(scene) {
    this.scene = scene;
    this.random = mulberry32(GAME_CONFIG.worldSeed);
    this.colliders = [];
    this.interactables = [];
    this.time = 0;
    this.pathX = (z) => Math.sin(z * 0.055) * 6.5 + Math.sin(z * 0.013) * 2;
    this.bearZone = new THREE.Vector3(this.pathX(-31), 0, -31);
    this.safeZone = new THREE.Vector3(this.pathX(-58), 0, -58);
    this.finalCenter = new THREE.Vector3(0, 0, -73);
    this.#createAtmosphere();
    this.#createTerrain();
    this.#createForest();
    this.#createGroundDetails();
    this.#createQuestLandmarks();
    this.#createFinalClearing();
    this.#createParticles();
  }

  heightAt(x, z) {
    const broad = Math.sin(x * 0.045) * 1.25 + Math.cos(z * 0.038) * 1.1;
    const detail = Math.sin((x + z) * 0.11) * 0.28 + Math.cos((x - z) * 0.08) * 0.35;
    const path = Math.abs(x - this.pathX(z));
    const flatten = THREE.MathUtils.smoothstep(path, 1.5, 7);
    const clearing = THREE.MathUtils.smoothstep(Math.hypot(x, z + 73), 9, 18);
    return (broad + detail) * Math.min(flatten + 0.25, 1) * clearing;
  }

  #createAtmosphere() {
    this.scene.background = new THREE.Color(0x8aa0a2);
    this.scene.fog = new THREE.FogExp2(0x60756b, 0.018);
    const hemi = new THREE.HemisphereLight(0xb9cdd1, 0x26301f, 1.5);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffd59a, 2.4);
    sun.position.set(-25, 38, 22);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = -45;
    sun.shadow.camera.right = 45;
    sun.shadow.camera.top = 45;
    sun.shadow.camera.bottom = -45;
    sun.shadow.camera.far = 120;
    sun.shadow.bias = -0.0005;
    this.sun = sun;
    this.scene.add(sun);
  }

  #createTerrain() {
    const geometry = new THREE.PlaneGeometry(180, 180, 64, 64);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = -p.getY(i);
      p.setZ(i, this.heightAt(x, z));
    }
    geometry.computeVertexNormals();
    geometry.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: COLORS.ground, roughness: 1, flatShading: true }));
    ground.receiveShadow = true;
    this.scene.add(ground);

    const path = new THREE.Mesh(new THREE.PlaneGeometry(7, 155, 3, 48), new THREE.MeshStandardMaterial({ color: 0x826548, roughness: 1, flatShading: true }));
    const pp = path.geometry.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const localX = pp.getX(i);
      const z = -pp.getY(i);
      const centerX = this.pathX(z);
      pp.setX(i, localX + centerX);
      pp.setZ(i, this.heightAt(centerX + localX, z) + 0.035);
    }
    path.geometry.rotateX(-Math.PI / 2);
    path.receiveShadow = true;
    this.scene.add(path);
  }

  #createForest() {
    const count = GAME_CONFIG.treeCount;
    const trunkGeo = new THREE.CylinderGeometry(0.38, 0.58, 7, 6);
    const crownGeo = new THREE.ConeGeometry(3.2, 4.2, 7);
    const trunk = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x523526, roughness: 1, flatShading: true }), count);
    const crownMaterial = addInstanceWind(new THREE.MeshStandardMaterial({ color: 0x245037, roughness: 1, flatShading: true }), 0.035);
    const crowns = new THREE.InstancedMesh(crownGeo, crownMaterial, count * 3);
    trunk.castShadow = trunk.receiveShadow = true;
    crowns.castShadow = true;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let made = 0;
    let attempts = 0;
    while (made < count && attempts++ < count * 30) {
      const x = (this.random() - 0.5) * 168;
      const z = (this.random() - 0.5) * 168;
      const pathGap = Math.abs(x - this.pathX(z));
      if (pathGap < 5.2 || Math.hypot(x, z + 73) < 17 || Math.hypot(x, z - 64) < 8) continue;
      const scale = 0.75 + this.random() * 0.65;
      const y = this.heightAt(x, z);
      dummy.position.set(x, y + 3.5 * scale, z);
      dummy.rotation.y = this.random() * Math.PI * 2;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunk.setMatrixAt(made, dummy.matrix);
      trunk.setColorAt(made, color.setHex(COLORS.bark[Math.floor(this.random() * COLORS.bark.length)]));
      for (let tier = 0; tier < 3; tier++) {
        const tierScale = scale * (1 - tier * 0.17);
        dummy.position.set(x, y + (5.8 + tier * 1.65) * scale, z);
        dummy.rotation.y = this.random() * Math.PI;
        dummy.scale.set(tierScale, tierScale, tierScale);
        dummy.updateMatrix();
        const idx = made * 3 + tier;
        crowns.setMatrixAt(idx, dummy.matrix);
        crowns.setColorAt(idx, color.setHex(COLORS.pine[Math.floor(this.random() * COLORS.pine.length)]));
      }
      this.colliders.push({ x, z, radius: 0.58 * scale, type: 'tree' });
      made++;
    }
    trunk.count = made;
    crowns.count = made * 3;
    trunk.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = true;
    if (trunk.instanceColor) trunk.instanceColor.needsUpdate = true;
    if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
    this.trunks = trunk;
    this.crowns = crowns;
    this.scene.add(trunk, crowns);
  }

  #createGroundDetails() {
    const grassGeo = new THREE.PlaneGeometry(0.18, 1.1);
    grassGeo.translate(0, 0.55, 0);
    const grassMaterial = addInstanceWind(new THREE.MeshStandardMaterial({ color: 0x718545, side: THREE.DoubleSide, roughness: 1, flatShading: true }), 0.075);
    const grass = new THREE.InstancedMesh(grassGeo, grassMaterial, GAME_CONFIG.grassCount);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < GAME_CONFIG.grassCount; i++) {
      const x = (this.random() - 0.5) * 165;
      const z = (this.random() - 0.5) * 165;
      const s = 0.45 + this.random() * 1.25;
      dummy.position.set(x, this.heightAt(x, z), z);
      dummy.rotation.y = this.random() * Math.PI;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      grass.setMatrixAt(i, dummy.matrix);
      grass.setColorAt(i, color.setHSL(0.17 + this.random() * 0.08, 0.35 + this.random() * 0.2, 0.24 + this.random() * 0.18));
    }
    grass.instanceMatrix.needsUpdate = true;
    if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
    this.grass = grass;
    this.scene.add(grass);

    const rockCount = 55;
    const rock = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.8, 0), new THREE.MeshStandardMaterial({ color: 0x59615a, roughness: 1, flatShading: true }), rockCount);
    for (let i = 0; i < rockCount; i++) {
      const x = (this.random() - 0.5) * 150;
      const z = (this.random() - 0.5) * 150;
      const s = 0.35 + this.random() * 1.2;
      dummy.position.set(x, this.heightAt(x, z) + 0.32 * s, z);
      dummy.rotation.set(this.random(), this.random() * Math.PI, this.random() * 0.4);
      dummy.scale.set(s * 1.2, s * 0.7, s);
      dummy.updateMatrix();
      rock.setMatrixAt(i, dummy.matrix);
      rock.setColorAt(i, color.setHex(COLORS.stone[Math.floor(this.random() * COLORS.stone.length)]));
      if (s > 0.8) this.colliders.push({ x, z, radius: 0.55 * s, type: 'rock' });
    }
    rock.castShadow = rock.receiveShadow = true;
    this.scene.add(rock);
  }

  #createQuestLandmarks() {
    const sign = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x6d4428, roughness: 1, flatShading: true });
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.6, 0.25), wood);
    post.position.y = 1.3;
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.65, 0.18), wood);
    board.position.set(0.45, 2.15, 0);
    board.rotation.z = -0.08;
    sign.add(post, board);
    this.#place(sign, this.pathX(54) + 2.3, 54);
    sign.userData = { kind: 'sign', label: 'Осмотреть старый указатель' };
    this.interactables.push(sign);
    this.scene.add(sign);

    this.memoryData = [
      { id: 'photo', label: 'Поднять фотографию', pos: [this.pathX(28) - 2.4, 28], color: 0xd9c6a4, shape: 'photo' },
      { id: 'letter', label: 'Прочитать старое письмо', pos: [this.pathX(8) + 3.2, 8], color: 0xe6d3a7, shape: 'letter' },
      { id: 'gift', label: 'Взять маленький подарок', pos: [this.pathX(-13) - 2.5, -13], color: 0xb94f4f, shape: 'gift' },
    ];
    for (const data of this.memoryData) {
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: data.color, emissive: data.color, emissiveIntensity: 0.25, roughness: 0.7, flatShading: true });
      const geo = data.shape === 'gift' ? new THREE.BoxGeometry(0.65, 0.5, 0.65) : new THREE.BoxGeometry(0.65, 0.06, 0.48);
      const item = new THREE.Mesh(geo, mat);
      item.castShadow = true;
      group.add(item);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 4, 16), new THREE.MeshBasicMaterial({ color: 0xf5c76f }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.05;
      group.add(ring);
      this.#place(group, data.pos[0], data.pos[1], 0.5);
      group.userData = { kind: 'memory', id: data.id, label: data.label, ring };
      this.interactables.push(group);
      this.scene.add(group);
    }

    for (let z = -22; z >= -55; z -= 6) this.#createLantern(this.pathX(z) + (z % 12 === 0 ? -2 : 2), z);
  }

  #createLantern(x, z) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.2, 5), new THREE.MeshStandardMaterial({ color: 0x33261f, flatShading: true }));
    post.position.y = 1.1;
    const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), new THREE.MeshBasicMaterial({ color: 0xffc66d }));
    lamp.position.y = 2.05;
    g.add(post, lamp);
    this.#place(g, x, z);
    this.scene.add(g);
  }

  #createFinalClearing() {
    const warm = new THREE.PointLight(0xffc96f, 18, 34, 2);
    warm.position.set(0, 10, -73);
    this.scene.add(warm);
    const frame = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8d5b2e, roughness: 0.8, flatShading: true });
    const photoMat = new THREE.MeshStandardMaterial({ color: 0xd8cbb2, emissive: 0x3a2d20, side: THREE.DoubleSide });
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2), photoMat);
    photo.position.z = 0.05;
    frame.add(photo);
    for (const [x, y, sx, sy] of [[0,1.12,3.25,.18],[0,-1.12,3.25,.18],[-1.54,0,.18,2.1],[1.54,0,.18,2.1]]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, .2), frameMat);
      edge.position.set(x,y,0);
      frame.add(edge);
    }
    this.#place(frame, 0, -73, 2.35);
    frame.userData = { kind: 'final', label: 'Открыть письмо', photo };
    this.finalFrame = frame;
    this.interactables.push(frame);
    this.scene.add(frame);
    this.loadFinalPhoto(GAME_CONFIG.photoPath);

    const flowerGeo = new THREE.ConeGeometry(0.12, 0.35, 5);
    const flowers = new THREE.InstancedMesh(flowerGeo, new THREE.MeshStandardMaterial({ color: 0xe9be67, emissive: 0x6b4515, flatShading: true }), 120);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 120; i++) {
      const angle = this.random() * Math.PI * 2;
      const radius = 3 + this.random() * 12;
      const x = Math.cos(angle) * radius;
      const z = -73 + Math.sin(angle) * radius;
      dummy.position.set(x, this.heightAt(x,z) + .18, z);
      dummy.rotation.z = (this.random() - .5) * .3;
      dummy.updateMatrix();
      flowers.setMatrixAt(i, dummy.matrix);
    }
    this.flowers = flowers;
    this.scene.add(flowers);
  }

  loadFinalPhoto(path) {
    new THREE.TextureLoader().load(path, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      this.finalFrame.userData.photo.material.map = texture;
      this.finalFrame.userData.photo.material.color.set(0xffffff);
      this.finalFrame.userData.photo.material.needsUpdate = true;
    }, undefined, () => {});
  }

  #createParticles() {
    const positions = [];
    for (let i = 0; i < 220; i++) positions.push((this.random()-.5)*110, 1+this.random()*12, (this.random()-.5)*150);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.motes = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xe9d59b, size: .08, transparent: true, opacity: .5 }));
    this.scene.add(this.motes);
  }

  #place(object, x, z, lift = 0) { object.position.set(x, this.heightAt(x,z) + lift, z); }

  nearestInteractable(position, maxDistance = 2.6) {
    let nearest = null;
    let distance = maxDistance;
    for (const item of this.interactables) {
      if (!item.visible) continue;
      const d = item.position.distanceTo(position);
      if (d < distance) { nearest = item; distance = d; }
    }
    return nearest;
  }

  isBlocked(x, z, radius = 0.36) {
    if (Math.abs(x) > 86 || Math.abs(z) > 86) return true;
    return this.colliders.some((c) => Math.hypot(x-c.x, z-c.z) < c.radius + radius);
  }

  cameraSafeDistance(origin, desired, distance) {
    let safe = distance;
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = THREE.MathUtils.lerp(origin.x, desired.x, t);
      const z = THREE.MathUtils.lerp(origin.z, desired.z, t);
      if (this.colliders.some((c) => Math.hypot(x-c.x,z-c.z) < c.radius + .3)) { safe = distance * Math.max(0.18, (i-1)/steps); break; }
    }
    return safe;
  }

  setQuality(level) {
    const grassRatio = { low: 0.3, medium: 0.62, high: 1 }[level] ?? 1;
    this.grass.count = Math.floor(GAME_CONFIG.grassCount * grassRatio);
    this.flowers.count = level === 'low' ? 60 : 120;
    this.trunks.castShadow = level !== 'low';
    this.crowns.castShadow = level === 'high';
  }

  update(delta) {
    this.time += delta;
    this.crowns.material.userData.windTime.value = this.time;
    this.grass.material.userData.windTime.value = this.time;
    this.motes.position.y = Math.sin(this.time * .25) * .35;
    for (const item of this.interactables) {
      if (item.userData.ring) {
        item.rotation.y += delta * .7;
        item.position.y += Math.sin(this.time * 2 + item.position.x) * .0015;
      }
    }
  }
}
