let HEIGHTMAP_SIZE = 256;

let _terrainGen_signedDistanceFill = ctx => {
    let data = ctx.getImageData(0, 0, HEIGHTMAP_SIZE, HEIGHTMAP_SIZE).data;
    let outData = ctx.createImageData(HEIGHTMAP_SIZE,HEIGHTMAP_SIZE);

    let findEdgeDistance = (x, y) => {
        let candidates = [];
        let maxRadius = HEIGHTMAP_SIZE;

        let test = (ix, iy) => {
            if (ix < 0 || ix >= HEIGHTMAP_SIZE || iy < 0 || iy >= HEIGHTMAP_SIZE) return false;
            return data[4*(ix+iy*HEIGHTMAP_SIZE)] > 128;
        };

        let pushTest = (ix, iy, radius) => {
            if (! test(ix, iy)) return;
            if (candidates.length < 1) maxRadius = 2*radius;
            let dx = ix-x, dy = iy-y;
            candidates.push(dx*dx + dy*dy);
        };

        for (let radius = 0; radius < maxRadius; ++radius)
        for (let o = -radius; o <= radius; ++o) {
            pushTest(x + o, y - radius, radius);
            pushTest(x + o, y + radius, radius);
            pushTest(x - radius, y + o, radius);
            pushTest(x + radius, y + o, radius);
        }

        if (candidates.length < 1) return HEIGHTMAP_SIZE;

        candidates.sort((a,b)=>a-b);
        return Math.sqrt(candidates[0]);
    };

    for (let x = 0; x < HEIGHTMAP_SIZE; ++x)
    for (let y = 0; y < HEIGHTMAP_SIZE; ++y)
    {
        var dist = findEdgeDistance(x, y);
        var color = 255*math_clamp01(dist / 32);

        if (color < 0) color = 0;
        if (color > 255) color = 255;

        [0,1,2,3].map(i=>
            outData.data[4*(x+y*HEIGHTMAP_SIZE)+i] = i<3?color:255
        );
    }

    ctx.putImageData(outData, 0, 0);
};

let terrainGen_loadTrackCanvasFromBlob = bytes => {
    let canvas = document.createElement('canvas');
    canvas.width = canvas.height = HEIGHTMAP_SIZE;

    let ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, HEIGHTMAP_SIZE, HEIGHTMAP_SIZE);
    ctx.strokeStyle = '#fff';

    let pts = [].slice.call(bytes).map(x => x/255*HEIGHTMAP_SIZE);

    for (let i = 0; i < pts.length; i += 6) {
        let j = (i + 6) % pts.length;

        ctx.moveTo(pts[i],pts[i+1]);
        ctx.bezierCurveTo(pts[i+2],pts[i+3], pts[i+4],pts[i+5], pts[j],pts[j+1]);
        ctx.stroke();
    }

    _terrainGen_signedDistanceFill(ctx);

    return canvas;
}