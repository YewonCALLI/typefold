import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { gsap } from 'gsap';

function computeFaceNormal(vertices) {
  const edge1 = new THREE.Vector3().subVectors(vertices[1], vertices[0]);
  const edge2 = new THREE.Vector3().subVectors(vertices[2], vertices[0]);
  const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
  return normal;
}

function areFacesAdjacent(face1Index, face2Index, position) {
  const vertices1 = [];
  const vertices2 = [];
  let sharedVertices = 0;

  for (let i = 0; i < 3; i++) {
    const idx1 = face1Index * 3 + i;
    const idx2 = face2Index * 3 + i;
    vertices1.push(new THREE.Vector3().fromBufferAttribute(position, idx1));
    vertices2.push(new THREE.Vector3().fromBufferAttribute(position, idx2));
  }

  for (const v1 of vertices1) {
    for (const v2 of vertices2) {
      if (v1.distanceTo(v2) < 0.0001) {
        sharedVertices++;
      }
    }
  }

  return sharedVertices >= 2;
}

function findSharedEdge(group1, group2, position) {
  for (const face1 of group1.faces) {
    for (const face2 of group2.faces) {
      const vertices1 = [];
      const vertices2 = [];
      const shared = [];

      // 각 면의 정점들 가져오기
      for (let i = 0; i < 3; i++) {
        vertices1.push(new THREE.Vector3().fromBufferAttribute(position, face1 * 3 + i));
        vertices2.push(new THREE.Vector3().fromBufferAttribute(position, face2 * 3 + i));
      }

      // 공유 정점 찾기
      for (const v1 of vertices1) {
        for (const v2 of vertices2) {
          if (v1.distanceTo(v2) < 0.0001) {
            shared.push(v1.clone());
          }
        }
      }

      if (shared.length >= 2) {
        // 두 면의 법선 벡터 계산
        const normal1 = computeFaceNormal(vertices1);
        const normal2 = computeFaceNormal(vertices2);

        return {
          start: shared[0],
          end: shared[1],
          normal1: normal1,
          normal2: normal2
        };
      }
    }
  }
  return null;
}
function classifyFaceGroups(groups) {
  // Y축 기준으로 가장 아래에 있는 그룹을 찾되, 고정하지 않음
  let lowestGroup = groups[0];
  for (const group of groups) {
    if (group.center.y < lowestGroup.center.y) {
      lowestGroup = group;
    }
  }
  
  // 모든 면을 방향에 따라 분류
  const upVector = new THREE.Vector3(0, 1, 0);
  for (const group of groups) {
    const angle = group.normal.angleTo(upVector);
    if (angle < Math.PI / 4) {
      group.type = 'top';
    } else if (angle > Math.PI * 3 / 4) {
        group.type = 'bottom';
    } else {
        group.type = 'side';
    }
  }
}




function findGroupConnections(groups, position) {
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const sharedEdge = findSharedEdge(groups[i], groups[j], position);
      if (sharedEdge) {
        groups[i].connectedGroups.push({
          group: groups[j],
          edge: sharedEdge
        });
        groups[j].connectedGroups.push({
          group: groups[i],
          edge: {
            start: sharedEdge.end,
            end: sharedEdge.start,
            normal1: sharedEdge.normal2,
            normal2: sharedEdge.normal1
          }
        });
      }
      console.log(`Group ${i} connected to Group ${j} with shared edge`, sharedEdge);

    }
  }
  
}

function visitGroupDFS(group, visited, order) {
  if (visited.has(group)) return;
  
  visited.add(group);
  order.push(group);
  
  group.connectedGroups.forEach(connection => {
    if (!visited.has(connection.group)) {
      visitGroupDFS(connection.group, visited, order);
    }
  });
}

function determineUnfoldOrder(groups) {
  const order = [];
  const visited = new Set();
  
  // 상단면(가장 높은 y좌표를 가진 면) 찾기
  let topGroup = groups[0];
  for (const group of groups) {
    if (group.center.y > topGroup.center.y) {
      topGroup = group;
    }
  }
  
  // 상단면부터 시작하여 BFS로 순서 결정
  const queue = [{ group: topGroup, parent: null }];
  while (queue.length > 0) {
    const { group, parent } = queue.shift();
    
    if (visited.has(group)) continue;
    visited.add(group);
    
    // 부모 정보와 함께 순서에 추가
    order.push({ group, parent });
    
    // 연결된 그룹들을 큐에 추가
    group.connectedGroups.forEach(conn => {
      if (!visited.has(conn.group)) {
        queue.push({ 
          group: conn.group, 
          parent: group 
        });
      }
    });
  }
  
  return order;
}

