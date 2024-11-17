// src/hooks/useModelLoader.js

import { useState, useEffect } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default function useModelLoader(url) {
  const [gltf, setGltf] = useState(null);

  useEffect(() => {
    if (url) {
      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltfData) => setGltf(gltfData),
        undefined,
        (error) => console.error('Error loading GLTF:', error)
      );
    }
  }, [url]);

  return gltf;
}
