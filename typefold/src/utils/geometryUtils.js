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

function createGroupMeshes(groups, unfoldOrder, position, originalMesh) {
  const meshes = new Map();
  let currentX = 0;

  // 각 그룹별 색상 지정
  const groupColorsMap = new Map();
  groups.forEach(group => {
    groupColorsMap.set(group, new THREE.Color(Math.random(), Math.random(), Math.random()));
  });

  unfoldOrder.forEach(({ group, parent }, index) => {
    // 기본 geometry 생성
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    const colors = [];
    let vertexIndex = 0;

    const groupColor = groupColorsMap.get(group);

    // 정점 데이터 수집
    group.faces.forEach(faceIdx => {
      for (let i = 0; i < 3; i++) {
        const idx = faceIdx * 3 + i;
        const vertex = new THREE.Vector3().fromBufferAttribute(position, idx);
        vertices.push(vertex.x, vertex.y, vertex.z);
        colors.push(groupColor.r, groupColor.g, groupColor.b);
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
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });

    const mesh = new THREE.Mesh(geometry, material);

    // z축으로 정렬
    const normal = group.normal.clone();
    const upVector = new THREE.Vector3(0, 0, 1);
    const rotationQuaternion = new THREE.Quaternion().setFromUnitVectors(normal, upVector);
    mesh.quaternion.premultiply(rotationQuaternion);

    // 부모 면이 있는 경우 edge 정렬
    if (parent) {
      const sharedEdge = findSharedEdge(parent, group, position);
      if (sharedEdge) {
        const parentMesh = meshes.get(parent).children[0];
        const parentGeom = parentMesh.geometry;

        // 부모 면과 현재 면의 edge vertices를 월드 좌표로 변환
        const currentEdgeStart = sharedEdge.start.clone().applyQuaternion(mesh.quaternion);
        const currentEdgeEnd = sharedEdge.end.clone().applyQuaternion(mesh.quaternion);
        const parentEdgeStart = sharedEdge.start.clone().applyQuaternion(parentMesh.quaternion)
          .add(parentMesh.position);
        const parentEdgeEnd = sharedEdge.end.clone().applyQuaternion(parentMesh.quaternion)
          .add(parentMesh.position);

        // edge를 일치시키기 위한 오프셋 계산
        const offset = parentEdgeStart.clone().sub(currentEdgeStart);
        mesh.position.copy(offset);
      }
    }

    const pivot = new THREE.Object3D();
    pivot.add(mesh);

    originalMesh.parent.add(pivot);
    meshes.set(group, pivot);
    pivot.updateMatrixWorld(true);
  });

  return Array.from(meshes.values()).map(pivot => pivot.children[0]);
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
  const meshes = createGroupMeshes(faceGroups, unfoldOrder, position, mesh);

  faceMeshesRef.current = meshes;
}
