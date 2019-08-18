const _ = require('lodash');
const gl = require('../webglContext.json');
const webglFuncs = Object.keys(gl).map(x => gl[x] === null ? x : null).filter(x => x !== null).concat(['releaseShaderCompiler'])

const findHashCollisions = (hashFunc, items) => {
    const hashes = items.map(hashFunc);
    const dupes = _.uniq(_.filter(hashes, (v, i, a) => a.indexOf(v) !== i));

    return items
        .map((x, i) => dupes.indexOf(hashes[i]) >= 0 ? x : null)
        .filter(x => x !== null);
};

const hashFunc1 = k => {
    let n=k.split('').map(x=>x.charCodeAt(0)).reduce((a,v,j)=>a+v*j*73%1e6),s=String.fromCharCode(97+n%26)+(0|n/26%36).toString(36);
    return s;
};

const hashFunc2 = (z,a,b) => k => {
    let i=0,n=0,s;for(;i++<k.length;)n+=k.charCodeAt(i)*i*z%eval(a+'e'+b);s=String.fromCharCode(97+n%26)+(0|n/26%36).toString(36);
    return s;
};

for (let a = 0; a < 10; ++a)
for (let b = 0; b < 10; ++b)
for (let i = 0; i < 1000; ++i) {
    const cols = findHashCollisions(hashFunc2(i,a,b), webglFuncs);
    if (cols.length <= 3) {
        console.log(`z=${i} mod=${a}e${b} collisions=${cols.length}\n${cols}`);
    }
}