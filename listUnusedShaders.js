const shell = require('shelljs');
const fs = require('fs');
const _ = require('lodash');

let shaderVarNames = [];

shell.find('src')
    .filter(x => x.indexOf('/') >= 0)
    .forEach(x => {
        if (x.indexOf('shaders.gen.js') >= 0) return;

        let contents = fs.readFileSync(x, 'utf8');

        let matches = contents.match(/[0-9a-zA-Z_]+_frag/g);
        if (matches) matches.forEach(y => shaderVarNames.push(y));

        matches = contents.match(/[0-9a-zA-Z_]+_vert/g);
        if (matches) matches.forEach(y => shaderVarNames.push(y));

        matches = contents.match(/[0-9a-zA-Z_]+_glsl/g);
        if (matches) matches.forEach(y => shaderVarNames.push(y));
    });

const referencedShaders = _.uniq(shaderVarNames).map(x => 'shaders/'+x.replace('_', '.'));
const allShaders = shell.find('shaders').filter(x => x.indexOf('/') >= 0);

console.log('');
console.log('The following shaders files are not referenced in the build:');
console.log(_.difference(allShaders, referencedShaders));
console.log('');