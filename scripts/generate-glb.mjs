/**
 * Programmatic GLB Generator for AgentSphere.
 * Generates valid binary glTF 2.0 (.glb) 3D models without requiring Blender or heavy external tools.
 */

import fs from 'node:fs';
import path from 'node:path';

function createOctahedronGeometry(radius, scaleY = 1.0) {
  const verts = [
    [0, radius * scaleY, 0],   // 0: top
    [0, -radius * scaleY, 0],  // 1: bottom
    [radius, 0, 0],            // 2: +X
    [-radius, 0, 0],           // 3: -X
    [0, 0, radius],            // 4: +Z
    [0, 0, -radius],           // 5: -Z
  ];

  const faces = [
    [0, 4, 2],
    [0, 2, 5],
    [0, 5, 3],
    [0, 3, 4],
    [1, 2, 4],
    [1, 5, 2],
    [1, 3, 5],
    [1, 4, 3],
  ];

  const positions = new Float32Array(faces.length * 3 * 3);
  const normals = new Float32Array(faces.length * 3 * 3);
  const indices = new Uint16Array(faces.length * 3);

  for (let i = 0; i < faces.length; i++) {
    const [i0, i1, i2] = faces[i];
    const v0 = verts[i0];
    const v1 = verts[i1];
    const v2 = verts[i2];

    const ux = v1[0] - v0[0];
    const uy = v1[1] - v0[1];
    const uz = v1[2] - v0[2];

    const vx = v2[0] - v0[0];
    const vy = v2[1] - v0[1];
    const vz = v2[2] - v0[2];

    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;

    const baseVert = i * 3;
    const coords = [v0, v1, v2];
    for (let j = 0; j < 3; j++) {
      const idx = (baseVert + j) * 3;
      positions[idx] = coords[j][0];
      positions[idx + 1] = coords[j][1];
      positions[idx + 2] = coords[j][2];

      normals[idx] = nx;
      normals[idx + 1] = ny;
      normals[idx + 2] = nz;

      indices[baseVert + j] = baseVert + j;
    }
  }

  return { positions, normals, indices };
}

function createTorusRingGeometry(
  majorRadius,
  tubeRadius,
  radialSegments = 8,
  tubularSegments = 24,
) {
  const vertexCount = (radialSegments + 1) * (tubularSegments + 1);
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const indicesList = [];

  let vIdx = 0;
  for (let j = 0; j <= radialSegments; j++) {
    for (let i = 0; i <= tubularSegments; i++) {
      const u = (i / tubularSegments) * Math.PI * 2;
      const v = (j / radialSegments) * Math.PI * 2;

      const cx = majorRadius * Math.cos(u);
      const cz = majorRadius * Math.sin(u);

      const x = (majorRadius + tubeRadius * Math.cos(v)) * Math.cos(u);
      const y = tubeRadius * Math.sin(v);
      const z = (majorRadius + tubeRadius * Math.cos(v)) * Math.sin(u);

      positions[vIdx * 3] = x;
      positions[vIdx * 3 + 1] = y;
      positions[vIdx * 3 + 2] = z;

      let nx = x - cx;
      let ny = y;
      let nz = z - cz;
      const len = Math.hypot(nx, ny, nz) || 1;
      normals[vIdx * 3] = nx / len;
      normals[vIdx * 3 + 1] = ny / len;
      normals[vIdx * 3 + 2] = nz / len;

      vIdx++;
    }
  }

  for (let j = 1; j <= radialSegments; j++) {
    for (let i = 1; i <= tubularSegments; i++) {
      const a = (tubularSegments + 1) * j + i - 1;
      const b = (tubularSegments + 1) * (j - 1) + i - 1;
      const c = (tubularSegments + 1) * (j - 1) + i;
      const d = (tubularSegments + 1) * j + i;

      indicesList.push(a, b, d);
      indicesList.push(b, c, d);
    }
  }

  return {
    positions,
    normals,
    indices: new Uint16Array(indicesList),
  };
}

