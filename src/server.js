
//__include track.inc.js
//__include collision.inc.js
//__include state.inc.js

let raceStates = {};
let newPlayerId = 1;
let ready = 0;

let interval = 0;

let updateRaceCollectionState = () => {
    let usedRooms = 0;
    let emptyRooms = [];

    for (let k in raceStates) {
        if (raceStates[k].$playerStates.length < 1) emptyRooms.push(k);
        else usedRooms++;
    }

    emptyRooms.forEach(k => { delete raceStates[k]; });

    if (usedRooms < 1 && interval) {
        clearInterval(interval);
        interval = 0;
    }
    if (usedRooms > 0 && !interval) {
        interval = setInterval(() => {
            if (ready) {
                for (let k in raceStates) {
                    state_update(raceStates[k]);
                    state_emitToAllPlayers(raceStates[k]);
                }
            }
        }, G_TICK_MILLIS);
    }
};

module.exports = socket => {
    let whenReady = fn => {
        if (!ready) setTimeout(() => whenReady(fn), 100);
        else fn();
    };

    whenReady(() => {
        socket.on(G_MSG_UPLOAD_ROOM_CODE, code => {
            if (!raceStates[code])
                raceStates[code] = state_createRoot();

            if (raceStates[code].$raceCountdown < 1) {
                socket.emit(G_MSG_RETURN_ROOM_SORRY);
                return;
            }

            let self = state_playerJoin(raceStates[code], socket, newPlayerId++);
            updateRaceCollectionState();

            socket.on(G_MSG_KEY_DOWN, keyCode => {
                if (self.$keysDown.indexOf(keyCode) < 0) self.$keysDown.push(keyCode);
            });

            socket.on(G_MSG_KEY_UP, keyCode => {
                let index = self.$keysDown.indexOf(keyCode);
                if (index >= 0) self.$keysDown.splice(index, 1);
            });

            socket.on('disconnect', () => {
                state_playerLeave(raceStates[code], self);
                updateRaceCollectionState();
            });
        });

        socket.emit(G_MSG_REQUEST_ROOM_CODE);
    });

    if (!ready) {
        socket.on(G_MSG_UPLOAD_TERRAIN, data => {
            if (ready) return;
            ready = 1;

            collision_parseUploadedData(data.$terrain);
            track_parseUploadedCurveHandles(data.$mapHandles);
        });
        socket.emit(G_MSG_REQUEST_TERRAIN);
    }
};