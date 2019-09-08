//__include state.inc.js

let state = state_createRoot();
let newPlayerId = 0;
let terrainData;
let requestedTerrainData = 0;

let drawASCIIterrain = () => {
    for (let y = 0; y < 25; ++y) {
        let row = '';
        for (let x = 0; x < 50; ++x) {
            row += (terrainData[Math.floor(x/50*256)+256*Math.floor(y/25*256)] > 0.5 ? '#' : ' ');
        }
        console.log(row);
    }
};

let parseUploadedTerrainData = data => {
    terrainData = [];
    let buf = Buffer.from(data, 'base64');   // TODO verify that PR allowing Buffer API got merged, otherwise need to use another solution
    for (let i = 0; i < buf.length; i += 4)
        terrainData.push(buf.readFloatLE(i));

    console.log('Server received heightmap:');
    drawASCIIterrain();
};

setInterval(() => {
    state_update(state);
    state_emitToAllPlayers(state);
}, G_TICK_MILLIS);

module.exports = socket => {
    let self = state_createPlayer(socket, newPlayerId++);
    state.$playerStates.push(self);

    socket.on(G_MSG_KEY_DOWN, keyCode => {
        if (self.$keysDown.indexOf(keyCode) < 0) self.$keysDown.push(keyCode);
    });

    socket.on(G_MSG_KEY_UP, keyCode => {
        let index = self.$keysDown.indexOf(keyCode);
        if (index >= 0) self.$keysDown.splice(index, 1);
    });

    socket.on('disconnect', () => {
        state.$playerStates.splice(state.$playerStates.indexOf(self), 1);
    });

    if (!requestedTerrainData) {
        requestedTerrainData = 1;
        socket.on(G_MSG_UPLOAD_TERRAIN, parseUploadedTerrainData);
        socket.emit(G_MSG_REQUEST_TERRAIN);
    }
};