//__include shaders.gen.js
//__include math.inc.js
//__include gfx.inc.js
//__include terrainGen.inc.js

let blobs = __binaryBlobs;

let trackCanvas = terrainGen_loadTrackCanvasFromBlob(blobs[G_MAP_BLOB]);

document.body.innerHTML = `
<h1>Terrain Gen Test</h1>
<canvas id="c1" width=512 height=512></canvas>
`;

let ctx = document.getElementById('c1').getContext('2d');
ctx.drawImage(trackCanvas, 0, 0);