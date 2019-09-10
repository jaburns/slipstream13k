
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

    let offset = G_TERRAIN_WORLDSPACE_SIZE / G_TERRAIN_UPLOAD_RESOLUTION;
    let h0 = collision_sampleHeightMap(x,z);
    let hx = collision_sampleHeightMap(x+offset,z);
    let hz = collision_sampleHeightMap(x,z+offset);

    let vx = [offset, hx - h0,      0];
    let vz = [     0, hz - h0, offset];

    return vec3_normalize(vec3_cross(vz, vx));
};

let collision_test = (position, velocity) => {
    let normal = 0;

    if (collision_sampleHeightMap(position[0], position[2]) > position[1] - G_SHIP_RADIUS)
        normal = collision_sampleWorldNormal(position[0], position[2]);
    [0.707,1].map(r => {
        for (let i = 0; i < 6; i += Math.PI / 4) {
            let xx = position[0] + G_SHIP_RADIUS*r*Math.cos(i);
            let yy = position[2] + G_SHIP_RADIUS*r*Math.sin(i);

            let worldHeight = collision_sampleHeightMap(xx, yy);

            let r1 = r > .8 ? 0 : r;
            if (worldHeight > position[1] - r1*G_SHIP_RADIUS)
                normal = collision_sampleWorldNormal(xx, yy);
        }
    });

    if (normal && vec3_dot(velocity, normal) <= 0) {
        return vec3_reflect(velocity, normal, 1.5);
    }

    return 0;
};