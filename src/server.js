//__include state.inc.js

let players = [];

setInterval(() => {
    players.forEach(p => {
        state_updatePlayer(p);
        p.s.emit('s', players.map(p => ({x:p.x, y:p.y})));
    });
}, G_TICK_MILLIS);

module.exports = socket => {
    let self = {
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