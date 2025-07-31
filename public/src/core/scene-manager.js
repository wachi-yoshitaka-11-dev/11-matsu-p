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
    this._defaultCamera = this.camera; // デフォルトカメラを保存
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.light = new Light(this.scene);
    this._gameElements = []; // ゲーム要素を保存する配列

    this.init();
  }

  init() {
    this.camera.position.z = 5;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.domElement.setAttribute('tabindex', '0');
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
    const index = this._gameElements.indexOf(object);
    if (index !== -1) {
      this._gameElements.splice(index, 1);
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.dispose();
  }

  setCamera(newCamera) {
    if (!newCamera || !newCamera.isCamera) {
      console.warn('SceneManager.setCamera: Invalid camera provided');
      return;
    }
    this.camera = newCamera;
  }

  resetCamera() {
    this.camera = this._defaultCamera;
  }

  hideGameElements() {
    this._gameElements.forEach(element => {
      element.visible = false;
    });
  }

  restoreGameElements() {
    this._gameElements.forEach(element => {
      element.visible = true;
    });
  }
}
