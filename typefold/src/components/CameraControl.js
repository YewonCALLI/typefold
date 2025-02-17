import React from "react";
import { useThree } from "@react-three/fiber";

function CameraControl({ cameraDirection }) {
  const { camera } = useThree();

  React.useEffect(() => {
    const distance = 10; // 카메라와 대상 간의 거리

    switch (cameraDirection) {
      case "perspective":
        camera.position.set(distance, distance, distance);
        camera.up.set(0, 1, 0); // 원근
        break;
      case "front":
        camera.position.set(0, 0, distance *1.5);
        camera.rotation.set(0, 0, 0);
        camera.up.set(0, 1, 1); // 앞에서 보기
        break;
      default:
        camera.position.set(distance, distance, distance);
        camera.up.set(0, 1, 0); // 원근
        break;
    }

    camera.updateProjectionMatrix();
  }, [camera, cameraDirection]);

  return null;
}

export default CameraControl;
