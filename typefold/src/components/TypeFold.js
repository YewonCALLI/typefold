import React, { useRef, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerspectiveCamera, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import Model from "./Model";
import InteractionHandler from "./InteractionHandler";
import UnfoldedFace from "./UnfoldedFace";
import useModelLoader from "../hooks/useModelLoader";
import { unfoldModelWithEdges } from "../utils/geometryUtils";
import CameraControl from "./CameraControl";
import ControlPanel from "./ControlPanel";

import "../styles/TypeFold.css";

export default function TypeFold() {
  const [cameraDirection, setCameraDirection] = useState("perspective"); // 카메라 방향 상태 관리
  const [zoomLevel, setZoomLevel] = useState(0); // 줌 레벨 상태 관리

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
            setCameraDirection("front");
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
          "uv",
          new THREE.BufferAttribute(
            new Float32Array(geometry.attributes.position.count * 2),
            2
          )
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
        <div className="header">
          <h1>TypoFold</h1>
        </div>
        <div className="controlContainer">
          <div className="fileInputContainer">
            <label className="fileInputLabel" for="file">
              {fileInputRef.current && fileInputRef.current.files[0]
                ? fileInputRef.current.files[0].name
                : "Choose a file"}
            </label>
            <span
              onClick={() => {
                fileInputRef.current.click();
              }}
              className="fileInput"
            >
              Upload
              <input
                type="file"
                id="file"
                ref={fileInputRef}
                accept=".gltf,.glb"
                onChange={handleFileChange}
              />
            </span>
          </div>
          <div className="unfoldButtonContainer">
            <button onClick={handleUnfold} className="unfoldButton">
              Unfold
            </button>
            <span>|</span>
            <button id="captureButton">Print</button>
          </div>
        </div>
        <ControlPanel
          setZoomLevel={setZoomLevel}
          zoomLevel={zoomLevel}
          cameraDirection={cameraDirection}
          setCameraDirection={setCameraDirection}
        />
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
          <Scene
            gltf={gltf}
            setSelectedFace={setSelectedFace}
            setHoveredFace={setHoveredFace}
          />
          <OrbitControls />
        </Canvas>
      </div>
      <div id="unfoldedCanvas" className="unfoldedCanvas">
        <UnfoldedFace onTextureReady={handleTextureReady} />
      </div>
    </div>
  );
}

const Scene = (
  { gltf, setSelectedFace, setHoveredFace } // 3D 씬
) => {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const printButton = document.getElementById("captureButton");
    printButton.addEventListener("click", () => {
      const link = document.createElement("a");
      link.setAttribute("download", "canvas.png");
      link.setAttribute(
        "href",
        gl.domElement
          .toDataURL("image/png")
          .replace("image/png", "image/octet-stream")
      );
      link.click();
    });
  }, [gl]);

  return (
    <>
      {gltf && <Model gltf={gltf} />} {/* 3D Model */}
      <InteractionHandler
        setSelectedFace={setSelectedFace}
        setHoveredFace={setHoveredFace} // 호버 상태 업데이트
      />
    </>
  );
};
