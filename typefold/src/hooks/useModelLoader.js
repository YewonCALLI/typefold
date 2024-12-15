import { useEffect, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const useModelLoader = (fileURL) => {
  const [gltf, setGltf] = useState(null);

  useEffect(() => {
    if (!fileURL) {
      setGltf(null); // 경로가 없으면 GLTF 초기화
      return;
    }

    const loader = new GLTFLoader();
    loader.load(
      fileURL,
      (loadedGltf) => {
        setGltf(loadedGltf); // 성공적으로 로드되었을 때만 설정
      },
      undefined,
      (error) => {
        console.error("Error loading model:", error);
        setGltf(null); // 로드 실패 시 초기화
      }
    );
  }, [fileURL]);

  return gltf;
};

export default useModelLoader;
