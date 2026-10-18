import {
    Bone,
    Matrix,
    Mesh,
    Skeleton,
    VertexBuffer,
    MeshBuilder,
} from '@babylonjs/core';

const clamp01 = value => Math.max(0, Math.min(1, value));
const smoothstep = value => {
    const t = clamp01(value);
    return t * t * (3 - 2 * t);
};

const bones = [
    ['root', null, 0, 0, 0],
    ['pelvis', 'root', 0, 0.82, 0],
    ['spine', 'pelvis', 0, 0.08, 0],
    ['chest', 'spine', 0, 0.32, 0],
    ['neck', 'chest', 0, 0.29, 0],
    ['head', 'neck', 0, 0.11, 0],
    ['shoulderL', 'chest', -0.2, 0.22, 0],
    ['upperArmL', 'shoulderL', -0.04, -0.07, 0],
    ['forearmL', 'upperArmL', 0, -0.25, 0],
    ['handL', 'forearmL', 0, -0.2, 0],
    ['shoulderR', 'chest', 0.2, 0.22, 0],
    ['upperArmR', 'shoulderR', 0.04, -0.07, 0],
    ['forearmR', 'upperArmR', 0, -0.25, 0],
    ['handR', 'forearmR', 0, -0.2, 0],
    ['thighL', 'pelvis', -0.11, -0.04, 0],
    ['calfL', 'thighL', 0, -0.36, 0],
    ['footL', 'calfL', 0, -0.34, 0.03],
    ['thighR', 'pelvis', 0.11, -0.04, 0],
    ['calfR', 'thighR', 0, -0.36, 0],
    ['footR', 'calfR', 0, -0.34, 0.03],
];

function makeSkeleton(scene, name) {
    const skeleton = new Skeleton(`${name}-skeleton`, `${name}-skeleton`, scene);
    const byName = {};
    for (const [boneName, parentName, x, y, z] of bones) {
        const parent = parentName ? byName[parentName] : null;
        byName[boneName] = new Bone(
            `${name}-${boneName}`,
            skeleton,
            parent,
            Matrix.Translation(x, y, z),
        );
    }
    skeleton.computeAbsoluteMatrices(true);
    return { skeleton, bones: byName };
}

function appendEllipsoid(geometry, sphere, {
    center,
    scale,
    color,
    bone,
    blendBone,
    blendAt,
}) {
    const vertexOffset = geometry.positions.length / 3;
    const sourceVertexCount = sphere.positions.length / 3;
    const [blendStart, blendEnd] = blendAt ?? [0, 0];

    for (let i = 0; i < sourceVertexCount; i++) {
        const x = sphere.positions[i * 3] * scale[0];
        const y = sphere.positions[i * 3 + 1] * scale[1];
        const z = sphere.positions[i * 3 + 2] * scale[2];
        const worldY = center[1] + y;
        geometry.positions.push(center[0] + x, worldY, center[2] + z);

        const nx = sphere.normals[i * 3] / scale[0];
        const ny = sphere.normals[i * 3 + 1] / scale[1];
        const nz = sphere.normals[i * 3 + 2] / scale[2];
        const normalLength = Math.hypot(nx, ny, nz) || 1;
        geometry.normals.push(nx / normalLength, ny / normalLength, nz / normalLength);
        geometry.colors.push(color.r, color.g, color.b, 1);

        const secondWeight = blendBone
            ? smoothstep((worldY - blendStart) / (blendEnd - blendStart))
            : 0;
        geometry.boneIndices.push(bone, blendBone ?? 0, 0, 0);
        geometry.boneWeights.push(1 - secondWeight, secondWeight, 0, 0);
    }

    for (const index of sphere.indices) {
        geometry.indices.push(vertexOffset + index);
    }

    for (let i = 0; i < sourceVertexCount; i++) {
        const source = i * 2;
        geometry.uvs.push(sphere.uvs[source], sphere.uvs[source + 1]);
    }
}

export function createPlayerSphereGeometry(scene) {
    const sphere = MeshBuilder.CreateSphere('skinned-player-source', { segments: 8, diameter: 1 }, scene);
    const geometry = {
        positions: sphere.getVerticesData(VertexBuffer.PositionKind),
        normals: sphere.getVerticesData(VertexBuffer.NormalKind),
        uvs: sphere.getVerticesData(VertexBuffer.UVKind),
        indices: sphere.getIndices(),
    };
    sphere.dispose();
    if (!geometry.positions || !geometry.normals || !geometry.uvs || !geometry.indices) {
        throw new Error('Could not create the skinned-player source geometry.');
    }
    return geometry;
}

