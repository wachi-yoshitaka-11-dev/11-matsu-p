import * as THREE from 'three';

export class Npc {
    constructor(dialogue) {
        this.dialogue = dialogue;
        const geometry = new THREE.CapsuleGeometry(0.4, 1.0, 4, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(-5, 0.5, -5);

        this.interactionPrompt = this.createInteractionPrompt();
        this.mesh.add(this.interactionPrompt);
    }

    createInteractionPrompt() {
        const prompt = new THREE.Group();
        // Simple text prompt using canvas texture
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = "Bold 20px Arial";
        context.fillStyle = "white";
        context.fillText("[E] Talk", 0, 20);
        const texture = new THREE.CanvasTexture(canvas);

        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.position.y = 1.5;
        prompt.add(sprite);
        prompt.visible = false;
        return prompt;
    }

    update(playerPosition) {
        const distance = this.mesh.position.distanceTo(playerPosition);
        this.interactionPrompt.visible = distance < 2;
    }

    interact() {
        alert(this.dialogue);
    }
}
