import * as THREE from 'three';
import { Character } from './character.js';
import { AssetNames } from '../utils/constants.js';

export class Npc extends Character {
    constructor(dialogue, position = new THREE.Vector3(-5, 0.5, -5), game, options = {}) {
        const model = game.assetLoader.getAsset(AssetNames.NPC_MODEL);
        if (model) {
            super(game, model.clone(), null, { modelName: AssetNames.NPC_MODEL, textureName: AssetNames.NPC_TEXTURE });
        } else {
            const geometry = new THREE.CapsuleGeometry(0.4, 1.0, 4, 8);
            const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
            super(game, geometry, material, {});
        }

        this.dialogue = dialogue;

        this.placeOnGround(position.x, position.z);

        this.interactionPrompt = this.createInteractionPrompt();
        this.mesh.add(this.interactionPrompt);
    }

    createInteractionPrompt() {
        const prompt = new THREE.Group();
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const fontSize = 32;
        context.font = `Bold ${fontSize}px Arial`;
        const text = '[E] Talk';
        const textWidth = context.measureText(text).width;

        canvas.width = textWidth + 10;
        canvas.height = fontSize + 10;

        context.font = `Bold ${fontSize}px Arial`;
        context.fillStyle = "white";
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        const texture = new THREE.CanvasTexture(canvas);

        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(canvas.width * 0.01, canvas.height * 0.01, 1);
        sprite.position.y = 3.0;
        sprite.renderOrder = 999;
        prompt.add(sprite);
        prompt.visible = false;
        return prompt;
    }

    update(playerPosition) {
        const distance = this.mesh.position.distanceTo(playerPosition);
        const interactionRange = this.game.data.enemies.npc.interactionRange;
        this.interactionPrompt.visible = distance < interactionRange;
    }

    interact() {
        this.game.dialogBox.show(this.dialogue);
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