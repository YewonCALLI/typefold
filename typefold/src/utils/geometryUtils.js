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
      if (v1.distanceTo(v2) < 1e-6) {
        sharedVertices++;
      }
    }
  }

  return sharedVertices >= 2;
}

function classifyFaceGroups(groups) {
  // 면의 방향에 따라 분류
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
    }
  }
}

function findSharedEdge(parentGroup, currentGroup, position) {
  if (!parentGroup || !currentGroup) return null;

  for (const parentFace of parentGroup.faces) {
    for (const currentFace of currentGroup.faces) {
      const parentVertices = [];
      const currentVertices = [];
      const sharedVertices = [];

      for (let i = 0; i < 3; i++) {
        const idx = parentFace * 3 + i;
        parentVertices.push(new THREE.Vector3().fromBufferAttribute(position, idx));
      }

      for (let i = 0; i < 3; i++) {
        const idx = currentFace * 3 + i;
        currentVertices.push(new THREE.Vector3().fromBufferAttribute(position, idx));
      }

      parentVertices.forEach(v1 => {
        currentVertices.forEach(v2 => {
          if (v1.distanceTo(v2) < 1e-6) {
            sharedVertices.push(v1.clone());
          }
        });
      });

      if (sharedVertices.length === 2) {
        return {
          start: sharedVertices[0],
          end: sharedVertices[1],
          normal1: parentGroup.normal,
          normal2: currentGroup.normal
        };
      }
    }
  }
  return null;
}

function determineUnfoldOrder(groups) {
  const order = [];
  const visited = new Set();

  const sideGroups = groups.filter(g => g.type === 'side');
  if (sideGroups.length > 0) {
    const startGroup = sideGroups[0];
    traverseSideFaces(startGroup, visited, order, null);
  }

  return order;
}

function traverseSideFaces(group, visited, order, parent) {
  if (visited.has(group)) return;
  visited.add(group);
  order.push({ group, parent });

  group.connectedGroups.forEach(conn => {
    if (conn.group.type === 'side' && !visited.has(conn.group)) {
      traverseSideFaces(conn.group, visited, order, group);
    }
  });
}


// 개별 면 메시 생성 헬퍼 함수
function createGroupMeshes(groups, unfoldOrder, position, originalMesh) {
  const meshes = new Map();
  const groupColorsMap = new Map();
  groups.forEach(group => {
    groupColorsMap.set(group, new THREE.Color(Math.random(), Math.random(), Math.random()));
  });

  // side faces 처리
  const sideFaces = unfoldOrder.filter(({group}) => group.type === 'side');
  sideFaces.forEach(({group, parent}, index) => {
    const mesh = createSingleMesh(group, position, groupColorsMap.get(group));
    
    if (parent) {
      const sharedEdge = findSharedEdge(parent, group, position);
      if (sharedEdge) {
        alignMeshWithParent(mesh, meshes.get(parent).children[0], sharedEdge);
      }
    }

    const pivot = new THREE.Object3D();
    pivot.add(mesh);
    originalMesh.parent.add(pivot);
    meshes.set(group, pivot);
    pivot.updateMatrixWorld(true);
  });

  // top, bottom faces 처리
  function alignTopBottomFace(face, connectedSideFace) {
    if (!face || !connectedSideFace) return;
    
    const faceMesh = createSingleMesh(face, position, groupColorsMap.get(face));
    const sharedEdge = findSharedEdge(connectedSideFace, face, position);
    
    if (sharedEdge) {
      const parentMesh = meshes.get(connectedSideFace).children[0];
      
      faceMesh.quaternion.copy(parentMesh.quaternion);

      // 먼저 회전
      const rotationAngle = face.type === 'top' ? -Math.PI/2 : Math.PI/2;
      faceMesh.rotateX(rotationAngle);

      // 회전 후 vertex 위치 맞추기
      const parentStart = sharedEdge.start.clone()
        .applyQuaternion(parentMesh.quaternion)
        .add(parentMesh.position);
      const currentStart = sharedEdge.start.clone()
        .applyQuaternion(faceMesh.quaternion);
      
      const offset = parentStart.clone().sub(currentStart);
      faceMesh.position.copy(offset);
    }

    const pivot = new THREE.Object3D();
    pivot.add(faceMesh);
    originalMesh.parent.add(pivot);
    meshes.set(face, pivot);
}
  // top face 연결
  const topFace = groups.find(g => g.type === 'top');
  const topConnectedSide = sideFaces
    .map(({group}) => group)
    .find(sideGroup => sideGroup.connectedGroups.some(conn => conn.group === topFace));
  alignTopBottomFace(topFace, topConnectedSide);

  // bottom face 연결
  const bottomFace = groups.find(g => g.type === 'bottom');
  const bottomConnectedSide = sideFaces
    .map(({group}) => group)
    .find(sideGroup => sideGroup.connectedGroups.some(conn => conn.group === bottomFace));
  alignTopBottomFace(bottomFace, bottomConnectedSide);

  return Array.from(meshes.values()).map(pivot => pivot.children[0]);
}


