import React, { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import Model from './Model';
import InteractionHandler from './InteractionHandler';
import UnfoldedFace from './UnfoldedFace';
import useModelLoader from '../hooks/useModelLoader';
import { unfoldModelWithEdges } from '../utils/geometryUtils';

import '../styles/TypeFold.css';

export default function TypeFold() {
  const [selectedFace, setSelectedFace] = useState(null);
    const [hoveredFace, setHoveredFace] = useState(null); // 호버 상태 관리
  const [unfoldedTexture, setUnfoldedTexture] = useState(null);
  const [fileURL, setFileURL] = useState(null);


  const fileInputRef = useRef();
  const faceMeshesRef = useRef([]);
  const gltf = useModelLoader(fileURL);

  const [unfoldCount, setUnfoldCount] = useState(0); // Unfold 버튼 클릭 횟수

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileURL(URL.createObjectURL(file));
    }
  };

  const handleUnfold = () => {
    if (unfoldCount < 1) {
      // Unfold 버튼이 처음 클릭되었을 때만 전개도 생성
      if (gltf) {
        faceMeshesRef.current = [];
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            unfoldModelWithEdges(child, faceMeshesRef, unfoldedTexture);
          }
        });
        setUnfoldCount(unfoldCount + 1);
      }
    } else {
      // 이후 클릭 시 텍스처만 업데이트
      faceMeshesRef.current.forEach((mesh) => {
        if (mesh.material.map !== unfoldedTexture) {
          mesh.material.map = unfoldedTexture;
          mesh.material.needsUpdate = true;
        }
      });
    }
  };

  const handleTextureReady = (canvas) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    setUnfoldedTexture(texture);
  };

  useEffect(() => {
    if (hoveredFace) {
      // 호버된 면을 빨간색으로 표시
      const { object } = hoveredFace;
      object.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      object.material.needsUpdate = true;
    }

    return () => {
      if (hoveredFace) {
        // 호버 상태 해제 시 원래 재질로 복구
        const { object } = hoveredFace;
        object.material = new THREE.MeshStandardMaterial(); // 원래 재질 (필요 시 수정)
        object.material.needsUpdate = true;
      }
    };
  }, [hoveredFace]);

  useEffect(() => {
    if (selectedFace && unfoldedTexture) {
      const { face, object } = selectedFace;
      const geometry = object.geometry;

      if (!geometry.attributes.uv) {
        geometry.setAttribute(
          'uv',
          new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2)
        );
      }

      const uvAttribute = geometry.attributes.uv;
      const faceIndex = face.a !== undefined ? face.a : face.faceIndex * 3;
      const uvArray = uvAttribute.array;

      uvArray[faceIndex * 2] = 0;
      uvArray[faceIndex * 2 + 1] = 0;

      uvArray[(faceIndex + 1) * 2] = 1;
      uvArray[(faceIndex + 1) * 2 + 1] = 0;

      uvArray[(faceIndex + 2) * 2] = 1;
      uvArray[(faceIndex + 2) * 2 + 1] = 1;

      uvAttribute.needsUpdate = true;

      object.material = new THREE.MeshBasicMaterial({ map: unfoldedTexture });
      object.material.needsUpdate = true;
    }
  }, [selectedFace, unfoldedTexture]);

  return (
    <div className="container">
      <div className="canvasContainer">
        <input
          type="file"
          ref={fileInputRef}
          accept=".gltf,.glb"
          onChange={handleFileChange}
          className="fileInput"
        />
        <button onClick={handleUnfold} className="unfoldButton">
          Unfold
        </button>
        <Canvas style={{ width: '100%', height: '100%' }}>
          <ambientLight intensity={3} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
          <pointLight position={[-10, -10, -10]} />
          {gltf && <Model gltf={gltf} />}
          <OrbitControls />
          <InteractionHandler
            setSelectedFace={setSelectedFace}
            setHoveredFace={setHoveredFace} // 호버 상태 업데이트
          />
        </Canvas>
      </div>
      <div id="unfoldedCanvas" className="unfoldedCanvas">
        <UnfoldedFace onTextureReady={handleTextureReady} />
      </div>
    </div>
  );
}
