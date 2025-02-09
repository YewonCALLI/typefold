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

function createSideFaceMesh(sideGroups, position) {
  const orderedSideGroups = [];
  
  // 첫 번째 side 그룹 찾기
  let currentGroup = sideGroups[0];
  orderedSideGroups.push(currentGroup);

  // 연결된 순서대로 그룹 추가
  while (orderedSideGroups.length < sideGroups.length) {
    const nextGroup = currentGroup.connectedGroups.find(conn => 
      conn.group.type === 'side' && !orderedSideGroups.includes(conn.group)
    )?.group;

    if (nextGroup) {
      orderedSideGroups.push(nextGroup);
      currentGroup = nextGroup;
    } else {
      break;
    }
  }

  const groupInfos = [];
  let totalWidth = 0;

  // 각 면의 실제 edge 길이와 높이 계산 및 저장
  orderedSideGroups.forEach(group => {
    const box = new THREE.Box3();
    let width = 0;
    let height = 0;

    group.faces.forEach(faceIndex => {
      const vertices = [];
      for (let i = 0; i < 3; i++) {
        const idx = faceIndex * 3 + i;
        const vertex = new THREE.Vector3().fromBufferAttribute(position, idx);
        vertices.push(vertex);
        box.expandByPoint(vertex);
      }
    });

    const size = box.getSize(new THREE.Vector3());
    width = Math.max(size.x, size.z);
    height = size.y;

    groupInfos.push({
      startX: totalWidth,
      width: width,
      height: height,
      group: group
    });
    
    totalWidth += width;
  });

  const maxHeight = Math.max(...groupInfos.map(info => info.height));
  const guideHeight = maxHeight * 0.2;

  // Separate geometries for guide areas and main faces
  const mainGeometry = new THREE.BufferGeometry();
  const guideGeometry = new THREE.BufferGeometry();
  
  const mainVertices = [];
  const mainIndices = [];
  const guideVertices = [];
  const guideIndices = [];
  let mainVertexIndex = 0;
  let guideVertexIndex = 0;

  groupInfos.forEach((info) => {
    const startX = info.startX - totalWidth/2;
    const normalizedWidth = info.width;
    const normalizedHeight = info.height;
    
    // 위쪽 가이드 영역
    guideVertices.push(
      startX, normalizedHeight/2 + guideHeight, 0,
      startX + normalizedWidth, normalizedHeight/2 + guideHeight, 0,
      startX, normalizedHeight/2, 0,
      startX + normalizedWidth, normalizedHeight/2, 0
    );

    // 아래쪽 가이드 영역
    guideVertices.push(
      startX, -normalizedHeight/2, 0,
      startX + normalizedWidth, -normalizedHeight/2, 0,
      startX, -normalizedHeight/2 - guideHeight, 0,
      startX + normalizedWidth, -normalizedHeight/2 - guideHeight, 0
    );

    // Guide indices
    guideIndices.push(
      guideVertexIndex, guideVertexIndex + 1, guideVertexIndex + 2,
      guideVertexIndex + 1, guideVertexIndex + 3, guideVertexIndex + 2,
      guideVertexIndex + 4, guideVertexIndex + 5, guideVertexIndex + 6,
      guideVertexIndex + 5, guideVertexIndex + 7, guideVertexIndex + 6
    );
    guideVertexIndex += 8;

    // 메인 면 영역
    mainVertices.push(
      startX, normalizedHeight/2, 0,
      startX + normalizedWidth, normalizedHeight/2, 0,
      startX, -normalizedHeight/2, 0,
      startX + normalizedWidth, -normalizedHeight/2, 0
    );

    // Main face indices
    mainIndices.push(
      mainVertexIndex, mainVertexIndex + 1, mainVertexIndex + 2,
      mainVertexIndex + 1, mainVertexIndex + 3, mainVertexIndex + 2
    );
    mainVertexIndex += 4;
  });

  // Set up main geometry
  mainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(mainVertices, 3));
  mainGeometry.setIndex(mainIndices);
  mainGeometry.computeVertexNormals();

  // Set up guide geometry
  guideGeometry.setAttribute('position', new THREE.Float32BufferAttribute(guideVertices, 3));
  guideGeometry.setIndex(guideIndices);
  guideGeometry.computeVertexNormals();

  // Create materials
  const mainMaterial = new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide,
    vertexColors: true
  });

  const guideMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    vertexColors: false,  // vertexColors를 false로 설정
    map: null  // texture map을 null로 설정
  });

  // Create meshes
  const mainMesh = new THREE.Mesh(mainGeometry, mainMaterial);
  const guideMesh = new THREE.Mesh(guideGeometry, guideMaterial);

  
  // 경계선 추가
  const edgesGroup = new THREE.Group();
  
  // LineBasicMaterial 옵션 정의
  const mainLineOptions = {
    color: 0x000000,        // 색상
    linewidth: 1,           // 선 굵기 (대부분의 GPU에서 1로 제한됨)
    linecap: 'round',       // 선 끝 스타일 ('butt', 'round', 'square')
    linejoin: 'round',      // 선 연결부 스타일 ('round', 'bevel', 'miter')
    opacity: 0.5,           // 투명도 (0.0 - 1.0)
    transparent: false,     // 투명도 사용 여부
    depthTest: true,       // depth testing 사용 여부
    depthWrite: true,      // depth buffer에 쓰기 여부
    blending: THREE.NormalBlending  // 블렌딩 모드
  };

  const guideLineOptions = {
    ...mainLineOptions,
    color: 0xFF0000,        // 빨간색
    linewidth: 1,           // 더 얇은 선 굵기
    opacity: 0.8            // 약간 투명하게
  };

  groupInfos.forEach((info, index) => {
    const startX = -totalWidth/2 + info.startX;
    const points = [
      // 위쪽 가이드 영역의 위 경계선
      new THREE.Vector3(startX, info.height/2 + guideHeight, 0.001),
      new THREE.Vector3(startX + info.width, info.height/2 + guideHeight, 0.001),
      // 위쪽 가이드 영역의 아래 경계선
      new THREE.Vector3(startX + info.width, info.height/2, 0.001),
      new THREE.Vector3(startX, info.height/2, 0.001),
      // 아래쪽 가이드 영역의 위 경계선
      new THREE.Vector3(startX, -info.height/2, 0.001),
      new THREE.Vector3(startX + info.width, -info.height/2, 0.001),
      // 아래쪽 가이드 영역의 아래 경계선
      new THREE.Vector3(startX + info.width, -info.height/2 - guideHeight, 0.001),
      new THREE.Vector3(startX, -info.height/2 - guideHeight, 0.001)
    ];

    // 세로선
    const verticalPoints = [
      new THREE.Vector3(startX, info.height/2 + guideHeight, 0.001),
      new THREE.Vector3(startX, -info.height/2 - guideHeight, 0.001)
    ];
    
    if (index === groupInfos.length - 1) {
      const endX = startX + info.width;
      verticalPoints.push(
        new THREE.Vector3(endX, info.height/2 + guideHeight, 0.001),
        new THREE.Vector3(endX, -info.height/2 - guideHeight, 0.001)
      );
    }

    // 가로선 생성
    points.forEach((point, i) => {
      if (i % 2 === 0) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([point, points[i + 1]]);
        const isGuideArea = (i < 2) || (i >= 6); // 위아래 가이드 영역의 선
        const line = new THREE.Line(
          lineGeometry,
          new THREE.LineBasicMaterial(isGuideArea ? guideLineOptions : mainLineOptions)
        );
        edgesGroup.add(line);
      }
    });

    // 세로선 추가
    for (let i = 0; i < verticalPoints.length; i += 2) {
      // 위쪽 가이드 영역
      const topGuideGeometry = new THREE.BufferGeometry().setFromPoints([
        verticalPoints[i],
        new THREE.Vector3(verticalPoints[i].x, info.height/2, 0.001)
      ]);
      const topGuideLine = new THREE.Line(
        topGuideGeometry,
        new THREE.LineBasicMaterial(guideLineOptions)
      );
      edgesGroup.add(topGuideLine);

      // 중간 메인 영역
      const mainGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(verticalPoints[i].x, info.height/2, 0.001),
        new THREE.Vector3(verticalPoints[i].x, -info.height/2, 0.001)
      ]);
      const mainLine = new THREE.Line(
        mainGeometry,
        new THREE.LineBasicMaterial(mainLineOptions)
      );
      edgesGroup.add(mainLine);

      // 아래쪽 가이드 영역
      const bottomGuideGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(verticalPoints[i].x, -info.height/2, 0.001),
        verticalPoints[i + 1]
      ]);
      const bottomGuideLine = new THREE.Line(
        bottomGuideGeometry,
        new THREE.LineBasicMaterial(guideLineOptions)
      );
      edgesGroup.add(bottomGuideLine);
    }
  });

  const group = new THREE.Group();
  group.add(mainMesh);
  group.add(guideMesh);
  group.add(edgesGroup);

  return group;
}


