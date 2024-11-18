// src/components/UnfoldedFace.js

import React from 'react';
import Sketch from 'react-p5';

export default function UnfoldedFace({ onTextureReady }) {
  const setup = (p5, canvasParentRef) => {
    const canvas = p5.createCanvas(512, 512);
    canvas.parent(canvasParentRef);
    p5.background(255);
  };

  const draw = (p5) => {
    if (p5.mouseIsPressed) {
      p5.stroke(0);
      p5.strokeWeight(4);
      p5.line(p5.pmouseX, p5.pmouseY, p5.mouseX, p5.mouseY);
    }

    if (onTextureReady) {
      onTextureReady(p5.canvas);
    }
  };

  return <Sketch setup={setup} draw={draw} />;
}
