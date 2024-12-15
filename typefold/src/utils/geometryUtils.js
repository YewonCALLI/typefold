// geometryUtils.js
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { gsap } from "gsap";
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
      group.type = "top";
    } else if (angle > (Math.PI * 3) / 4) {
      group.type = "bottom";
    } else {
      group.type = "side";
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
          edge: sharedEdge,
        });
        groups[j].connectedGroups.push({
          group: groups[i],
          edge: {
            start: sharedEdge.end,
            end: sharedEdge.start,
            normal1: sharedEdge.normal2,
            normal2: sharedEdge.normal1,
          },
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
        parentVertices.push(
          new THREE.Vector3().fromBufferAttribute(position, idx)
        );
      }

      for (let i = 0; i < 3; i++) {
        const idx = currentFace * 3 + i;
        currentVertices.push(
          new THREE.Vector3().fromBufferAttribute(position, idx)
        );
      }

      parentVertices.forEach((v1) => {
        currentVertices.forEach((v2) => {
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
          normal2: currentGroup.normal,
        };
      }
    }
  }
  return null;
}

function determineUnfoldOrder(groups) {
  const order = [];
  const visited = new Set();

  const sideGroups = groups.filter((g) => g.type === "side");
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

  group.connectedGroups.forEach((conn) => {
    if (conn.group.type === "side" && !visited.has(conn.group)) {
      traverseSideFaces(conn.group, visited, order, group);
    }
  });
}