function createSingleMesh(group, position, color) {
  const geometry = new THREE.BufferGeometry();
  geometry.computeBoundingBox(); // 초기 boundingBox 계산
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
    vertexColors: true,
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

function alignTopBottomFace(face, connectedSideFace, faceMesh, sideMesh) {
  if (!face || !connectedSideFace) return null;

  // 1. face의 normal을 y축과 정렬
  const yAxis = new THREE.Vector3(0, 1, 0);
  const currentNormal = face.normal.clone();
  const alignmentQuaternion = new THREE.Quaternion().setFromUnitVectors(
    currentNormal,
    face.type === "top" ? yAxis : yAxis.clone().negate()
  );
  faceMesh.quaternion.premultiply(alignmentQuaternion);

  // 2. side 면의 dimensions 계산
  const parentBox = sideMesh.geometry.boundingBox;
  const parentHeight = parentBox.max.y - parentBox.min.y;

  // 3. 위치 설정 - side 면의 높이를 기준으로 간격 설정
  const spacing = parentHeight * 1.5;
  const directionOffset = face.type === "top" ? spacing : -spacing;
  faceMesh.position.y = directionOffset;

  return faceMesh;
}

function createGroupMeshes(groups, unfoldOrder, position, originalMesh) {
  const meshes = new Map();
  const groupColorsMap = new Map();
  groups.forEach((group) => {
    groupColorsMap.set(
      group,
      new THREE.Color(Math.random(), Math.random(), Math.random())
    );
  });

  // Side 면 처리
  const sideGroups = groups.filter(g => g.type === 'side');
  let sideMesh = null;
  if (sideGroups.length > 0) {
    sideMesh = createSideFaceMesh(sideGroups, position);
    const pivot = new THREE.Object3D();
    pivot.add(sideMesh);
    originalMesh.parent.add(pivot);
    meshes.set('side', pivot);
  }

  // top과 bottom 면 처리
  const nonSideGroups = groups.filter(g => g.type !== 'side');
  
  nonSideGroups.forEach(group => {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    const colors = [];
    const uvs = [];
    let vertexIndex = 0;

    // 면의 평균 중심점 계산
    const center = new THREE.Vector3();
    group.faces.forEach(faceIdx => {
      for (let i = 0; i < 3; i++) {
        const idx = faceIdx * 3 + i;
        const vertex = new THREE.Vector3().fromBufferAttribute(position, idx);
        center.add(vertex);
      }
    });
    center.divideScalar(group.faces.length * 3);

    // Compute bounding box for UV scaling
    const boundingBox = new THREE.Box3();
    group.faces.forEach(faceIdx => {
      for (let i = 0; i < 3; i++) {
        const idx = faceIdx * 3 + i;
        const vertex = new THREE.Vector3().fromBufferAttribute(position, idx);
        boundingBox.expandByPoint(vertex);
      }
    });
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.z);

    group.faces.forEach(faceIdx => {
      for (let i = 0; i < 3; i++) {
        const idx = faceIdx * 3 + i;
        const vertex = new THREE.Vector3().fromBufferAttribute(position, idx);
        vertices.push(vertex.x, vertex.y, vertex.z);
        
        // UV 계산 - 상하면에 대해 xz 평면에 투영
        const relativePos = vertex.clone().sub(center);
        const u = (relativePos.x / maxSize + 1) * 0.5;
        const v = (relativePos.z / maxSize + 1) * 0.5;
        uvs.push(u, v);
        
        colors.push(1, 1, 1); // 흰색으로 설정
      }
      indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
      vertexIndex += 3;
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);

    const normal = group.normal.clone();
    const upVector = new THREE.Vector3(0, 0, 1);
    const rotationQuaternion = new THREE.Quaternion().setFromUnitVectors(
      normal,
      upVector
    );
    mesh.quaternion.premultiply(rotationQuaternion);

    // 수동 조정 코드
    mesh.position.z = -0.1;

    const spacing = 0.6;
    if (group.type === 'top') {
      mesh.position.y = spacing;
      mesh.position.x = -spacing;
    } else if (group.type === 'bottom') {
      mesh.position.y = -spacing;
      mesh.position.x = -spacing;
    } else if (group.type ==='side'){
    }

    const pivot = new THREE.Object3D();
    pivot.add(mesh);
    originalMesh.parent.add(pivot);
    meshes.set(group, pivot);
  });

  return Array.from(meshes.values()).map((pivot) => pivot.children[0]);
}


export function unfoldModelWithEdges(mesh, faceMeshesRef, unfoldedTexture) {
  mesh.visible = false;
  
  if (!mesh.geometry.boundingBox) {
    mesh.geometry.computeBoundingBox();
  }

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

  // 그룹별 메시 생성 및 펼치기
  const meshes = createGroupMeshes(faceGroups, [], position, mesh);
  faceMeshesRef.current = meshes;

  // 텍스처 적용
  if (unfoldedTexture) {
    meshes.forEach((meshOrGroup) => {
      // Group인 경우 첫 번째 자식(메인 메시)에 텍스처 적용
      const targetMesh = meshOrGroup instanceof THREE.Group ? meshOrGroup.children[0] : meshOrGroup;
      if (targetMesh && targetMesh.material) {
        targetMesh.material.map = unfoldedTexture;
        targetMesh.material.needsUpdate = true;
      }
    });
  }
}

export function createFaceGroups(mesh) {
  let geometry = mesh.geometry.clone();
  if (!geometry.index) {
    geometry = mergeVertices(geometry);
  }
  geometry = geometry.toNonIndexed();

  const position = geometry.attributes.position;
  const faceCount = position.count / 3;
  
  // 전체 모델의 바운딩 박스 계산
  const modelBoundingBox = new THREE.Box3();
  for (let i = 0; i < position.count; i++) {
    const vertex = new THREE.Vector3().fromBufferAttribute(position, i);
    modelBoundingBox.expandByPoint(vertex);
  }
  const modelSize = modelBoundingBox.getSize(new THREE.Vector3());
  const globalScale = Math.max(modelSize.x, modelSize.y, modelSize.z);
  
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
      boundingBox: new THREE.Box3(),
    };

    const startFaceVertices = [];
    for (let j = 0; j < 3; j++) {
      const idx = i * 3 + j;
      startFaceVertices.push(
        new THREE.Vector3().fromBufferAttribute(position, idx)
      );
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
        group.boundingBox.expandByPoint(vertex);
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

    // Calculate group center
    group.center.copy(group.boundingBox.getCenter(new THREE.Vector3()));
    faceGroups.push(group);
  }

  // 면 유형 분류
  classifyFaceGroups(faceGroups);

  // UV 매핑 처리
  if (!geometry.attributes.uv) {
    const uvs = new Float32Array(position.count * 2);
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }

  faceGroups.forEach(group => {
    if (group.type === 'side') {
      // side 면들의 UV 매핑
      const tangent = new THREE.Vector3(1, 0, 0);
      if (Math.abs(group.normal.dot(tangent)) > 0.9) {
        tangent.set(0, 1, 0);
      }
      const bitangent = new THREE.Vector3().crossVectors(group.normal, tangent).normalize();
      tangent.crossVectors(bitangent, group.normal).normalize();

      group.faces.forEach(faceIndex => {
        for (let i = 0; i < 3; i++) {
          const vertexIndex = faceIndex * 3 + i;
          const vertex = new THREE.Vector3().fromBufferAttribute(position, vertexIndex);
          const localPos = vertex.clone().sub(group.center);
          
          const u = (localPos.dot(tangent) / globalScale) + 0.5;
          const v = (localPos.dot(bitangent) / globalScale) + 0.5;
          
          geometry.attributes.uv.setXY(vertexIndex, u, v);
        }
      });
    } else {
      // top/bottom 면들의 UV 매핑
      const size = group.boundingBox.getSize(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.z);

      group.faces.forEach(faceIndex => {
        for (let i = 0; i < 3; i++) {
          const vertexIndex = faceIndex * 3 + i;
          const vertex = new THREE.Vector3().fromBufferAttribute(position, vertexIndex);
          const relativePos = vertex.clone().sub(group.center);
          
          const u = (relativePos.x / maxSize + 1) * 0.5;
          const v = (relativePos.z / maxSize + 1) * 0.5;
          
          geometry.attributes.uv.setXY(vertexIndex, u, v);
        }
      });
    }
  });

  geometry.attributes.uv.needsUpdate = true;
  findGroupConnections(faceGroups, position);

  return { faceGroups, geometry };
}

function verticesAreEqual(v1, v2) {
  const EPSILON = 1e-6; // 부동소수점 연산을 위한 오차 허용값
  return v1.distanceTo(v2) < EPSILON;
}

// 공유 edge를 찾는 helper 함수
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

      // 가장 긴 공유 edge 찾기
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
          // 반대 방향도 체크
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