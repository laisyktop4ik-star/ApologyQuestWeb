import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class AssetManager {
  constructor(){this.manager=new THREE.LoadingManager();this.gltf=new GLTFLoader(this.manager);this.textures=new THREE.TextureLoader(this.manager);this.cache=new Map()}
  async loadGLTF(path){if(this.cache.has(path))return this.cache.get(path);const value=await this.gltf.loadAsync(path);this.cache.set(path,value);return value}
  async loadTexture(path,{pixelated=true}={}){if(this.cache.has(path))return this.cache.get(path);const texture=await this.textures.loadAsync(path);texture.colorSpace=THREE.SRGBColorSpace;if(pixelated){texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestMipmapNearestFilter}this.cache.set(path,texture);return texture}
  dispose(){for(const value of this.cache.values()){if(value?.isTexture)value.dispose()}this.cache.clear()}
}
