import React from "react";
import { useThree } from "@react-three/fiber";

function CameraControl({ cameraDirection, zoomLevel }) {
  const { camera } = useThree();

  React.useEffect(() => {
    const distance = 10; // 카메라와 대상 간의 거리

    switch (cameraDirection) {
      case "perspective":
        camera.position.set(
          distance + zoomLevel,
          distance + zoomLevel,
          distance + zoomLevel
        );
        camera.up.set(0, 1, 0); // 원근
        break;
      case "front":
        camera.position.set(0, 0, distance * 5.5 + zoomLevel);
        camera.rotation.set(0, 0, 0);
        camera.up.set(0, 1, 1); // 앞에서 보기
        break;
      default:
        camera.position.set(
          distance + zoomLevel,
          distance + zoomLevel,
          distance + zoomLevel
        );
        camera.up.set(0, 1, 0); // 원근
        break;
    }

    camera.lookAt(0, 0, 0); // 항상 중심을 바라봄
    camera.updateProjectionMatrix();
  }, [camera, cameraDirection, zoomLevel]);

  return null;
}

export default CameraControl;