function createGroupMeshes(groups, unfoldOrder, position, originalMesh, unfoldedTexture) {
  const meshes = new Map(); // 그룹별 메시 저장을 위한 Map
  const processedGroups = new Set();
  let delay = 0;
  const totalDelay = 0.7; // 각 면이 펼쳐지는 사이의 시간 간격

  unfoldOrder.forEach(({ group, parent }, index) => {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    let vertexIndex = 0;

    group.faces.forEach(faceIdx => {
      for (let i = 0; i < 3; i++) {
        const idx = faceIdx * 3 + i;
        const vertex = new THREE.Vector3().fromBufferAttribute(position, idx);
        vertices.push(vertex.x, vertex.y, vertex.z);
      }
      indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
      vertexIndex += 3;
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      map: unfoldedTexture || null,
      color: unfoldedTexture ? 0xffffff : new THREE.Color(Math.random(), Math.random(), Math.random()),
      transparent: true,
      opacity: 0.8
    });

    const groupMesh = new THREE.Mesh(geometry, material);
    groupMesh.userData.group = group;
    meshes.set(group, groupMesh);

    if (!processedGroups.has(group)) {
      processedGroups.add(group);
      
      if (parent) {
        const parentMesh = meshes.get(parent);
        const connection = group.connectedGroups.find(conn => conn.group === parent);
        
        if (connection && parentMesh) {
          const sharedEdge = connection.edge;
          const pivotPoint = sharedEdge.start.clone();
          const axis = new THREE.Vector3()
            .subVectors(sharedEdge.end, sharedEdge.start)
            .normalize();

          // 기본 회전 각도 계산
          let angle = sharedEdge.normal1.angleTo(sharedEdge.normal2);
          const cross = new THREE.Vector3().crossVectors(sharedEdge.normal1, sharedEdge.normal2);
          if (cross.dot(axis) < 0) {
            angle = -angle;
          }

          // 부모 면이 이미 회전된 상태라면 그 회전을 고려
          const parentRotation = parentMesh.getWorldQuaternion(new THREE.Quaternion());
          
          const pivot = new THREE.Object3D();
          pivot.position.copy(pivotPoint);
          
          groupMesh.position.sub(pivotPoint);
          pivot.add(groupMesh);
          originalMesh.parent.add(pivot);

          // 순차적 애니메이션 적용
          gsap.to({ t: 0 }, {
            t: 1,
            duration: 1.5,
            delay: delay,
            ease: "power2.inOut",
            onUpdate: function() {
              const t = this.targets()[0].t;
              const currentAngle = angle * t;
              const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, currentAngle);
              // 부모의 회전을 고려하여 최종 회전 계산
              pivot.setRotationFromQuaternion(quaternion.multiply(parentRotation));
            }
          });

          delay += totalDelay;
        }
      } else {
        // 최상단 면은 그대로 유지
        groupMesh.position.copy(group.center);
        originalMesh.parent.add(groupMesh);
      }
    }
  });

  return Array.from(meshes.values());
}

function detectOverlap(mesh1, mesh2, threshold = 0.001) {
  const box1 = new THREE.Box3().setFromObject(mesh1);
  const box2 = new THREE.Box3().setFromObject(mesh2);
  
  // 경계 상자가 겹치지 않으면 바로 false 반환
  if (!box1.intersectsBox(box2)) {
    return false;
  }

  // 더 정확한 겹침 검사를 위해 레이캐스팅 사용
  const raycaster = new THREE.Raycaster();
  const geometry1 = mesh1.geometry;
  const geometry2 = mesh2.geometry;
  const position1 = geometry1.attributes.position;
  const position2 = geometry2.attributes.position;
  
  // mesh1의 각 삼각형에 대해
  for (let i = 0; i < position1.count; i += 3) {
    const triangle = new THREE.Triangle(
      new THREE.Vector3().fromBufferAttribute(position1, i),
      new THREE.Vector3().fromBufferAttribute(position1, i + 1),
      new THREE.Vector3().fromBufferAttribute(position1, i + 2)
    );
    
    // 삼각형의 중심점과 법선 계산
    const center = new THREE.Vector3();
    triangle.getMidpoint(center);
    const normal = new THREE.Vector3();
    triangle.getNormal(normal);
    
    // 양방향으로 레이캐스팅
    const directions = [normal, normal.clone().negate()];
    
    for (const direction of directions) {
      raycaster.set(center, direction);
      const intersects = raycaster.intersectObject(mesh2);
      
      if (intersects.length > 0 && intersects[0].distance < threshold) {
        return true;
      }
    }
  }
  
  return false;
}

