/**
 * Vector/matrix functions pulled and modified from gl-matrix library
 * https://github.com/toji/gl-matrix
 */

let vec3_minus = (a, b) => a.map((x,i)=>x-b[i]);

let vec3_cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
];

let vec3_normalize = a => {
    let len = a[0]*a[0] + a[1]*a[1] + a[2]*a[2];
    return a.map(x=>x/len);
};

let quat_setAxisAngle = (axis, rad) => {
    rad *= .5;
    let s = Math.sin(rad);
    return [s * axis[0], s * axis[1], s * axis[2], Math.cos(rad)];
};

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

let mat4_multiply = (a, b) => [
    b[0]*a[0] + b[1]*a[4] + b[2]*a[8] + b[3]*a[12],
    b[0]*a[1] + b[1]*a[5] + b[2]*a[9] + b[3]*a[13],
    b[0]*a[2] + b[1]*a[6] + b[2]*a[10] + b[3]*a[14],
    b[0]*a[3] + b[1]*a[7] + b[2]*a[11] + b[3]*a[15],
        b[4]*a[0] + b[5]*a[4] + b[6]*a[8] + b[7]*a[12],
        b[4]*a[1] + b[5]*a[5] + b[6]*a[9] + b[7]*a[13],
        b[4]*a[2] + b[5]*a[6] + b[6]*a[10] + b[7]*a[14],
        b[4]*a[3] + b[5]*a[7] + b[6]*a[11] + b[7]*a[15],
    b[8]*a[0] + b[9]*a[4] + b[10]*a[8] + b[11]*a[12],
    b[8]*a[1] + b[9]*a[5] + b[10]*a[9] + b[11]*a[13],
    b[8]*a[2] + b[9]*a[6] + b[10]*a[10] + b[11]*a[14],
    b[8]*a[3] + b[9]*a[7] + b[10]*a[11] + b[11]*a[15],
        b[12]*a[0] + b[13]*a[4] + b[14]*a[8] + b[15]*a[12],
        b[12]*a[1] + b[13]*a[5] + b[14]*a[9] + b[15]*a[13],
        b[12]*a[2] + b[13]*a[6] + b[14]*a[10] + b[15]*a[14],
        b[12]*a[3] + b[13]*a[7] + b[14]*a[11] + b[15]*a[15]
];

let mat4_invert = (a) => {
    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  
    let b00 = a00 * a11 - a01 * a10;
    let b01 = a00 * a12 - a02 * a10;
    let b02 = a00 * a13 - a03 * a10;
    let b03 = a01 * a12 - a02 * a11;
    let b04 = a01 * a13 - a03 * a11;
    let b05 = a02 * a13 - a03 * a12;
    let b06 = a20 * a31 - a21 * a30;
    let b07 = a20 * a32 - a22 * a30;
    let b08 = a20 * a33 - a23 * a30;
    let b09 = a21 * a32 - a22 * a31;
    let b10 = a21 * a33 - a23 * a31;
    let b11 = a22 * a33 - a23 * a32;
  
    // Calculate the determinant
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    det = 1.0 / det;
  
    return [(a11 * b11 - a12 * b10 + a13 * b09) * det,
            (a02 * b10 - a01 * b11 - a03 * b09) * det,
            (a31 * b05 - a32 * b04 + a33 * b03) * det,
            (a22 * b04 - a21 * b05 - a23 * b03) * det,
            (a12 * b08 - a10 * b11 - a13 * b07) * det,
            (a00 * b11 - a02 * b08 + a03 * b07) * det,
            (a32 * b02 - a30 * b05 - a33 * b01) * det,
            (a20 * b05 - a22 * b02 + a23 * b01) * det,
            (a10 * b10 - a11 * b08 + a13 * b06) * det,
            (a01 * b08 - a00 * b10 - a03 * b06) * det,
            (a30 * b04 - a31 * b02 + a33 * b00) * det,
            (a21 * b02 - a20 * b04 - a23 * b00) * det,
            (a11 * b07 - a10 * b09 - a12 * b06) * det,
            (a00 * b09 - a01 * b07 + a02 * b06) * det,
            (a31 * b01 - a30 * b03 - a32 * b00) * det,
            (a20 * b03 - a21 * b01 + a22 * b00) * det]
}

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

let Transform_create = () => ({ p: [0,0,0], r: [0,0,0,1], s: [1,1,1] });

let Transform_toMatrix = self => mat4_fromRotationTranslationScale(self.r, self.p, self.s);