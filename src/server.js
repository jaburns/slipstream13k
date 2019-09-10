//__include track.inc.js
//__include collision.inc.js
//__include state.inc.js

let state = state_createRoot();
let newPlayerId = 0;
let requestedTerrainData = 0;
let ready = 0;

setInterval(() => {
    if (!ready) return;
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
        socket.on(G_MSG_UPLOAD_TERRAIN, data => {
            collision_parseUploadedData(data.$terrain);
            track_parseUploadedCurveHandles(data.$mapHandles);
            ready = 1;
        });
        socket.emit(G_MSG_REQUEST_TERRAIN);
    }
};