export function createSkinnedPlayer(scene, name, sphere, colors, material) {
    const { skeleton, bones: boneMap } = makeSkeleton(scene, name);
    const boneIndex = Object.fromEntries(
        skeleton.bones.map((bone, index) => [bone.name.slice(name.length + 1), index]),
    );
    const geometry = {
        positions: [],
        normals: [],
        uvs: [],
        colors: [],
        indices: [],
        boneIndices: [],
        boneWeights: [],
    };
    const part = (center, scale, color, primary, secondary, blendAt) => appendEllipsoid(geometry, sphere, {
        center,
        scale,
        color,
        bone: boneIndex[primary],
        blendBone: secondary ? boneIndex[secondary] : undefined,
        blendAt,
    });
    const { jersey, shorts, trim, skin, hair, sock, boot, eye, keeper } = colors;
    const top = keeper ?? jersey;

    part([0, 0.82, 0], [0.2, 0.17, 0.13], shorts, 'pelvis', 'spine', [0.83, 0.9]);
    part([0, 1.04, 0], [0.205, 0.24, 0.125], jersey, 'spine', 'chest', [1.0, 1.18]);
    part([0, 1.29, 0], [0.235, 0.27, 0.14], top, 'spine', 'chest', [1.17, 1.34]);
    part([0, 1.43, 0.002], [0.12, 0.055, 0.13], trim, 'chest');
    part([0, 1.52, 0], [0.066, 0.09, 0.07], skin, 'neck');
    part([0, 1.7, 0], [0.125, 0.17, 0.112], skin, 'head');
    part([0, 1.77, -0.006], [0.13, 0.085, 0.118], hair, 'head');
    part([0, 1.68, -0.077], [0.105, 0.105, 0.053], hair, 'head');
    part([-0.127, 1.7, 0], [0.025, 0.044, 0.034], skin, 'head');
    part([0.127, 1.7, 0], [0.025, 0.044, 0.034], skin, 'head');
    part([-0.044, 1.714, 0.103], [0.014, 0.018, 0.008], eye, 'head');
    part([0.044, 1.714, 0.103], [0.014, 0.018, 0.008], eye, 'head');
    part([0, 1.685, 0.111], [0.018, 0.025, 0.018], skin, 'head');
    part([0, 1.57, 0.074], [0.087, 0.035, 0.025], trim, 'neck');

    for (const side of [-1, 1]) {
        const suffix = side < 0 ? 'L' : 'R';
        const arm = `upperArm${suffix}`;
        const forearm = `forearm${suffix}`;
        const hand = `hand${suffix}`;
        const thigh = `thigh${suffix}`;
        const calf = `calf${suffix}`;
        const foot = `foot${suffix}`;
        part([side * 0.225, 1.34, 0], [0.108, 0.145, 0.11], top, arm, 'chest', [1.29, 1.43]);
        part([side * 0.255, 1.16, 0], [0.073, 0.155, 0.075], skin, arm, forearm, [1.2, 1.06]);
        part([side * 0.255, 0.96, 0], [0.066, 0.132, 0.067], skin, forearm, hand, [0.9, 0.82]);
        part([side * 0.255, 0.81, 0.005], [0.064, 0.075, 0.057], skin, hand);
        for (let finger = 0; finger < 4; finger++) {
            part([side * (0.217 + finger * 0.025), 0.746, 0.027], [0.012, 0.045, 0.014], skin, hand);
        }

        part([side * 0.18, 1.22, 0.13], [0.036, 0.21, 0.018], trim, 'chest', 'spine', [1.13, 1.31]);
        part([side * 0.17, 0.82, 0.112], [0.025, 0.12, 0.018], trim, 'pelvis');

        part([side * 0.112, 0.64, 0], [0.095, 0.22, 0.098], skin, thigh, calf, [0.54, 0.43]);
        part([side * 0.112, 0.265, 0], [0.073, 0.19, 0.074], sock, calf);
        part([side * 0.112, 0.087, 0.073], [0.082, 0.052, 0.16], boot, foot);
        part([side * 0.112, 0.119, 0.095], [0.043, 0.012, 0.071], trim, foot);
    }

    const mesh = new Mesh(name, scene);
    mesh.setVerticesData(VertexBuffer.PositionKind, geometry.positions, false, 3);
    mesh.setVerticesData(VertexBuffer.NormalKind, geometry.normals, false, 3);
    mesh.setVerticesData(VertexBuffer.UVKind, geometry.uvs, false, 2);
    mesh.setVerticesData(VertexBuffer.ColorKind, geometry.colors, false, 4);
    mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, geometry.boneIndices, false, 4);
    mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, geometry.boneWeights, false, 4);
    mesh.setIndices(geometry.indices);
    mesh.material = material;
    mesh.skeleton = skeleton;
    mesh.numBoneInfluencers = 4;
    mesh.computeBonesUsingShaders = true;
    mesh.isPickable = false;
    skeleton.computeAbsoluteMatrices(true);
    skeleton.prepare(true);

    return { mesh, skeleton, bones: boneMap };
}

export function setBonePitch(bone, pitch) {
    bone.setYawPitchRoll(0, pitch, 0);
}
