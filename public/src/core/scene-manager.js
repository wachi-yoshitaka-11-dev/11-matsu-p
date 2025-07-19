// src/core/SceneManager.js

import * as THREE from 'three';

export class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });

        this.init();
    }

    init() {
        this.camera.position.z = 5;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.domElement.setAttribute('tabindex', '0');
        document.body.appendChild(this.renderer.domElement);

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(1, 1, 1).normalize();
        this.scene.add(light);

        const ambientLight = new THREE.AmbientLight(0x404040, 2); // soft white light
        this.scene.add(ambientLight);

        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue

        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        this.renderer.dispose();
    }
}