import * as THREE from 'three';

export class Npc {
    constructor(game, dialogue, position = new THREE.Vector3(-5, 0.5, -5)) {
        this.game = game;
        this.dialogue = dialogue;
        const geometry = new THREE.CapsuleGeometry(0.4, 1.0, 4, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);

        this.interactionPrompt = this.createInteractionPrompt();
        this.mesh.add(this.interactionPrompt);
    }

    createInteractionPrompt() {
        const prompt = new THREE.Group();
        // Simple text prompt using canvas texture
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const fontSize = 20;
        context.font = `Bold ${fontSize}px Arial`;
        const textWidth = context.measureText('[E] Talk').width;
        canvas.width = textWidth;
        canvas.height = fontSize;
        context.font = `Bold ${fontSize}px Arial`;
        context.fillStyle = "white";
        context.fillText('[E] Talk', 0, fontSize);
        const texture = new THREE.CanvasTexture(canvas);

        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(canvas.width / 100, canvas.height / 100, 1);
        sprite.position.y = 1.5;
        prompt.add(sprite);
        prompt.visible = false;
        return prompt;
    }

    update(playerPosition) {
        const distance = this.mesh.position.distanceTo(playerPosition);
        this.interactionPrompt.visible = distance < this.game.data.enemies.npc.INTERACTION_RANGE;
    }

    interact() {
        alert(this.dialogue);
    }

    dispose() {
        if (this.mesh.geometry) {
            this.mesh.geometry.dispose();
        }
        if (this.mesh.material) {
            this.mesh.material.dispose();
        }
        if (this.interactionPrompt) {
            const sprite = this.interactionPrompt.children[0];
            sprite?.material?.map?.dispose();
            sprite?.material?.dispose();
        }
    }
}