function createSingleMesh(group, position, color) {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const indices = [];
  const colors = [];
  let vertexIndex = 0;

  group.faces.forEach(faceIdx => {
    for (let i = 0; i < 3; i++) {
      const idx = faceIdx * 3 + i;
      const vertex = new THREE.Vector3().fromBufferAttribute(position, idx);
      vertices.push(vertex.x, vertex.y, vertex.z);
      colors.push(color.r, color.g, color.b);
    }
    indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
    vertexIndex += 3;
  });

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: 0x000000,
    color: 0xffffff,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);

  // z축으로 정렬
  const normal = group.normal.clone();
  const upVector = new THREE.Vector3(0, 0, 1);
  const rotationQuaternion = new THREE.Quaternion().setFromUnitVectors(normal, upVector);
  mesh.quaternion.premultiply(rotationQuaternion);

  return mesh;
}

function alignMeshWithParent(mesh, parentMesh, sharedEdge) {
  const currentEdgeStart = sharedEdge.start.clone().applyQuaternion(mesh.quaternion);
  const currentEdgeEnd = sharedEdge.end.clone().applyQuaternion(mesh.quaternion);
  const parentEdgeStart = sharedEdge.start.clone().applyQuaternion(parentMesh.quaternion)
    .add(parentMesh.position);
  const parentEdgeEnd = sharedEdge.end.clone().applyQuaternion(parentMesh.quaternion)
    .add(parentMesh.position);

  const offset = parentEdgeStart.clone().sub(currentEdgeStart);
  mesh.position.copy(offset);
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

  for (let i = 0; i < faceCount; i++) {
    if (visitedFaces.has(i)) continue;

    const group = {
      faces: [],
      normal: null,
      type: null,
      center: new THREE.Vector3(),
      vertices: [],
      connectedGroups: []
    };

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

    faceGroups.push(group);
  }

  // 면 유형 분류
  classifyFaceGroups(faceGroups);

  // 그룹 간의 연결 관계 찾기
  findGroupConnections(faceGroups, position);

  // 펼치기 순서 결정
  const unfoldOrder = determineUnfoldOrder(faceGroups);

  // 그룹별 메시 생성 및 펼치기
  const meshes = createGroupMeshes(faceGroups, unfoldOrder, position, mesh);
  faceMeshesRef.current = meshes;

  // 초기 위치와 회전값 저장
  const initialStates = meshes.map(mesh => ({
    position: mesh.position.clone(),
    quaternion: mesh.quaternion.clone()
  }));

  // 각 메시에 텍스처 적용
  meshes.forEach(mesh => {
    const positions = mesh.geometry.attributes.position.array;
    const normal = mesh.geometry.attributes.normal.array;
    
    // UV 좌표를 저장할 배열
    const uvs = [];
    
    // 각 삼각형에 대해 UV 좌표 계산
    for (let i = 0; i < positions.length; i += 9) {
      // 삼각형의 세 정점
      const v0 = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
      const v1 = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
      const v2 = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);
      
      // 삼각형의 normal vector
      const faceNormal = new THREE.Vector3(normal[i], normal[i + 1], normal[i + 2]);
      
      // 첫 번째 edge를 U 축으로 사용
      const uAxis = v1.clone().sub(v0).normalize();
      const vAxis = new THREE.Vector3().crossVectors(faceNormal, uAxis).normalize();
      
      // 각 정점에 대한 UV 좌표 계산
      const points = [v0, v1, v2];
      points.forEach(point => {
        // 원점(v0)에 대한 상대 위치 계산
        const relativePos = point.clone().sub(v0);
        
        // U, V 좌표 계산 (0-1 범위로 정규화)
        const u = relativePos.dot(uAxis) / mesh.geometry.boundingBox.max.length();
        const v = relativePos.dot(vAxis) / mesh.geometry.boundingBox.max.length();
        
        uvs.push(u, v);
      });
    }
    
    // UV 속성 설정
    mesh.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    
    // 텍스처 적용
    mesh.material.map = unfoldedTexture;
    mesh.material.needsUpdate = true;
  });

// unfoldModelWithEdges 함수 내 UV 매핑 부분
if (unfoldedTexture) {
  meshes.forEach((mesh, index) => {
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position.array;
    
    // 바운딩 박스 계산
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const width = bbox.max.x - bbox.min.x;
    const height = bbox.max.y - bbox.min.y;
    
    // UV 좌표 계산
    const uvs = [];
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      
      const u = (x - bbox.min.x) / width;
      const v = (y - bbox.min.y) / height;
      
      uvs.push(u, v);
    }
    
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    
    // 약간의 오프셋을 추가하여 Z-fighting 방지
    mesh.position.z += index * 0.001;
    
    // 렌더링 순서 설정
    mesh.renderOrder = index;
    
    const material = new THREE.MeshStandardMaterial({
      map: unfoldedTexture,
      side: THREE.DoubleSide,
      depthWrite: true,
      depthTest: true,
      color: 0xffffff, // 흰색으로 설정
    });
    
    
    mesh.material = material;
  });
}
}