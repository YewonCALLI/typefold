// animationUtils.js
import * as THREE from 'three';

// 그룹별 메시 생성 함수 (애니메이션용)
export const createAnimationMeshes = (originalMesh, groups) => {
    return groups.map(group => {
      const groupGeometry = new THREE.BufferGeometry();
      const vertices = [];
      const originalVertices = [];
      const indices = [];
      let vertexIndex = 0;
  
      // 고유한 정점들만 사용하여 중심점 계산
      const uniqueVertices = new Set();
      const center = new THREE.Vector3();
      group.faces.forEach(faceIndex => {
        for (let i = 0; i < 3; i++) {
          const idx = faceIndex * 3 + i;
          const vertex = new THREE.Vector3().fromBufferAttribute(
            originalMesh.geometry.attributes.position,
            idx
          );
          const vertexKey = `${vertex.x},${vertex.y},${vertex.z}`;
          if (!uniqueVertices.has(vertexKey)) {
            uniqueVertices.add(vertexKey);
            center.add(vertex);
          }
        }
      });
      center.divideScalar(uniqueVertices.size);
  
      // 면 유형에 따른 시작 위치 조정
      const startOffset = group.type === 'side' ? 1 : 2;
  
      group.faces.forEach(faceIndex => {
        for (let i = 0; i < 3; i++) {
          const idx = faceIndex * 3 + i;
          const vertex = new THREE.Vector3().fromBufferAttribute(
            originalMesh.geometry.attributes.position,
            idx
          );
  
          originalVertices.push(vertex.x, vertex.y, vertex.z);
  
          // 면 유형에 따라 다른 시작 위치 계산
          const toCenter = vertex.clone().sub(center);
          const direction = toCenter.normalize();
          const startPos = center.clone().add(direction.multiplyScalar(startOffset));
  
          vertices.push(startPos.x, startPos.y, startPos.z);
          indices.push(vertexIndex);
          vertexIndex++;
        }
      });

    groupGeometry.setAttribute('position', 
      new THREE.Float32BufferAttribute(vertices, 3));
    groupGeometry.setAttribute('originalPosition', 
      new THREE.Float32BufferAttribute(originalVertices, 3));
    groupGeometry.setIndex(indices);

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(Math.random(), Math.random(), Math.random()),
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(groupGeometry, material);
    mesh.groupCenter = center;
    mesh.isTemporaryGroupMesh = true;

    // 메시를 씬에 추가
    originalMesh.parent.add(mesh);
    
    return {
      mesh,
      center,
      originalVertices: originalVertices
    };
  });
};

// 그룹별로 애니메이션 실행
export const animateToOriginal = (groupMeshes, duration = 1.0) => {
  return new Promise((resolve) => {
    const startTime = performance.now();

    const animate = () => {
      const currentTime = performance.now();
      const elapsed = (currentTime - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      
      // 부드러운 이징
      const eased = 1 - Math.pow(1 - progress, 3);

      // 각 그룹별로 애니메이션 적용
      groupMeshes.forEach(({ mesh, center }) => {
        const positions = mesh.geometry.attributes.position;
        const originalPositions = mesh.geometry.attributes.originalPosition;

        // 중심점을 기준으로 전체 메시 이동
        const scale = 1 - eased; // 1에서 0으로 변화
        for (let i = 0; i < positions.count; i++) {
          const originalPos = new THREE.Vector3(
            originalPositions.getX(i),
            originalPositions.getY(i),
            originalPositions.getZ(i)
          );

          // 중심점으로부터의 방향과 거리 계산
          const toOriginal = originalPos.clone().sub(center);
          const direction = toOriginal.normalize();
          
          // 현재 위치 계산: 중심점 + (방향 * scale)
          const currentPos = center.clone().add(toOriginal.multiplyScalar(scale + 1));
          
          positions.setXYZ(i, currentPos.x, currentPos.y, currentPos.z);
        }
        
        positions.needsUpdate = true;
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 애니메이션 완료 후 정리
        groupMeshes.forEach(({ mesh }) => {
          mesh.parent.remove(mesh);
          mesh.geometry.dispose();
          mesh.material.dispose();
        });
        resolve();
      }
    };

    animate();
  });
};