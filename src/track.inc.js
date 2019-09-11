let track_nodes;

let track_parseUploadedCurveHandles = pts => {
    track_nodes = [];

    let bezierMap = (a, b, c, d, t, u) => u*u*u*a + 3*u*u*t*b + 3*u*t*t*c + t*t*t*d;

    for (let i = 0; i < pts.length; i += 6) {
        let j = (i + 6) % pts.length;
        for (let t = 0; t < 1; t += 0.05)
            track_nodes.push([
                bezierMap(pts[i], pts[i+2], pts[i+4], pts[j], t, 1-t),
                bezierMap(pts[i+1], pts[i+3], pts[i+5], pts[j+1], t, 1-t)
            ]);
    }
};

let track_getLapPosition = pos3 =>
    track_nodes
        .map((n,dx,dz) => (
            dx = pos3[0] - n[0]*G_TERRAIN_WORLDSPACE_SIZE,
            dz = pos3[2] - n[1]*G_TERRAIN_WORLDSPACE_SIZE,
            [dx*dx+dz*dz, i]
        ))
        .sort((a,b) => b[0] - a[0])
        .pop()[1]
            / track_nodes.length;

let track_getStartYaw = () => 
    Math.atan2(track_nodes[0][0]-track_nodes[1][0], track_nodes[0][1]-track_nodes[1][1]);

let track_getStartPosition = i => {
    let result = quat_mulVec3(
        quat_setAxisAngle([0,1,0], track_getStartYaw()),
        [
            ((i%2)*2-1)*G_START_LINE_HORIZONTAL_STAGGER,
            G_TERRAIN_WORLDSPACE_HEIGHT - G_START_LINE_VERTICAL_BASE - ((i/2)|0)*G_START_LINE_VERTICAL_STAGGER,
            0
        ]
    );

    result[0] += track_nodes[0][0] * G_TERRAIN_WORLDSPACE_SIZE;
    result[2] += track_nodes[0][1] * G_TERRAIN_WORLDSPACE_SIZE;
    return result;
};
