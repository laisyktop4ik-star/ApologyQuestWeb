import * as THREE from 'three';

export class RendererSystem {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.quality = 'high';
    this.resize();
  }
  setQuality(level) {
    this.quality = level;
    const ratios = { low: 0.45, medium: 0.65, high: 0.85 };
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio * ratios[level], 1));
    this.renderer.shadowMap.enabled = level !== 'low';
    this.resize();
  }
  resize() {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth || innerWidth;
    const height = canvas.clientHeight || innerHeight;
    this.renderer.setSize(width, height, false);
  }
  render(scene, camera) { this.renderer.render(scene, camera); }
}
