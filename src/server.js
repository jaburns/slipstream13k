//__include state.inc.js

let players = [];
let newPlayerId = 0;

setInterval(() => {
    players.forEach(p => {
        state_updatePlayer(p);
    });

    for (let i = 0; i < players.length; ++i)
    {
        let packet = {
            myId: players[i].id,
            playerStates: players.map(p => ({id:p.id, x:p.x, y:p.y}))
        };

        players[i].s.emit('s', packet);
    }
}, G_TICK_MILLIS);

module.exports = socket => {
    let self = {
        id: newPlayerId++,
        s: socket,
        x: Math.random(),
        y: Math.random(),
        k: [],
    };

    players.push(self);

    socket.on('d', keyCode => {
        if (self.k.indexOf(keyCode) < 0) self.k.push(keyCode);
    });

    socket.on('u', keyCode => {
        let index = self.k.indexOf(keyCode);
        if (index >= 0) self.k.splice(index, 1);
    });

    socket.on('disconnect', () => {
        players.splice(players.indexOf(self), 1);
    });
};