// 개별 면 메시 생성 헬퍼 함수
function createGroupMeshes(groups, unfoldOrder, position, originalMesh) {
  const meshes = new Map();
  const groupColorsMap = new Map();
  groups.forEach((group) => {
    groupColorsMap.set(
      group,
      new THREE.Color(Math.random(), Math.random(), Math.random())
    );
  });

  // side faces 처리
  const sideFaces = unfoldOrder.filter(({ group }) => group.type === "side");
  sideFaces.forEach(({ group, parent }, index) => {
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



// Modify the alignTopBottomFace function
function alignTopBottomFace(face, connectedSideFace) {
  if (!face || !connectedSideFace) return;

  const faceMesh = createSingleMesh(face, position, groupColorsMap.get(face));
  const sharedEdge = findSharedEdge(connectedSideFace, face, position);
  
  if (sharedEdge) {
    const parentMesh = meshes.get(connectedSideFace).children[0];
    
    // 1. 먼저 face의 normal을 y축과 정렬
    const yAxis = new THREE.Vector3(0, 1, 0);
    const currentNormal = face.normal.clone();
    const alignmentQuaternion = new THREE.Quaternion().setFromUnitVectors(
      currentNormal,
      face.type === "top" ? yAxis : yAxis.clone().negate()
    );
    faceMesh.quaternion.premultiply(alignmentQuaternion);
    
    // 2. 정확한 Center of Mass 계산
    const vertices = faceMesh.geometry.attributes.position;
    const centerOfMass = calculateCenterOfMass(vertices);
    
    // 3. side 면의 dimensions 계산
    parentMesh.geometry.computeBoundingBox();
    const parentBox = parentMesh.geometry.boundingBox;
    const parentHeight = parentBox.max.y - parentBox.min.y;
    
    // Bounding Box 시각화
    const boxGeometry = new THREE.BoxGeometry(
      parentBox.max.x - parentBox.min.x,
      parentBox.max.y - parentBox.min.y,
      parentBox.max.z - parentBox.min.z
    );
    const boxMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      depthTest: false
    });
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    
    // Box의 위치를 parentMesh의 world position으로 설정
    const parentWorldPos = new THREE.Vector3();
    parentMesh.getWorldPosition(parentWorldPos);
    boxMesh.position.copy(parentWorldPos);
    boxMesh.quaternion.copy(parentMesh.quaternion);
    
    // Box의 중심점 보정
    const boxCenter = new THREE.Vector3();
    parentBox.getCenter(boxCenter);
    boxMesh.position.add(boxCenter.applyQuaternion(parentMesh.quaternion));
    
    originalMesh.parent.add(boxMesh);
    
    // 4. 위치 설정
    faceMesh.position.copy(parentWorldPos);
    const spacingOffset = parentHeight*2.47;
    const directionOffset = face.type === "top" ? spacingOffset : -spacingOffset;
    faceMesh.position.y += directionOffset;
    faceMesh.position.sub(centerOfMass);
    
    // 5. shared edge 기준 정렬
    const edgeCenter = new THREE.Vector3()
      .addVectors(sharedEdge.start, sharedEdge.end)
      .multiplyScalar(0.5);
    
    const currentEdgeCenter = edgeCenter.clone()
      .applyQuaternion(faceMesh.quaternion)
      .add(faceMesh.position);
    
    const targetEdgeCenter = edgeCenter.clone()
      .applyQuaternion(parentMesh.quaternion)
      .add(parentMesh.position);
    
    const adjustment = targetEdgeCenter.clone().sub(currentEdgeCenter);
    adjustment.y = 0;  // y축 조정은 유지
    faceMesh.position.add(adjustment);
  }

  const pivot = new THREE.Object3D();
  pivot.add(faceMesh);
  originalMesh.parent.add(pivot);
  meshes.set(face, pivot);
}

function calculateCenterOfMass(vertices) {
  const centerOfMass = new THREE.Vector3();
  const vertexPositions = [];
  
  for (let i = 0; i < vertices.count; i++) {
    const vertex = new THREE.Vector3(
      vertices.getX(i),
      vertices.getY(i),
      vertices.getZ(i)
    );
    
    const exists = vertexPositions.some(pos => 
      pos.distanceTo(vertex) < 1e-6
    );
    
    if (!exists) {
      vertexPositions.push(vertex);
      centerOfMass.add(vertex);
    }
  }
  
  centerOfMass.divideScalar(vertexPositions.length);
  return centerOfMass;
}
function verticesAreEqual(v1, v2) {
  const EPSILON = 1e-6; // 부동소수점 연산을 위한 오차 허용값
  return v1.distanceTo(v2) < EPSILON;
}

// 공유 edge를 더 정확하게 찾는 함수 업데이트
function findSharedEdge(group1, group2, position) {
  let maxLength = 0;
  let bestEdge = null;

  for (const face1 of group1.faces) {
    const vertices1 = [];
    for (let i = 0; i < 3; i++) {
      const idx = face1 * 3 + i;
      vertices1.push(new THREE.Vector3().fromBufferAttribute(position, idx));
    }
    
    const edges1 = [
      { start: vertices1[0], end: vertices1[1] },
      { start: vertices1[1], end: vertices1[2] },
      { start: vertices1[2], end: vertices1[0] }
    ];

    for (const face2 of group2.faces) {
      const vertices2 = [];
      for (let i = 0; i < 3; i++) {
        const idx = face2 * 3 + i;
        vertices2.push(new THREE.Vector3().fromBufferAttribute(position, idx));
      }
      
      const edges2 = [
        { start: vertices2[0], end: vertices2[1] },
        { start: vertices2[1], end: vertices2[2] },
        { start: vertices2[2], end: vertices2[0] }
      ];

      // 공유되는 edge 중 가장 긴 것을 찾음
      for (const edge1 of edges1) {
        for (const edge2 of edges2) {
          if (verticesAreEqual(edge1.start, edge2.start) && 
              verticesAreEqual(edge1.end, edge2.end)) {
            const length = edge1.start.distanceTo(edge1.end);
            if (length > maxLength) {
              maxLength = length;
              bestEdge = {
                start: edge1.start.clone(),
                end: edge1.end.clone(),
                normal1: group1.normal.clone(),
                normal2: group2.normal.clone()
              };
            }
          }
          // 반대 방향으로도 체크
          else if (verticesAreEqual(edge1.start, edge2.end) && 
                   verticesAreEqual(edge1.end, edge2.start)) {
            const length = edge1.start.distanceTo(edge1.end);
            if (length > maxLength) {
              maxLength = length;
              bestEdge = {
                start: edge1.start.clone(),
                end: edge1.end.clone(),
                normal1: group1.normal.clone(),
                normal2: group2.normal.clone()
              };
            }
          }
        }
      }
    }
  }
  return bestEdge;
}



// Helper function to check if two edges are shared
function areEdgesShared(edge1, edge2) {
  const tolerance = 1e-6;
  return (
    (edge1.start.distanceTo(edge2.start) < tolerance &&
     edge1.end.distanceTo(edge2.end) < tolerance) ||
    (edge1.start.distanceTo(edge2.end) < tolerance &&
     edge1.end.distanceTo(edge2.start) < tolerance)
  );
}

  // top face 연결
  const topFace = groups.find((g) => g.type === "top");
  const topConnectedSide = sideFaces
    .map(({ group }) => group)
    .find((sideGroup) =>
      sideGroup.connectedGroups.some((conn) => conn.group === topFace)
    );
  alignTopBottomFace(topFace, topConnectedSide);

  // bottom face 연결
  const bottomFace = groups.find((g) => g.type === "bottom");
  const bottomConnectedSide = sideFaces
    .map(({ group }) => group)
    .find((sideGroup) =>
      sideGroup.connectedGroups.some((conn) => conn.group === bottomFace)
    );
  alignTopBottomFace(bottomFace, bottomConnectedSide);

  return Array.from(meshes.values()).map((pivot) => pivot.children[0]);
}

