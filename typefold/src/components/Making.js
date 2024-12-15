import React, { useRef, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  PerspectiveCamera,
  OrbitControls,
  Box,
  Center,
  Text3D,
} from "@react-three/drei";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";

import CameraControl from "./CameraControl";
import ControlPanel from "./ControlPanel";

import "../styles/TypeFold.css";

export default function Making() {
  const [cameraDirection, setCameraDirection] = useState("perspective"); // 카메라 방향 상태 관리
  const [zoomLevel, setZoomLevel] = useState(0); // 줌 레벨 상태 관리

  const fileInputRef = useRef();

  const handleFileChange = (event) => {};

  const sceneRef = useRef();

  return (
    <>
      <div className="container">
        <div className="canvasContainer">
          {/* <input
            type="file"
            ref={fileInputRef}
            accept=".gltf,.glb"
            onChange={handleFileChange}
            className="fileInput"
          /> */}
          <ExportButton sceneRef={sceneRef} />
          <Canvas
            style={{ width: "100%", height: "100%" }}
            gl={{ preserveDrawingBuffer: true }} // 캡쳐 기능을 위한 설정
          >
            <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={10} />
            <CameraControl
              cameraDirection={cameraDirection}
              zoomLevel={zoomLevel}
            />
            <ambientLight intensity={2} />
            <spotLight
              position={[10, 10, 10]}
              angle={0.15}
              penumbra={1}
              intensity={1}
            />
            <pointLight position={[-10, -10, -10]} />
            {/* 씬 전체를 참조할 수 있도록 group으로 묶음 */}
            <group ref={sceneRef}>
              <TextScene />
            </group>
            <OrbitControls />
          </Canvas>
        </div>
      </div>
    </>
  );
}

const ExportButton = ({ sceneRef }) => {
  const exportScene = () => {
    if (!sceneRef.current) return;

    const exporter = new GLTFExporter();
    exporter.parse(
      sceneRef.current, // 씬 또는 특정 객체
      (gltf) => {
        const blob = new Blob([JSON.stringify(gltf)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);

        // 다운로드 링크 생성
        const link = document.createElement("a");
        link.href = url;
        link.download = "scene.gltf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log("GLTF Export Complete");
      },
      { binary: false } // true로 설정하면 GLB 형식으로 저장
    );
  };

  return (
    <button
      onClick={exportScene}
      style={{ position: "absolute", top: "10px", left: "10px", zIndex: 100 }}
    >
      Export GLTF
    </button>
  );
};

function TextScene() {
  const meshRef = useRef();

  return (
    <Center scale={[1, 1, 1]}>
      <Text3D
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1, 1, 1]}
        ref={meshRef}
        size={1}
        font={"/jost.json"}
        curveSegments={24}
        brevelSegments={0}
        bevelEnabled
        bevelSize={0}
        bevelThickness={0}
        height={0.5}
        lineHeight={0}
        letterSpacing={0}
      >
        {`A`}
        <meshStandardMaterial color="orange" />
      </Text3D>
    </Center>
  );
}