function buildGlbBuffer(parts) {
  const bufferViews = [];
  const accessors = [];
  const materials = [];
  const meshes = [];
  const nodes = [];
  const binaryChunks = [];

  let byteOffset = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let k = 0; k < part.positions.length; k += 3) {
      const x = part.positions[k];
      const y = part.positions[k + 1];
      const z = part.positions[k + 2];
      if (x < min[0]) min[0] = x;
      if (y < min[1]) min[1] = y;
      if (z < min[2]) min[2] = z;
      if (x > max[0]) max[0] = x;
      if (y > max[1]) max[1] = y;
      if (z > max[2]) max[2] = z;
    }

    const posBuf = Buffer.from(part.positions.buffer, part.positions.byteOffset, part.positions.byteLength);
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: posBuf.byteLength,
      target: 34962,
    });
    const posAccessorIdx = accessors.length;
    accessors.push({
      bufferView: bufferViews.length - 1,
      byteOffset: 0,
      componentType: 5126,
      count: part.positions.length / 3,
      type: 'VEC3',
      min,
      max,
    });
    binaryChunks.push(posBuf);
    byteOffset += posBuf.byteLength;

    const normBuf = Buffer.from(part.normals.buffer, part.normals.byteOffset, part.normals.byteLength);
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: normBuf.byteLength,
      target: 34962,
    });
    const normAccessorIdx = accessors.length;
    accessors.push({
      bufferView: bufferViews.length - 1,
      byteOffset: 0,
      componentType: 5126,
      count: part.normals.length / 3,
      type: 'VEC3',
    });
    binaryChunks.push(normBuf);
    byteOffset += normBuf.byteLength;

    const idxRaw = Buffer.from(part.indices.buffer, part.indices.byteOffset, part.indices.byteLength);
    const padLen = (4 - (idxRaw.byteLength % 4)) % 4;
    const idxBuf = padLen > 0 ? Buffer.concat([idxRaw, Buffer.alloc(padLen)]) : idxRaw;

    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: idxRaw.byteLength,
      target: 34963,
    });
    const idxAccessorIdx = accessors.length;
    accessors.push({
      bufferView: bufferViews.length - 1,
      byteOffset: 0,
      componentType: 5123,
      count: part.indices.length,
      type: 'SCALAR',
    });
    binaryChunks.push(idxBuf);
    byteOffset += idxBuf.byteLength;

    const matIdx = materials.length;
    materials.push({
      name: `${part.name}-mat`,
      pbrMetallicRoughness: {
        baseColorFactor: part.color,
        metallicFactor: part.metallic,
        roughnessFactor: part.roughness,
      },
      emissiveFactor: part.emissive,
    });

    const meshIdx = meshes.length;
    meshes.push({
      name: `${part.name}-mesh`,
      primitives: [
        {
          attributes: {
            POSITION: posAccessorIdx,
            NORMAL: normAccessorIdx,
          },
          indices: idxAccessorIdx,
          material: matIdx,
        },
      ],
    });

    nodes.push({
      name: part.name,
      mesh: meshIdx,
      translation: part.translation || [0, 0, 0],
    });
  }

  const rootNodeIdx = nodes.length;
  nodes.push({
    name: 'CompanionDroneRoot',
    children: parts.map((_, idx) => idx),
  });

  const gltfJson = {
    asset: {
      version: '2.0',
      generator: 'AgentSphere Procedural GLB Exporter v1.0',
    },
    scene: 0,
    scenes: [
      {
        name: 'Scene',
        nodes: [rootNodeIdx],
      },
    ],
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [
      {
        byteLength: byteOffset,
      },
    ],
  };

  const jsonStr = JSON.stringify(gltfJson);
  const jsonPad = (4 - (Buffer.byteLength(jsonStr, 'utf8') % 4)) % 4;
  const jsonBuf = Buffer.from(jsonStr + ' '.repeat(jsonPad), 'utf8');

  const binBuf = Buffer.concat(binaryChunks);

  const totalByteLength = 12 + 8 + jsonBuf.byteLength + 8 + binBuf.byteLength;
  const glb = Buffer.alloc(totalByteLength);

  glb.writeUInt32LE(0x46546c67, 0);
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(totalByteLength, 8);

  glb.writeUInt32LE(jsonBuf.byteLength, 12);
  glb.writeUInt32LE(0x4e4f534a, 16);
  jsonBuf.copy(glb, 20);

  const binChunkOffset = 20 + jsonBuf.byteLength;
  glb.writeUInt32LE(binBuf.byteLength, binChunkOffset);
  glb.writeUInt32LE(0x004e4942, binChunkOffset + 4);
  binBuf.copy(glb, binChunkOffset + 8);

  return glb;
}

const coreGeom = createOctahedronGeometry(0.065, 1.15);
const haloRingGeom = createTorusRingGeometry(0.105, 0.008, 8, 24);
const lowerRingGeom = createTorusRingGeometry(0.075, 0.005, 8, 20);

const droneParts = [
  {
    name: 'companion-core',
    positions: coreGeom.positions,
    normals: coreGeom.normals,
    indices: coreGeom.indices,
    color: [0.0, 0.898, 1.0, 1.0],
    emissive: [0.0, 0.45, 0.65],
    metallic: 0.3,
    roughness: 0.2,
    translation: [0, 0, 0],
  },
  {
    name: 'companion-halo-ring',
    positions: haloRingGeom.positions,
    normals: haloRingGeom.normals,
    indices: haloRingGeom.indices,
    color: [0.12, 0.16, 0.28, 1.0],
    emissive: [0.0, 0.25, 0.4],
    metallic: 0.8,
    roughness: 0.25,
    translation: [0, 0.01, 0],
  },
  {
    name: 'companion-stabilizer-ring',
    positions: lowerRingGeom.positions,
    normals: lowerRingGeom.normals,
    indices: lowerRingGeom.indices,
    color: [0.74, 0.0, 1.0, 1.0],
    emissive: [0.35, 0.0, 0.55],
    metallic: 0.5,
    roughness: 0.3,
    translation: [0, -0.045, 0],
  },
];

const glbBytes = buildGlbBuffer(droneParts);
const outputPath = path.resolve('public/models/companion-drone.glb');
fs.writeFileSync(outputPath, glbBytes);
console.log(`Generated valid GLB: ${outputPath} (${glbBytes.byteLength} bytes)`);
