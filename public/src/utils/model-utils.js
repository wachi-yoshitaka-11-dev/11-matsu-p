import * as THREE from 'three';

/**
 * Applies a given texture to all MeshStandardMaterial or MeshBasicMaterial instances within an Object3D.
 * If a material does not have a map property, a warning is logged.
 * @param {THREE.Object3D} object The object to apply the texture to.
 * @param {THREE.Texture} texture The texture to apply.
 */
export function applyTextureToObject(object, texture) {
    if (!object || !texture) {
        console.warn('applyTextureToObject: Invalid object or texture provided.');
        return;
    }

    object.traverse((child) => {
        if (child.isMesh) {
            // Ensure material is an array for multi-material objects
            const materials = Array.isArray(child.material) ? child.material : [child.material];

            materials.forEach(material => {
                // Create a new MeshStandardMaterial with the loaded texture
                const newMaterial = new THREE.MeshStandardMaterial({
                    map: texture,
                    // Preserve other material properties if needed, e.g., color, roughness, metalness
                    // For now, we'll just set the map
                });
                child.material = newMaterial;
            });
        }
    });
}
