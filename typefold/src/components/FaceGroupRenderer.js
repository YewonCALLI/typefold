import React from 'react';
import Sketch from 'react-p5';

// computeGroupBoundary 함수 정의
function computeGroupBoundary(group) {
  const edges = new Map();

  group.forEach((face, faceIndex) => {
    console.log(`Processing face ${faceIndex}:`, face);

    for (let i = 0; i < 3; i++) {
      const start = face[i];
      const end = face[(i + 1) % 3];

      const key = `${start.u},${start.v}-${end.u},${end.v}`;
      const reverseKey = `${end.u},${end.v}-${start.u},${start.v}`;

      // 공유 엣지 처리
      if (edges.has(reverseKey)) {
        console.log("Removing shared edge:", reverseKey);
        edges.delete(reverseKey);
      } else {
        console.log("Adding edge:", key);
        edges.set(key, [start, end]);
      }
    }
  });

  console.log("Remaining edges after processing:", [...edges.values()]);

  // 외곽선을 계산
  const boundary = [];
  if (edges.size > 0) {
    let [start, end] = edges.values().next().value;
    boundary.push(start);

    while (edges.size > 0) {
      const nextEdge = [...edges.values()].find(([s]) => s.u === end.u && s.v === end.v);
      if (!nextEdge) break;

      [start, end] = nextEdge;
      boundary.push(start);
      edges.delete(`${start.u},${start.v}-${end.u},${end.v}`);
    }
  }

  console.log("Computed boundary:", boundary);
  return boundary;
}



// FaceGroupsRenderer 컴포넌트
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
  
    const scaleFactor = 200;
    const offsetX = p5.width / 2;
    const offsetY = p5.height / 2;
  
    faceGroups.forEach((group, groupIndex) => {
      p5.fill((groupIndex * 50) % 255, 100, 200);
  
      const boundary = computeGroupBoundary(group);
  
      // Boundary 디버깅용 로그
      console.log(`Rendering boundary for group ${groupIndex}:`, boundary);
  
      p5.beginShape();
      boundary.forEach((vertex) => {
        const x = vertex.u * scaleFactor + offsetX;
        const y = vertex.v * scaleFactor + offsetY;
        p5.vertex(x, y);
      });
      p5.endShape(p5.CLOSE);

      p5.translate(-100,0);
    });
  };
  
  
  

  return <Sketch setup={setup} draw={draw} />;
}

export default FaceGroupsRenderer;
