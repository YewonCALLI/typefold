// TypeFold.js

import React, { useRef, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  PerspectiveCamera,
  OrbitControls,
  MapControls,
} from "@react-three/drei";
import * as THREE from "three";
import { Link } from "react-router-dom";

import Model from "./Model";
import InteractionHandler from "./InteractionHandler";
import UnfoldedFace from "./UnfoldedFace";
import useModelLoader from "../hooks/useModelLoader";
import { unfoldModelWithEdges, createFaceGroups } from "../utils/geometryUtils";
import CameraControl from "./CameraControl";
import ControlPanel from "./ControlPanel";

import "../styles/TypeFold.css";
import { AxesHelper } from "three";

export default function TypeFold() {
  const [cameraDirection, setCameraDirection] = useState("perspective"); // 카메라 방향 상태 관리
  const [faceGroups, setFaceGroups] = useState(null);
  const [groupedGeometry, setGroupedGeometry] = useState(null);

  const alphabets = [
      {
        "type": "A",
        "path": "./models/a.gltf"
      },
      {
        "type": "B",
        "path": "./models/b.gltf"
      },
      {
        "type": "C",
        "path": "./models/c.gltf"
      },
      {
        "type": "D",
        "path": "./models/d.gltf"
      },
      {
        "type": "E",
        "path": "./models/e.gltf"
      },
      {
        "type": "F",
        "path": "./models/f.gltf"
      },
      {
        "type": "G",
        "path": "./models/g.gltf"
      },
      {
        "type": "H",
        "path": "./models/h.gltf"
      },
      {
        "type": "I",
        "path": "./models/i.gltf"
      },
      {
        "type": "J",
        "path": "./models/j.gltf"
      },
      {
        "type": "K",
        "path": "./models/k.gltf"
      },
      {
        "type": "L",
        "path": "./models/l.gltf"
      },
      {
        "type": "M",
        "path": "./models/m.gltf"
      },
      {
        "type": "N",
        "path": "./models/n.gltf"
      },
      {
        "type": "O",
        "path": "./models/o.gltf"
      },
      {
        "type": "P",
        "path": "./models/p.gltf"
      },
      {
        "type": "Q",
        "path": "./models/q.gltf"
      },
      {
        "type": "R",
        "path": "./models/r.gltf"
      },
      {
        "type": "S",
        "path": "./models/s.gltf"
      },
      {
        "type": "T",
        "path": "./models/t.gltf"
      },
      {
        "type": "U",
        "path": "./models/u.gltf"
      },
      {
        "type": "V",
        "path": "./models/v.gltf"
      },
      {
        "type": "W",
        "path": "./models/w.gltf"
      },
      {
        "type": "X",
        "path": "./models/x.gltf"
      },
      {
        "type": "Y",
        "path": "./models/y.gltf"
      },
      {
        "type": "Z",
        "path": "./models/z.gltf"
      }
  
  ];

  const [unfoldedTexture, setUnfoldedTexture] = useState(null);
  const [fileURL, setFileURL] = useState(null);

  const [currentType, setCurrentType] = useState(null);

  const faceMeshesRef = useRef([]);
  const gltf = useModelLoader(fileURL);

  const [unfoldCount, setUnfoldCount] = useState(0); // Unfold 버튼 클릭 횟수

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
    if (gltf && unfoldedTexture) {
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          const { faceGroups: groups, geometry } = createFaceGroups(child);
          setFaceGroups(groups);
          setGroupedGeometry(geometry);
          
          child.geometry = geometry;
          child.material = new THREE.MeshBasicMaterial({
            map: unfoldedTexture,
            side: THREE.DoubleSide
          });
          
          child.material.needsUpdate = true;
        }
      });
    }
  }, [gltf, unfoldedTexture]);

  //메쉬 초기화
  const resetMeshes = () => {
    faceMeshesRef.current.forEach((mesh) => {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
    });
    faceMeshesRef.current = [];
  };

  const handleResetToInitialState = () => {
    if (!fileURL) return;

    // 기존 메쉬 제거
    faceMeshesRef.current.forEach((mesh) => {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
    });
    faceMeshesRef.current = [];

    // 상태 초기화
    setUnfoldCount(0);
    setUnfoldedTexture(null);
    setCameraDirection("perspective");

    // 강제로 상태 갱신
    setFileURL(null); // 잠시 null로 설정
    setTimeout(() => {
      setFileURL(
        alphabets.find((alphabet) => alphabet.type === currentType.type).path
      ); // 동일한 경로 재설정
      console.log("Model reloaded:", alphabets[0].path);
    }, 0);
  };

  useEffect(() => {
    if (fileURL) {
      // 이전 메쉬 제거
      resetMeshes();
      setCameraDirection("perspective"); // 카메라 방향 초기화
      setUnfoldCount(0); // Unfold 버튼 상태 초기화
    }
  }, [fileURL]);

  return (
    <div className="container">
      <div className="header">
        <Link
          className="title"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          TypoFold
        </Link>
        <Link
          className="aboutButton"
          onClick={() => {
            window.location.href = "/about";
          }}
        >
          About Project
        </Link>
      </div>
      <div className="canvasContainer">
        <div className="controlContainer">
          <div className="instruction">
            Choose an alphabet!
          </div>
          <div className="fileInputContainer">
            {alphabets.map((alphabet) => (
              <button
                style={
                  fileURL === alphabet.path
                    ? {
                        backgroundColor: "#000",
                        color: "#fff",
                      }
                    : {}
                }
                className="fileButton"
                onClick={() => {
                  if (currentType?.type === alphabet.type) {
                    // 같은 알파벳 선택 시 강제 리로드
                    setFileURL(null); // 경로 초기화
                    setTimeout(() => setFileURL(alphabet.path), 0);
                  } else {
                    setCurrentType(alphabet);
                    setFileURL(alphabet.path);
                  }
                }}
              >
                {alphabet.type}
              </button>
            ))}
          </div>
        </div>
        <ControlPanel
          cameraDirection={cameraDirection}
          onHandlePerspective={() => {
            handleResetToInitialState();
          }}
          onHandleFront={() => {
            setCameraDirection("front");
            handleUnfold();
          }}
        >
          <button id="captureButton" className="controlButton">
            Print 🖨️
          </button>
        </ControlPanel>
        <Canvas
          style={{ width: "100%", height: "100%" }}
          gl={{ 
            preserveDrawingBuffer: true,
            antialias: true,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 0.8 // 노출 감소
           }} // 캡쳐 기능을 위한 설정
        >
          <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={10} />
          <CameraControl cameraDirection={cameraDirection} />
          <ambientLight intensity={0.7} color="#e0e0ff" />
          <spotLight
            position={[10, 10, 10]}
            angle={0.15}
            penumbra={1}
            intensity={7.6} 
            color="#fff9f0" 
          />
          <pointLight position={[0, 0, 0]} intensity={0.4} color="#e0f0ff" />
        
        
          <Scene
            gltf={gltf}
          />
          {cameraDirection === "perspective" ? (
            <OrbitControls />
          ) : (
            <MapControls enableDamping={false} enableRotate={false} />
            // <OrbitControls />
          )}
        </Canvas>
      </div>
      <div id="unfoldedCanvas" className="unfoldedCanvas">
      <UnfoldedFace 
        onTextureReady={handleTextureReady} 
        faceSize={faceGroups ? faceGroups[0].size : null} 
      />
      </div>
    </div>
  );
}

const Scene = (
  { gltf} // 3D 씬
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
    </>
  );
};