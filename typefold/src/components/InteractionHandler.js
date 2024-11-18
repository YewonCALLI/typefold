import { useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

export default function InteractionHandler({ setSelectedFace, setHoveredFace }) {
  const { camera, scene, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  const handlePointerMove = (event) => {
    const rect = gl.domElement.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
    raycaster.current.setFromCamera(mouse.current, camera);
    const intersects = raycaster.current.intersectObjects(scene.children, true);
  
    if (intersects.length > 0) {
      const intersect = intersects[0];
      setHoveredFace(intersect); // 정상적으로 호출
    } else {
      setHoveredFace(null); // 호버 해제
    }
  };
  
  const handlePointerDown = (event) => {
    const rect = gl.domElement.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, camera);
    const intersects = raycaster.current.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      setSelectedFace(intersect);
    }
  };

  gl.domElement.addEventListener('pointermove', handlePointerMove);
  gl.domElement.addEventListener('pointerdown', handlePointerDown);

  return null;
}
