import React, { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';

import Model from './Model';
import InteractionHandler from './InteractionHandler';
import UnfoldedFace from './UnfoldedFace';
import useModelLoader from '../hooks/useModelLoader';
import { unfoldModelWithEdges, prepareFaceGroupsForP5 } from '../utils/geometryUtils';
import FaceGroupsRenderer from './FaceGroupRenderer';

import '../styles/TypeFold.css';

export default function TypeFold() {
  const [selectedFace, setSelectedFace] = useState(null);
  const [projectedVertices, setProjectedVertices] = useState([]);
  const [unfoldedTexture, setUnfoldedTexture] = useState(null);
  const [faceGroups, setFaceGroups] = useState([]); // 추가된 상태

  const fileInputRef = useRef();
  const faceMeshesRef = useRef([]);
  const hasUnfolded = useRef(false);

  const [fileURL, setFileURL] = useState(null);

  const gltf = useModelLoader(fileURL);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileURL(URL.createObjectURL(file));
    }
  };

  const handleUnfold = () => {
    if (gltf) {
      faceMeshesRef.current = [];
      let faceGroupsData = null;
  
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          faceGroupsData = unfoldModelWithEdges(child, faceMeshesRef, unfoldedTexture);
        }
      });
  
      if (faceGroupsData) {
        setFaceGroups(faceGroupsData); // faceGroups2D를 상태로 저장
      }
      hasUnfolded.current = true;
    }
  };


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
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
          <pointLight position={[-10, -10, -10]} />
          {gltf && <Model gltf={gltf} />}
          <InteractionHandler faceMeshesRef={faceMeshesRef} setSelectedFace={setSelectedFace} />
          <OrbitControls />
        </Canvas>
      </div>
      <div id="unfoldedCanvas" className="unfoldedCanvas">
        {faceGroups.length > 0 && (
          <FaceGroupsRenderer faceGroups={faceGroups} />
        )}
      </div>
    </div>
  );
}
