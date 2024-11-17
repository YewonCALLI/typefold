// src/components/TypeFold.js

import React, { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';

import Model from './Model';
import InteractionHandler from './InteractionHandler';
import UnfoldedFace from './UnfoldedFace';
import useModelLoader from '../hooks/useModelLoader';
import { unfoldModelWithEdges } from '../utils/geometryUtils';

import '../styles/TypeFold.css';

export default function TypeFold() {
  const [selectedFace, setSelectedFace] = useState(null);
  const [projectedVertices, setProjectedVertices] = useState([]);
  const [unfoldedTexture, setUnfoldedTexture] = useState(null);

  const [uMin, setUMin] = useState(0);
  const [uMax, setUMax] = useState(0);
  const [vMin, setVMin] = useState(0);
  const [vMax, setVMax] = useState(0);

  const fileInputRef = useRef();
  const faceMeshesRef = useRef([]);
  const hasUnfolded = useRef(false);

  const [fileURL, setFileURL] = useState(null);
  const gltf = useModelLoader(fileURL);

  useEffect(() => {
    if (selectedFace) {
      const positions = selectedFace.geometry.attributes.position.array;
      const vertices = [];
      for (let i = 0; i < positions.length; i += 3) {
        const vertex = new THREE.Vector3(
          positions[i],
          positions[i + 1],
          positions[i + 2]
        );
        vertices.push(vertex);
      }

      // Vertex projection logic
      const v0 = vertices[0];
      const v1 = vertices[1];
      const v2 = vertices[2];

      const edge1 = new THREE.Vector3().subVectors(v1, v0);
      const edge2 = new THREE.Vector3().subVectors(v2, v0);

      const normal = new THREE.Vector3()
        .crossVectors(edge1, edge2)
        .normalize();

      const uAxis = edge1.clone().normalize();
      const vAxis = new THREE.Vector3().crossVectors(normal, uAxis);

      const projected = vertices.map((vertex) => {
        const relativeVertex = new THREE.Vector3().subVectors(vertex, v0);
        const u = relativeVertex.dot(uAxis);
        const v = relativeVertex.dot(vAxis);
        return { u, v };
      });

      setProjectedVertices(projected);

      // Update uMin, uMax, vMin, vMax
      const uValues = projected.map((v) => v.u);
      const vValues = projected.map((v) => v.v);
      setUMin(Math.min(...uValues));
      setUMax(Math.max(...uValues));
      setVMin(Math.min(...vValues));
      setVMax(Math.max(...vValues));
    }
  }, [selectedFace]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileURL(URL.createObjectURL(file));
    }
  };

  const handleUnfold = () => {
    if (gltf) {
      faceMeshesRef.current = [];
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          unfoldModelWithEdges(child, faceMeshesRef, unfoldedTexture);
        }
      });
      hasUnfolded.current = true;
    }
  };

  const handleTextureReady = (canvas) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    setUnfoldedTexture(texture);
  };

  // Update materials when unfoldedTexture changes
  useEffect(() => {
    if (unfoldedTexture && hasUnfolded.current) {
      faceMeshesRef.current.forEach((mesh) => {
        if (mesh.material.map !== unfoldedTexture) {
          mesh.material.map = unfoldedTexture;
          mesh.material.needsUpdate = true;
        }
      });
    }
  }, [unfoldedTexture]);

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
          <spotLight
            position={[10, 10, 10]}
            angle={0.15}
            penumbra={1}
            intensity={1}
          />
          <pointLight position={[-10, -10, -10]} />
          {gltf && <Model gltf={gltf} />} {/* 3D Model */}
          <InteractionHandler
            faceMeshesRef={faceMeshesRef}
            setSelectedFace={setSelectedFace}
          />
          <OrbitControls />
        </Canvas>
      </div>
      <div id="unfoldedCanvas" className="unfoldedCanvas">
        {/* Unfolded model will be displayed here */}
        {projectedVertices.length > 0 && (
          <UnfoldedFace
            vertices={projectedVertices}
            onTextureReady={handleTextureReady}
            uMin={uMin}
            uMax={uMax}
            vMin={vMin}
            vMax={vMax}
          />
        )}
      </div>
    </div>
  );
}
