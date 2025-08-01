import * as THREE from 'three';
import { Light } from '../world/light.js';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this._defaultCamera = this.camera;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.light = new Light(this.scene);
    this._gameElements = [];

    this.init();
  }

  init() {
    this.camera.position.z = 5;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.domElement.setAttribute('tabindex', '0');
    this.renderer.domElement.style.display = 'none';
    document.body.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x87ceeb);

    window.addEventListener('resize', this.onWindowResize.bind(this), false);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  add(object) {
    this.scene.add(object);
    this._gameElements.push(object);
  }

  remove(object) {
    this.scene.remove(object);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  showCanvas() {
    this.renderer.domElement.style.display = 'block';
  }

  hideCanvas() {
    this.renderer.domElement.style.display = 'none';
  }

  fadeOutCanvas(duration = 1000, callback) {
    this.renderer.domElement.style.transition = `opacity ${duration}ms ease-out`;
    this.renderer.domElement.style.opacity = '0';

    setTimeout(() => {
      this.renderer.domElement.style.display = 'none';
      this.renderer.domElement.style.transition = '';
      this.renderer.domElement.style.opacity = '1';
      if (callback) callback();
    }, duration);
  }

  dispose() {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.dispose();
  }

  setCamera(newCamera) {
    this.camera = newCamera;
  }

  resetCamera() {
    this.camera = this._defaultCamera;
  }

  hideGameElements() {
    this._gameElements.forEach((element) => {
      element.visible = false;
    });
  }

  restoreGameElements() {
    this._gameElements.forEach((element) => {
      element.visible = true;
    });
  }
}
