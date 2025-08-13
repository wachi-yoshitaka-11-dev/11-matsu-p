import * as THREE from 'three';
import { Character } from './character.js';
import { localization } from '../../utils/localization.js';

export class Npc extends Character {
  static PROMPT_SCALE_FACTOR = 0.01;
  static PROMPT_Y_OFFSET = 3.0;

  static createPromptTexture() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontSize = 32;
    const text = localization.getText('interactions.talkPrompt');
    context.font = `Bold ${fontSize}px Arial`;
    const textWidth = context.measureText(text).width;

    canvas.width = textWidth + 10;
    canvas.height = fontSize + 10;

    context.font = `Bold ${fontSize}px Arial`;
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    return { texture: new THREE.CanvasTexture(canvas), canvas: canvas };
  }

  constructor(game, npcId, position, options = {}) {
    const npcData = game.data.npcs[npcId];
    if (!npcData) {
      throw new Error(`NPC ID "${npcId}" not found in npcs data`);
    }
    const modelName = npcData.model.replace('.glb', '');
    const model = game.assetLoader.getModel(modelName);
    if (model) {
      super(game, npcId, npcData, model.clone(), null, {
        modelName: modelName,
        textureName: npcData.texture.replace('.png', ''),
      });
    } else {
      const geometry = new THREE.CapsuleGeometry(0.4, 1.0, 4, 8);
      const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
      super(game, npcId, npcData, geometry, material, {});
    }

    this.dialogue = npcData.dialogue || ['...'];
    this.currentDialogueIndex = 0;

    this.placeOnGround(position.x, position.z);

    this.interactionPrompt = this.createInteractionPrompt();
    this.mesh.add(this.interactionPrompt);
  }

  createInteractionPrompt() {
    const prompt = new THREE.Group();
    const { texture, canvas } = Npc.createPromptTexture();

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(
      canvas.width * Npc.PROMPT_SCALE_FACTOR,
      canvas.height * Npc.PROMPT_SCALE_FACTOR,
      1
    );
    sprite.position.y = Npc.PROMPT_Y_OFFSET;
    sprite.renderOrder = 999;
    prompt.add(sprite);
    prompt.visible = false;
    return prompt;
  }

  update(deltaTime) {
    // 親クラスの更新処理を呼び出し（物理演算、アニメーション等）
    super.update(deltaTime);

    if (!this.data || !this.game.player) return;
    const distance = this.mesh.position.distanceTo(
      this.game.player.mesh.position
    );
    const interactionRange = this.data.interactionRange;
    this.interactionPrompt.visible = distance < interactionRange;
  }

  interact() {
    if (!this.game.dialogBox || !this.data || !this.dialogue) return;
    const currentLine = this.dialogue[this.currentDialogueIndex];
    this.game.dialogBox.show(currentLine);

    this.currentDialogueIndex =
      (this.currentDialogueIndex + 1) % this.dialogue.length;
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
    this.currentDialogueIndex = 0;
    this.dialogue = null;
    this.data = null;
  }
}
