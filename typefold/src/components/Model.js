// src/components/Model.js
import React, { useRef } from 'react';
import { primitive } from '@react-three/fiber';

export default function Model({ gltf }) {
  const group = useRef();
  return <primitive ref={group} object={gltf.scene} />;
}
