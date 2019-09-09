
let collision_rawData=0;

let collision_parseUploadedData = data => {
    collision_rawData = [];
    let buf = Buffer.from(data, 'base64');
    for (let i = 0; i < buf.length; i += 4)
        collision_rawData.push(buf.readFloatLE(i));
};

let collision_sampleHeightMap = (x, z) => {
    if (!collision_rawData) return 0;
    let i = [x,z].map(a =>
        math_clamp(0, G_TERRAIN_UPLOAD_RESOLUTION, Math.round(G_TERRAIN_UPLOAD_RESOLUTION * a / G_TERRAIN_WORLDSPACE_SIZE)));
    return collision_rawData[i[0]+i[1]*G_TERRAIN_UPLOAD_RESOLUTION] * G_TERRAIN_WORLDSPACE_HEIGHT;
};

let collision_sampleWorldNormal = (x, z) => {
    if (!collision_rawData) return [0,1,0];

    let offset = G_TERRAIN_UPLOAD_RESOLUTION / G_TERRAIN_WORLDSPACE_SIZE;
    let h0 = collision_sampleHeightMap(x,z);
    let hx = collision_sampleHeightMap(x + offset, z);
    let hz = collision_sampleHeightMap(x, z + offset);

    let vx = vec3_normalize([offset, hx - h0,      0]);
    let vz = vec3_normalize([     0, hz - h0, offset]);

    return vec3_normalize(vec3_cross(vz, vx));
};