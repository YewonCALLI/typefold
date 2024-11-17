// src/components/InteractionHandler.js

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function InteractionHandler({ faceMeshesRef, setSelectedFace }) {
  const { gl, camera } = useThree();

  useEffect(() => {
    const handlePointerDown = (event) => {
      const mouse = new THREE.Vector2();
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(faceMeshesRef.current);
      if (intersects.length > 0) {
        const intersectedFaceMesh = intersects[0].object;
        setSelectedFace(intersectedFaceMesh);
      }
    };

    gl.domElement.addEventListener('pointerdown', handlePointerDown);
    return () => {
      gl.domElement.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [gl, camera, faceMeshesRef, setSelectedFace]);

  return null;
}
