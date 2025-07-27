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

            const newMaterials = materials.map(material => {
                const newMaterial = new THREE.MeshStandardMaterial({
                    map: texture,
                });
                return newMaterial;
            });
            child.material = Array.isArray(child.material) ? newMaterials : newMaterials[0];
        }
    });
}