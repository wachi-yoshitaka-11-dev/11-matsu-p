import * as THREE from 'three';
import { Light } from '../world/light.js';
import { SkyTypes, DefaultSkyColors } from '../utils/constants.js';

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

    // Bind once and store for proper cleanup
    this._onResize = this.onWindowResize.bind(this);

    this.init();
  }

  init() {
    this.camera.position.z = 5;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.domElement.setAttribute('tabindex', '0');
    this.renderer.domElement.classList.add('hidden');
    document.body.appendChild(this.renderer.domElement);

    // Set default sky color
    this.setDefaultSkyColor();

    window.addEventListener('resize', this._onResize, false);
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
    this.renderer.domElement.classList.remove('hidden');
    this.renderer.domElement.classList.add('visible');
  }

  hideCanvas() {
    this.renderer.domElement.classList.add('hidden');
  }

  fadeOutCanvas(duration = 1000, callback) {
    this.renderer.domElement.style.transition = `opacity ${duration}ms ease-out`;
    this.renderer.domElement.classList.add('transparent');
    this.renderer.domElement.classList.remove('opaque');

    setTimeout(() => {
      this.renderer.domElement.classList.add('hidden');
      this.renderer.domElement.style.transition = '';
      this.renderer.domElement.classList.remove('transparent');
      this.renderer.domElement.classList.add('opaque');
      if (callback) callback();
    }, duration);
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
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

  /**
   * Set the default sky color
   */
  setDefaultSkyColor() {
    this.scene.background = new THREE.Color(DefaultSkyColors.DEFAULT);
  }

  /**
   * Set sky color from hex string or number
   * @param {string|number} color - Color in hex format (e.g., "#87CEEB" or 0x87ceeb)
   */
  setSkyColor(color) {
    this.scene.background = new THREE.Color(color);
  }

  /**
   * Set sky gradient (creates a gradient background)
   * @param {string|number} topColor - Top color of gradient
   * @param {string|number} bottomColor - Bottom color of gradient
   */
  setSkyGradient(topColor, bottomColor) {
    // Create a gradient texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');

    // Create gradient
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(
      0,
      typeof topColor === 'string'
        ? topColor
        : `#${topColor.toString(16).padStart(6, '0')}`
    );
    gradient.addColorStop(
      1,
      typeof bottomColor === 'string'
        ? bottomColor
        : `#${bottomColor.toString(16).padStart(6, '0')}`
    );

    // Fill canvas with gradient
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Create texture and set as background
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  /**
   * Set sky configuration from stage data
   * @param {Object} skyConfig - Sky configuration object
   */
  setSkyFromConfig(skyConfig) {
    if (!skyConfig) {
      this.setDefaultSkyColor();
      return;
    }

    switch (skyConfig.type) {
      case SkyTypes.COLOR:
        this.setSkyColor(skyConfig.color || DefaultSkyColors.DEFAULT);
        break;
      case SkyTypes.GRADIENT:
        this.setSkyGradient(
          skyConfig.gradientTop ||
            skyConfig.color ||
            DefaultSkyColors.GRADIENT_TOP,
          skyConfig.gradientBottom ||
            skyConfig.color ||
            DefaultSkyColors.GRADIENT_BOTTOM
        );
        break;
      default:
        // Default to color if type is not specified
        this.setSkyColor(skyConfig.color || DefaultSkyColors.DEFAULT);
        break;
    }
  }
}
