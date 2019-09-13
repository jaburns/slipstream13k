/**
 * Vector/matrix functions pulled and modified from gl-matrix library
 * https://github.com/toji/gl-matrix
 */

let math_clamp = (a, b, x) => x<a?a:x>b?b:x;

let vec3_plus = (a, b) => a.map((x,i)=>x+b[i]);
let vec3_minus = (a, b) => a.map((x,i)=>x-b[i]);
let vec3_lerp = (a, b, t) => a.map((x,i)=> x + math_clamp(0,1,t)*(b[i]-x));

let math_range = (a, b) => Array(b-a).fill().map((x,i)=>i+a);

let vec3_dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];

let vec3_cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
];

let vec3_reflect = (v, n, elasticity) => // elasticity: 1: no bounce -> 2: full bounce
    vec3_minus(v, n.map(x=>x*elasticity*vec3_dot(v, n)));

let vec3_length = a => Math.sqrt(a[0]*a[0] + a[1]*a[1] + a[2]*a[2]);
let vec3_normalize = a => a.map(x=>x/vec3_length(a));

let quat_length = a => Math.sqrt(a[0]*a[0] + a[1]*a[1] + a[2]*a[2] + a[3]*a[3]);
let quat_normalize = a => a.map(x=>x/quat_length(a));

let vec3_bufferMap = (buffer, fn) => {
    let result = [];
    for (let i = 0; i < buffer.length - 2; i += 3)
        fn([buffer[i],buffer[i+1],buffer[i+2]]).map(x => result.push(x));
    return result;
};

let quat_setAxisAngle = (axis, rad) => {
    rad *= .5;
    let s = Math.sin(rad);
    return [s * axis[0], s * axis[1], s * axis[2], Math.cos(rad)];
};

let quat_mul = (a, b) => [
    a[0] * b[3] + a[3] * b[0] + a[1] * b[2] - a[2] * b[1],
    a[1] * b[3] + a[3] * b[1] + a[2] * b[0] - a[0] * b[2],
    a[2] * b[3] + a[3] * b[2] + a[0] * b[1] - a[1] * b[0],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
];

let quat_conj = a => [-a[0], -a[1], -a[2], a[3]];

let quat_fromYawPitchRoll = (yaw, pitch, roll) => {
    return quat_mul(
        quat_mul(quat_setAxisAngle([0,1,0], yaw), quat_setAxisAngle([1,0,0], pitch)),
        quat_setAxisAngle([0,0,1], roll)
    );
};

let quat_mulVec3 = (q, v) => mat4_mulNormal(mat4_fromRotationTranslationScale(q,[0,0,0],[1,1,1]), v);

/*
    let mat4_perspective = (aspect, near, far) => {
    //  let f = 1.0 / Math.tan(fovy / 2), nf = 1 / (near - far)
        let f = 1, nf = 1 / (near - far);  // Hard-coded FOV to PI / 2 here.

        return [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, (2 * far * near) * nf, 0
        ];
    };
*/

// Transform a vec3 my a mat4. w is assumed 1 in the vec4 used internally.
let mat4_mulPosition = (m, a) => {
    let x = a[0], y = a[1], z = a[2];
    let w = m[3] * x + m[7] * y + m[11] * z + m[15];
    w = w || 1;
    return [
        (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
        (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
        (m[2] * x + m[6] * y + m[10] * z + m[14]) / w
    ];
};

// Multiply a vec3 by the upper left mat3 of a mat4.
let mat4_mulNormal = (m, a) => [
    a[0]*m[0] + a[1]*m[4] + a[2]*m[8],
    a[0]*m[1] + a[1]*m[5] + a[2]*m[9],
    a[0]*m[2] + a[1]*m[6] + a[2]*m[10]
];

let mat4_identity = () => math_range(0,16).map(x=>x%5?0:1);

let mat4_multiply = (a, b) => 
    math_range(0,16).map((x,i,j) => (
        i=4*(x/4|0), j=x%4,
        b[i]*a[j] + b[i+1]*a[j+4] + b[i+2]*a[j+8] + b[i+3]*a[j+12]
    ));

let mat4_fromRotationTranslationScale = (q, v, s) => {
    let x = q[0], y = q[1], z = q[2], w = q[3];

    return [
        (1 - (y*y*2 + z*z*2)) * s[0],
        (x*y*2 + w*z*2) * s[0],
        (x*z*2 - w*y*2) * s[0],
        0,
            (x*y*2 - w*z*2) * s[1],
            (1 - (x*x*2 + z*z*2)) * s[1],
            (y*z*2 + w*x*2) * s[1],
            0,
        (x*z*2 + w*y*2) * s[2],
        (y*z*2 - w*x*2) * s[2],
        (1 - (x*x*2 + y*y*2)) * s[2],
        0,
            v[0],
            v[1],
            v[2],
            1
    ];
};