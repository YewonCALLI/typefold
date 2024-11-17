import React from 'react';
import Sketch from 'react-p5';

function FaceGroupsRenderer({ faceGroups }) {
  const setup = (p5, canvasParentRef) => {
    const canvas = p5.createCanvas(p5.windowWidth, p5.windowHeight);
    canvas.parent(canvasParentRef);
    p5.noLoop(); // 한 번만 그리기
  };

  const draw = (p5) => {
    p5.background(255);
    p5.stroke(0);

    if (!faceGroups || faceGroups.length === 0) {
      console.warn("No faceGroups to render!");
      return;
    }

    // 스케일 및 위치 조정
    const scaleFactor = 200; // 필요에 따라 조정
    const offsetX = p5.width / 2;
    const offsetY = p5.height / 2;

    faceGroups.forEach((group, groupIndex) => {
      // 그룹별 색상 지정
      p5.fill((groupIndex * 50) % 255, 100, 200);

      group.forEach((face) => {
        p5.beginShape();
        face.forEach((vertex) => {
          const x = vertex.u * scaleFactor + offsetX;
          const y = vertex.v * scaleFactor + offsetY;
          p5.vertex(x, y);
        });
        p5.endShape(p5.CLOSE);
      });
    });
  };

  return <Sketch setup={setup} draw={draw} />;
}

export default FaceGroupsRenderer;
