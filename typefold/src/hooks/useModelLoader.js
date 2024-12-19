// useModelLoader.js

import { useEffect, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const useModelLoader = (fileURL) => {
  const [gltf, setGltf] = useState(null);

  useEffect(() => {
    if (!fileURL) {
      setGltf(null); 
      return;
    }

    const loader = new GLTFLoader();
    loader.load(
      fileURL,
      (loadedGltf) => {
        setGltf(loadedGltf);
      },
      undefined,
      (error) => {
        console.error("Error loading model:", error);
        setGltf(null);
      }
    );
  }, [fileURL]);

  return gltf;
};

export default useModelLoader;
