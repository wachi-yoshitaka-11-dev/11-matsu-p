import * as THREE from 'three';


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
                const newMaterial = new THREE.MeshStandardMaterial({
                    map: texture,
                });
                child.material = newMaterial;
            });
        }
    });
}