// 겹치지 않는 회전 각도를 찾는 함수
function findNonOverlappingAngle(pivot, groupMesh, otherMeshes, originalAngle, axis) {
  const angleIncrements = [0, 45, -45, 90, -90, 135, -135, 180, -180];
  const originalPosition = groupMesh.position.clone();
  const originalRotation = pivot.quaternion.clone();
  
  // 원래 각도부터 시작
  const testAngle = (angle) => {
    const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    pivot.setRotationFromQuaternion(quaternion);
    
    // 다른 모든 메시와의 겹침 검사
    for (const otherMesh of otherMeshes) {
      if (otherMesh !== groupMesh && detectOverlap(groupMesh, otherMesh)) {
        return false;
      }
    }
    return true;
  };
  
  // 원래 각도에서 겹치지 않으면 그대로 사용
  if (testAngle(originalAngle)) {
    return originalAngle;
  }
  
  // 다른 각도들을 시도
  for (const increment of angleIncrements) {
    const newAngle = originalAngle + THREE.MathUtils.degToRad(increment);
    if (testAngle(newAngle)) {
      return newAngle;
    }
  }
  
  // 모든 각도가 겹치면 원래 각도 반환
  pivot.setRotationFromQuaternion(originalRotation);
  groupMesh.position.copy(originalPosition);
  return originalAngle;
}

function calculateUnfoldDirection(group, connectedGroup, processedGroups) {
  // 이미 펼쳐진 면들의 방향 분석
  const unfoldedDirections = new Set();
  processedGroups.forEach(processed => {
    const direction = new THREE.Vector3()
      .subVectors(processed.center, connectedGroup.center)
      .normalize();
    unfoldedDirections.add(direction);
  });

  // 기본 펼침 방향 (공유 엣지에 수직인 방향)
  const edge = group.connectedGroups.find(conn => conn.group === connectedGroup)?.edge;
  if (!edge) return null;

  const edgeVector = new THREE.Vector3().subVectors(edge.end, edge.start).normalize();
  const baseDirection = new THREE.Vector3().crossVectors(edge.normal1, edgeVector).normalize();

  // 가능한 펼침 방향들 생성 (45도 간격)
  const possibleDirections = [];
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
    const direction = baseDirection.clone()
      .applyAxisAngle(edgeVector, angle)
      .normalize();
    
    // 이미 사용된 방향과 비슷한지 확인
    let isUnique = true;
    unfoldedDirections.forEach(used => {
      if (direction.angleTo(used) < Math.PI / 6) { // 30도 이내면 비슷한 방향으로 간주
        isUnique = false;
      }
    });

    if (isUnique) {
      possibleDirections.push({
        direction: direction,
        angle: angle
      });
    }
  }

  return possibleDirections;
}

