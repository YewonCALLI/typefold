// src/utils/geometryUtils.js

import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { gsap } from 'gsap';

export function unfoldModelWithEdges(mesh, faceMeshesRef, unfoldedTexture) {
  let geometry = mesh.geometry.clone();

  if (!geometry.index) {
    geometry = mergeVertices(geometry);
  }

  geometry = geometry.toNonIndexed();

  const position = geometry.attributes.position;
  const faceCount = position.count / 3;
  const faceGroups = [];
  const visitedFaces = new Set();

  const colors = [
    0xff0000,
    0x00ff00,
    0x0000ff,
    0xffff00,
    0xff00ff,
    0x00ffff,
    0x808080,
    0xffa500,
    0x8a2be2,
    0x5f9ea0,
    0xd2691e,
    0xdc143c,
  ];

  const thresholdAngleDegrees = 10;
  const thresholdAngle = THREE.MathUtils.degToRad(thresholdAngleDegrees);

  const modelCenter = new THREE.Vector3();
  const totalPositions = position.count;
  for (let i = 0; i < totalPositions; i++) {
    const vertex = new THREE.Vector3().fromBufferAttribute(position, i);
    modelCenter.add(vertex);
  }
  modelCenter.divideScalar(totalPositions);

  for (let i = 0; i < faceCount; i++) {
    if (visitedFaces.has(i)) continue;

    const faceIndices = [i * 3, i * 3 + 1, i * 3 + 2];
    const face = faceIndices;
    const group = [face];
    visitedFaces.add(i);

    const normal1 = calculateNormalForFace(face, position);

    groupConnectedFacesByNormal(
      i,
      normal1,
      position,
      visitedFaces,
      group,
      thresholdAngle
    );

    faceGroups.push({ faces: group });

    console.log(faceGroups);
  }

  faceGroups.forEach((group, groupIndex) => {
    const facePositions = [];
    const faceIndices = [];
    let vertexIndex = 0;

    group.faces.forEach((face) => {
      const indices = face;
      const v0 = new THREE.Vector3().fromBufferAttribute(position, indices[0]);
      const v1 = new THREE.Vector3().fromBufferAttribute(position, indices[1]);
      const v2 = new THREE.Vector3().fromBufferAttribute(position, indices[2]);

      facePositions.push(v0.x, v0.y, v0.z);
      facePositions.push(v1.x, v1.y, v1.z);
      facePositions.push(v2.x, v2.y, v2.z);

      faceIndices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
      vertexIndex += 3;
    });

    const faceGeometry = new THREE.BufferGeometry();
    faceGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(facePositions, 3)
    );
    faceGeometry.setIndex(faceIndices);
    faceGeometry.computeVertexNormals();

    const uvs = [];
    const uMin = Math.min(...facePositions.filter((_, i) => i % 3 === 0));
    const uMax = Math.max(...facePositions.filter((_, i) => i % 3 === 0));
    const vMin = Math.min(...facePositions.filter((_, i) => i % 3 === 1));
    const vMax = Math.max(...facePositions.filter((_, i) => i % 3 === 1));

    for (let i = 0; i < facePositions.length; i += 3) {
      const x = facePositions[i];
      const y = facePositions[i + 1];

      const u = (x - uMin) / (uMax - uMin);
      const v = (y - vMin) / (vMax - vMin);

      uvs.push(u, v);
    }

    faceGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    const faceMaterial = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      map: unfoldedTexture || null,
      color: unfoldedTexture ? null : colors[groupIndex % colors.length],
    });

    const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);

    const groupCenter = new THREE.Vector3();
    for (let i = 0; i < facePositions.length; i += 3) {
      groupCenter.add(
        new THREE.Vector3(
          facePositions[i],
          facePositions[i + 1],
          facePositions[i + 2]
        )
      );
    }
    groupCenter.divideScalar(facePositions.length / 3);

    faceMesh.position.copy(groupCenter);

    const direction = new THREE.Vector3()
      .subVectors(groupCenter, modelCenter)
      .normalize();

    const separationDistance = 1;
    const separationOffset = direction.multiplyScalar(separationDistance);

    const targetPosition = groupCenter.clone().add(separationOffset);
    targetPosition.y = 0;
    targetPosition.z = 0;
    targetPosition.x = 0;

    mesh.parent.add(faceMesh);

    faceMeshesRef.current.push(faceMesh);

    gsap.to(faceMesh.position, {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      duration: 1,
      delay: groupIndex * 0.1,
      ease: 'power2.out',
    });
  });
}

function groupConnectedFacesByNormal(
  currentFaceIndex,
  currentNormal,
  position,
  visitedFaces,
  group,
  thresholdAngle
) {
  const faceCount = position.count / 3;

  for (let i = 0; i < faceCount; i++) {
    if (visitedFaces.has(i)) continue;

    const faceIndices = [i * 3, i * 3 + 1, i * 3 + 2];
    const nextFace = faceIndices;

    if (areFacesAdjacentByVertices(currentFaceIndex, i, position)) {
      const nextNormal = calculateNormalForFace(nextFace, position);

      const angleBetweenNormals = currentNormal.angleTo(nextNormal);

      if (angleBetweenNormals < thresholdAngle) {
        group.push(nextFace);
        visitedFaces.add(i);
        groupConnectedFacesByNormal(
          i,
          nextNormal,
          position,
          visitedFaces,
          group,
          thresholdAngle
        );
      }
    }
  }
}

function areFacesAdjacentByVertices(faceIndex1, faceIndex2, position) {
  const indices1 = [faceIndex1 * 3, faceIndex1 * 3 + 1, faceIndex1 * 3 + 2];
  const indices2 = [faceIndex2 * 3, faceIndex2 * 3 + 1, faceIndex2 * 3 + 2];

  let sharedVertices = 0;

  indices1.forEach((v1) => {
    const v1Position = new THREE.Vector3().fromBufferAttribute(position, v1);
    indices2.forEach((v2) => {
      const v2Position = new THREE.Vector3().fromBufferAttribute(position, v2);
      if (v1Position.equals(v2Position)) {
        sharedVertices++;
      }
    });
  });

  return sharedVertices >= 2;
}

export function calculateNormalForFace(face, position) {
  const v0 = new THREE.Vector3().fromBufferAttribute(position, face[0]);
  const v1 = new THREE.Vector3().fromBufferAttribute(position, face[1]);
  const v2 = new THREE.Vector3().fromBufferAttribute(position, face[2]);

  const edge1 = new THREE.Vector3().subVectors(v1, v0);
  const edge2 = new THREE.Vector3().subVectors(v2, v0);

  const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
  return normal;
}