function createSingleMesh(group, position, color) {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const indices = [];
  const colors = [];
  let vertexIndex = 0;

  group.faces.forEach((faceIdx) => {
    for (let i = 0; i < 3; i++) {
      const idx = faceIdx * 3 + i;
      const vertex = new THREE.Vector3().fromBufferAttribute(position, idx);
      vertices.push(vertex.x, vertex.y, vertex.z);
      colors.push(color.r, color.g, color.b);
    }
    indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
    vertexIndex += 3;
  });

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
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
  const rotationQuaternion = new THREE.Quaternion().setFromUnitVectors(
    normal,
    upVector
  );
  mesh.quaternion.premultiply(rotationQuaternion);

  return mesh;
}

function alignMeshWithParent(mesh, parentMesh, sharedEdge) {
  const currentEdgeStart = sharedEdge.start
    .clone()
    .applyQuaternion(mesh.quaternion);
  const currentEdgeEnd = sharedEdge.end
    .clone()
    .applyQuaternion(mesh.quaternion);
  const parentEdgeStart = sharedEdge.start
    .clone()
    .applyQuaternion(parentMesh.quaternion)
    .add(parentMesh.position);
  const parentEdgeEnd = sharedEdge.end
    .clone()
    .applyQuaternion(parentMesh.quaternion)
    .add(parentMesh.position);

  const offset = parentEdgeStart.clone().sub(currentEdgeStart);
  mesh.position.copy(offset);
}

export function unfoldModelWithEdges(mesh, faceMeshesRef, unfoldedTexture) {
  mesh.visible = false; // mesh를 안 보이게 설정

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
  const thresholdAngle = THREE.MathUtils.degToRad(0.5);

  for (let i = 0; i < faceCount; i++) {
    if (visitedFaces.has(i)) continue;

    const group = {
      faces: [],
      normal: null,
      type: null,
      center: new THREE.Vector3(),
      vertices: [],
      connectedGroups: [],
    };

    const startFaceVertices = [];
    for (let j = 0; j < 3; j++) {
      const idx = i * 3 + j;
      startFaceVertices.push(
        new THREE.Vector3().fromBufferAttribute(position, idx)
      );
    }
    const v1 = new THREE.Vector3().subVectors(
      startFaceVertices[1],
      startFaceVertices[0]
    );
    const v2 = new THREE.Vector3().subVectors(
      startFaceVertices[2],
      startFaceVertices[0]
    );
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
            faceVertices.push(
              new THREE.Vector3().fromBufferAttribute(position, idx)
            );
          }
          const edge1 = new THREE.Vector3().subVectors(
            faceVertices[1],
            faceVertices[0]
          );
          const edge2 = new THREE.Vector3().subVectors(
            faceVertices[2],
            faceVertices[0]
          );
          const normal = new THREE.Vector3()
            .crossVectors(edge1, edge2)
            .normalize();

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
  const initialStates = meshes.map((mesh) => ({
    position: mesh.position.clone(),
    quaternion: mesh.quaternion.clone(),
  }));

  // 각 메시에 텍스처 적용
  meshes.forEach((mesh) => {
    const positions = mesh.geometry.attributes.position.array;
    const normal = mesh.geometry.attributes.normal.array;

    // UV 좌표를 저장할 배열
    const uvs = [];

    // 각 삼각형에 대해 UV 좌표 계산
    for (let i = 0; i < positions.length; i += 9) {
      // 삼각형의 세 정점
      const v0 = new THREE.Vector3(
        positions[i],
        positions[i + 1],
        positions[i + 2]
      );
      const v1 = new THREE.Vector3(
        positions[i + 3],
        positions[i + 4],
        positions[i + 5]
      );
      const v2 = new THREE.Vector3(
        positions[i + 6],
        positions[i + 7],
        positions[i + 8]
      );

      // 삼각형의 normal vector
      const faceNormal = new THREE.Vector3(
        normal[i],
        normal[i + 1],
        normal[i + 2]
      );

      // 첫 번째 edge를 U 축으로 사용
      const uAxis = v1.clone().sub(v0).normalize();
      const vAxis = new THREE.Vector3()
        .crossVectors(faceNormal, uAxis)
        .normalize();

      // 각 정점에 대한 UV 좌표 계산
      const points = [v0, v1, v2];
      points.forEach((point) => {
        // 원점(v0)에 대한 상대 위치 계산
        const relativePos = point.clone().sub(v0);

        // U, V 좌표 계산 (0-1 범위로 정규화)
        const u =
          relativePos.dot(uAxis) / mesh.geometry.boundingBox.max.length();
        const v =
          relativePos.dot(vAxis) / mesh.geometry.boundingBox.max.length();

        uvs.push(u, v);
      });
    }

    // UV 속성 설정
    mesh.geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

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

      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
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