function findBestUnfoldAngle(pivot, groupMesh, otherMeshes, sharedEdge, processedGroups) {
  const axis = new THREE.Vector3()
    .subVectors(sharedEdge.end, sharedEdge.start)
    .normalize();

  // 기본 회전 각도 계산
  let baseAngle = sharedEdge.normal1.angleTo(sharedEdge.normal2);
  const cross = new THREE.Vector3().crossVectors(sharedEdge.normal1, sharedEdge.normal2);
  if (cross.dot(axis) < 0) {
    baseAngle = -baseAngle;
  }

  // 가능한 펼침 방향 계산
  const possibleDirections = calculateUnfoldDirection(
    groupMesh.userData.group,
    otherMeshes[otherMeshes.length - 1].userData.group,
    processedGroups
  );

  if (!possibleDirections) return baseAngle;

  // 각 방향에 대해 겹침 검사
  const originalPosition = groupMesh.position.clone();
  const originalRotation = pivot.quaternion.clone();

  for (const { angle, direction } of possibleDirections) {
    const testAngle = baseAngle + angle;
    const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, testAngle);
    pivot.setRotationFromQuaternion(quaternion);

    // 겹침 검사
    let hasCollision = false;
    for (const otherMesh of otherMeshes) {
      if (otherMesh !== groupMesh && detectOverlap(groupMesh, otherMesh)) {
        hasCollision = true;
        break;
      }
    }

    if (!hasCollision) {
      // 원래 위치로 복원
      pivot.setRotationFromQuaternion(originalRotation);
      groupMesh.position.copy(originalPosition);
      return testAngle;
    }
  }

  // 모든 방향이 실패하면 기본 각도 사용
  pivot.setRotationFromQuaternion(originalRotation);
  groupMesh.position.copy(originalPosition);
  return baseAngle;
}


export function unfoldModelWithEdges(mesh, faceMeshesRef, unfoldedTexture) {
  let geometry = mesh.geometry.clone();
  if (!geometry.index) {
    geometry = mergeVertices(geometry);
  }
  geometry = geometry.toNonIndexed();

  const position = geometry.attributes.position;
  const faceCount = position.count / 3;

  // 면들을 그룹화
  const faceGroups = [];
  const visitedFaces = new Set();
  const thresholdAngle = THREE.MathUtils.degToRad(10);

  // 그룹화 과정 (이전과 동일)
  for (let i = 0; i < faceCount; i++) {
    if (visitedFaces.has(i)) continue;

    const group = {
      faces: [],
      normal: null,
      type: null,
      center: new THREE.Vector3(),
      vertices: [],
      connectedGroups: [] // 연결된 그룹들을 저장하는 배열 추가
    };

    // ... (기존의 그룹화 로직)
    const startFaceVertices = [];
    for (let j = 0; j < 3; j++) {
      const idx = i * 3 + j;
      startFaceVertices.push(new THREE.Vector3().fromBufferAttribute(position, idx));
    }
    const v1 = new THREE.Vector3().subVectors(startFaceVertices[1], startFaceVertices[0]);
    const v2 = new THREE.Vector3().subVectors(startFaceVertices[2], startFaceVertices[0]);
    group.normal = new THREE.Vector3().crossVectors(v1, v2).normalize();

    // BFS로 유사한 방향의 인접한 면들 찾기
    const queue = [i];
    while (queue.length > 0) {
      const currentFace = queue.shift();
      if (visitedFaces.has(currentFace)) continue;

      visitedFaces.add(currentFace);
      group.faces.push(currentFace);

      for (let j = 0; j < 3; j++) {
        const idx = currentFace * 3 + j;
        const vertex = new THREE.Vector3().fromBufferAttribute(position, idx);
        group.vertices.push(vertex);
      }

      for (let j = 0; j < faceCount; j++) {
        if (visitedFaces.has(j)) continue;

        if (areFacesAdjacent(currentFace, j, position)) {
          const faceVertices = [];
          for (let k = 0; k < 3; k++) {
            const idx = j * 3 + k;
            faceVertices.push(new THREE.Vector3().fromBufferAttribute(position, idx));
          }
          const edge1 = new THREE.Vector3().subVectors(faceVertices[1], faceVertices[0]);
          const edge2 = new THREE.Vector3().subVectors(faceVertices[2], faceVertices[0]);
          const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

          const angle = group.normal.angleTo(normal);
          if (angle < thresholdAngle) {
            queue.push(j);
          }
        }
      }
    }

    group.center.set(0, 0, 0);
    group.vertices.forEach(vertex => {
      group.center.add(vertex);
    });
    group.center.divideScalar(group.vertices.length);


    faceGroups.push(group);
  }

  // 면 유형 분류
  classifyFaceGroups(faceGroups);

  // 그룹 간의 연결 관계 찾기
  findGroupConnections(faceGroups, position);
  

  // 펼치기 순서 결정
  const unfoldOrder = determineUnfoldOrder(faceGroups);

  // 그룹별 메시 생성 및 펼치기
  const meshes = createGroupMeshes(faceGroups, unfoldOrder, position, mesh, unfoldedTexture);
  
  faceMeshesRef.current = meshes;
}
