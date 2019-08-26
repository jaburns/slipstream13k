const fs = require('fs');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const code = fs.readFileSync('./build/server.js', 'utf8');
const shared = fs.existsSync('./build/shared.js') ? fs.readFileSync('./build/shared.js', 'utf8') : '';

function createSandbox() {
    const sandbox = {
        console,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        io
    };

    Object.defineProperty(sandbox, 'module', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: Object.create(null)
    });

    sandbox.module.exports = Object.create(null);
    sandbox.exports = sandbox.module.exports;

    return sandbox;
};

app.set('port', process.env.PORT || 3000)
    .use(express.static('build'));

const sandbox = createSandbox();
require('vm').runInNewContext(shared + '\n' + code, sandbox);
io.on('connection', sandbox.module.exports);

server.listen(app.get('port'), () => console.log('Server started at port: ' + app.get('port')));
