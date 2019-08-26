const fs = require('fs');
const _ = require('lodash');
const shell = require('shelljs');
const uglify = require("uglify-es").minify;
const constants = require('./src/constants.json');
const webglDecls = require('./webglContext.json');

const SHADER_MIN_TOOL = process.platform === 'win32' ? 'tools\\shader_minifier.exe' : 'mono tools/shader_minifier.exe';
const ADVZIP_TOOL = process.platform === 'win32' ? '..\\tools\\advzip.exe' : '../tools/advzip.osx';

const MINIFY = process.argv[2] === '--small';

let shaderMinNames = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(x => 'z' + x);

const extractGLSLFunctionName = proto =>
    proto.substring(proto.indexOf(' ') + 1, proto.indexOf('('));

const findExportedShaderIncludeFuncs = code => {
    const lines = code.split('\n').map(x => x.trim());
    const result = [];

    while (lines.length > 0) {
        const line = lines.shift();
        if (line.indexOf('//__export') >= 0) {
            result.push(extractGLSLFunctionName(lines.shift()));
        }
    }

    return result;
};

const convertSong = song => [
    song.songData.map(x => [
        x.i,
        x.p,
        x.c.map(y => [
            y.n,
            y.f
        ]),
    ]),
    song.rowLen,
    song.patternLen,
    song.endPattern,
    song.numChannels
];

const replaceIncludeSongCallWithConvertedSong = originalSongData =>
    JSON.stringify(convertSong(eval(`x=${originalSongData};x`))).replace(/null/g, '');

const convertSongDataFormat = code => {
    const funcName = '__includeSongData(';

    for (;;) {
        const funcLoc = code.indexOf(funcName);
        if (funcLoc < 0) return code;

        const endLoc = code.indexOf(')', funcLoc);
        code = code.substr(0, funcLoc)
            + replaceIncludeSongCallWithConvertedSong(code.substr(funcLoc + funcName.length, endLoc - funcLoc - funcName.length))
            + code.substr(endLoc + 1);
    }
};

// TODO: Dont try to minify imported shader code name. 
// __include should just behave as a basic concatentation, with the caveat that names in a .glsl include are not minified.
// Later we can revisit included function minification


const findShaderIncludes = code => code
    .split('\n')
    .map(x => x.trim())
    .filter(x => x.startsWith('//__include'))
    .map(x => x.substr(x.indexOf(' ') + 1).replace('.', '_'));

const buildShaderIncludeFile = () => {
    let fileContents = '';
    let includedFuncs = [];
    let includeHeaderMappings = [];

    shell.find('shaders')
        .map(x => x)
        .sort((a, b) => a.endsWith('glsl') ? -1 : b.endsWith('glsl') ? 1 : 0)
        .forEach(x => {
            if (!(x.endsWith('.frag') || x.endsWith('.vert') || x.endsWith('.glsl'))) return;

            const rawFile = fs.readFileSync(x, 'utf8');
            const varFileName = x.substr(x.indexOf('/')+1).replace('.', '_');
            const includes = findShaderIncludes(rawFile);

            if (includes.length > 0)
                includeHeaderMappings = includeHeaderMappings
                    .concat({file: varFileName, incs: includes });

            if (MINIFY) {
                const incFuncs = findExportedShaderIncludeFuncs(rawFile);
                const incFuncsArg = incFuncs.length > 0 ? `--no-renaming-list ${incFuncs}` : '';

                includedFuncs = includedFuncs.concat(incFuncs);

                shell.exec(`${SHADER_MIN_TOOL} --preserve-externals ${incFuncsArg} --format js ${x} -o tmp.js`); // , {silent: true});
                fileContents += fs.readFileSync('tmp.js', 'utf8');
            } else {
                fileContents += `let ${varFileName} = \`${rawFile}\`;\n\n`;
            }
        });

    shell.rm('-rf', 'tmp.js');

    includedFuncs = _.uniq(includedFuncs);

    let lines = fileContents.split('\n');

    _.zip(includedFuncs, shaderMinNames.splice(0, includedFuncs.length)).forEach(([from, to]) => {
        lines = lines.map(line => {
            const trimLine = line.trim();

            if (trimLine.startsWith('"'))
                return line.replace(new RegExp(from, 'g'), to);

            if (trimLine.startsWith('var '))
                return 'let ' + trimLine.substr(4);

            return line;
        });
    });

    fileContents = lines.join('\n');

    includeHeaderMappings.forEach(({file, incs}) => {
        fileContents = fileContents.replace(`let ${file} =`, `let ${file} = ${incs.join('+')} +`);
    });

    return fileContents;
};

const createBinaryBlobsReplacement = () => {
    const blobArray = "['" + 
        shell.find('./blobs/*')
            .map(x => fs.readFileSync(x).toString('base64'))
            .join("','") 
        + "']";

    return [['__binaryBlobs', blobArray + '.map(x=>Uint8Array.from(atob(x),x=>x.charCodeAt(0)))']];
};

const findShaderInternalReplacements = allShaderCode => {
    const externals = _.flatten([
        _.uniq(allShaderCode.match(/v_[a-zA-Z0-9_]+/g)),
        _.uniq(allShaderCode.match(/u_[a-zA-Z0-9_]+/g)),
        _.uniq(allShaderCode.match(/a_[a-zA-Z0-9_]+/g))
    ]);

    if (externals.length > shaderMinNames.length) {
        console.log('Not enough names in shaderMinNames');
        process.exit(1);
    }

    return _.zip(
        externals.map(x => new RegExp(x, 'g')),
        shaderMinNames.splice(0, externals.length)
    );
};

const findSharedFunctionReplacements = sharedCode => {
    const cashGlobals = _.uniq(sharedCode.match(/\$[a-zA-Z0-9_]+/g));
    const shortGlobals = _.range(0, cashGlobals.length).map(x => '$' + x);

    return _.zip(
        cashGlobals.map(x => new RegExp('\\'+x, 'g')),
        shortGlobals
    );
};

const replaceIncludeDirectivesWithInlinedFiles = code => {
    const lines = code.split('\n');
    const result = [];

    lines.forEach(line => {
        const label = '//__include';
        const index = line.indexOf(label);
        if (index >= 0) {
            const filename = line.substr(index + label.length).trim();
            result.push(fs.readFileSync('src/' + filename, 'utf8'));
        } else {
            result.push(line);
        }
    });

    return result.join('\n');
};

const replaceGLConstants = code => {
    const webglConsts = [];

    Object.keys(webglDecls).forEach(x => {
        if (webglDecls[x] !== null)
            webglConsts.push({ from: x, to: webglDecls[x] });
    });

    webglConsts.sort((a, b) => b.from.length - a.from.length);

    webglConsts.forEach(({ from, to }) => {
        code = code.replace(new RegExp(`gl\\.${from}([^a-zA-Z0-9])`, 'g'), `${to}$1`);
    });

    return code;
};

const findHashCollisions = (hashFunc, items) => {
    const hashes = items.map(hashFunc);
    const dupes = _.uniq(_.filter(hashes, (v, i, a) => a.indexOf(v) !== i));

    return items
        .map((x, i) => dupes.indexOf(hashes[i]) >= 0 ? x : null)
        .filter(x => x !== null);
};

const mangleStringBuildHash = 'for(i=n=0;++i<k.length;)n+=k.charCodeAt(i)*i*247%3e3';
const mangleStringGetValue = 'String.fromCharCode(97+n%26)+(0|n/26%36).toString(36)';

const mangleGLCalls_firstPass = code => {
    const genHash = k => {
        let i, n;
        eval(mangleStringBuildHash);
        return eval(mangleStringGetValue);
    };

    const webglFuncs = Object.keys(webglDecls).map(x => webglDecls[x] === null ? x : null).filter(x => x !== null);
    const glCalls = _.uniq(code.match(/gl\.[a-zA-Z0-9_]+/g)).map(x => x.substr(3));
    const allCollisions = findHashCollisions(genHash, webglFuncs.concat(['STENCIL_INDEX','releaseShaderCompiler']));
    const localCollisions = glCalls.map(x => allCollisions.indexOf(x) >= 0 ? x : null).filter(x => x !== null);

    if (localCollisions.indexOf('uniform4iv') >= 0) {
        console.log('ERROR Sorry cant use uniform4iv!!');
        process.exit(1);
    }
    //if (localCollisions.length > 0) {
    //    console.log('');
    //    console.log('WARNING: The source is using one or more WebGL calls which collide in the mangler:');
    //    console.log(localCollisions);
    //    console.log('The following identifiers are currently not mangled uniquely:');
    //    console.log(allCollisions);
    //    console.log('');
    //}

    code = replaceGLConstants(code);

    glCalls.forEach(func => {
        code = code.replace(new RegExp(`gl\\.${func}([^a-zA-Z0-9])`, 'g'), `${genHash(func)}$1`);
    });

    glCalls.forEach(func => {
        code = code.replace(new RegExp(`gl\\.${func}([^a-zA-Z0-9])`, 'g'), `${func}$1`);
    });

    return code;
};

const mangleGLCalls_secondPass = code => {
    const header = `
        let k,i,n,g=C.getContext\`webgl\`;
        for (k in g) {
            ${mangleStringBuildHash};
            g[ isNaN(g[k]) && ${mangleStringGetValue} ] = g[k]
        }`
        .replace(/[ \t\r\n]*/g, '')
        .replace(/let/g, 'let ')
        .replace('king', 'k in g');

    return `${header}with(g){${code}}`;
}

const processFile = (replacements, file, code) => {
    replacements.forEach(([from, to]) => code = code.replace(from, to));

    if (!MINIFY) {
        if (file === 'shared.js') {
            for (let k in constants) {
                code = `let ${k} = ${constants[k]};\n` + code;
            }
        }
        if (file === 'client.js') {
            code = 'let gl = C.getContext`webgl`;\n' + code;
        }
        return convertSongDataFormat(code);
    }

    if (file === 'client.js') {
        code = convertSongDataFormat(mangleGLCalls_firstPass(code));
    }

    const uglifyResult = uglify(code, {
        toplevel: file !== 'shared.js',
        compress: {
            ecma: 6,
            keep_fargs: false,
            passes: 2,
            pure_funcs: [],
            pure_getters: true,
            global_defs: constants,

            unsafe: true,
            unsafe_arrows : true,
            unsafe_comps: true,
            unsafe_Function: true,
            unsafe_math: true,
            unsafe_methods: true,
            unsafe_proto: true,
            unsafe_regexp: true,
            unsafe_undefined:true,
        }
    });

    if (typeof uglifyResult.code !== 'string') {
        console.log(code);
        console.log(uglifyResult);
        process.exit(1);
    }

    if (file === 'client.js') {
        return mangleGLCalls_secondPass(uglifyResult.code);
    }

    return uglifyResult.code;
};

const processHTML = (html, clientJS, binaryBlobs) =>
    html.split('\n')
        .map(x => x.trim())
        .join('')
        .replace('__clientJS', clientJS.replace(/"/g, "'"))
        .replace('__binaryBlobs', binaryBlobs);

const main = () => {
    constants.__DEBUG = !MINIFY;

    shell.rm('-rf', './build');
    shell.mkdir('-p', './build');

    console.log('Packing shaders...');

    const allShaderCode = buildShaderIncludeFile();
    fs.writeFileSync('./src/shaders.gen.js', allShaderCode);

    const clientCode = replaceIncludeDirectivesWithInlinedFiles(fs.readFileSync('./src/client.js', 'utf8'));
    const sharedCode = replaceIncludeDirectivesWithInlinedFiles(fs.readFileSync('./src/shared.js', 'utf8'));
    const serverCode = replaceIncludeDirectivesWithInlinedFiles(fs.readFileSync('./src/server.js', 'utf8'));

    const blobsReplacement = createBinaryBlobsReplacement();

    const replacements = _.flatten(MINIFY ? [
        findShaderInternalReplacements(allShaderCode),
        findSharedFunctionReplacements(sharedCode),
        blobsReplacement
    ] : [
        blobsReplacement
    ]);

    console.log('Packing javascript...');

    const finalClientJS = processFile(replacements, 'client.js', clientCode);
    const finalSharedJS = processFile(replacements, 'shared.js', sharedCode);
    const finalHTML = processHTML(fs.readFileSync(MINIFY ? 'src/index.html' : 'src/index.debug.html', 'utf8'), finalClientJS);

    fs.writeFileSync('./build/index.html', finalHTML);
    if (finalSharedJS.length > 0) fs.writeFileSync('./build/shared.js', finalSharedJS);
    fs.writeFileSync('./build/server.js', processFile(replacements, 'server.js', serverCode));

    if (!MINIFY) {
        console.log('Done!\n');
        return;
    }

    console.log('Packing zip archive...');

    shell.cd('build');
    shell.exec(ADVZIP_TOOL + ' -q -a -4 ../bundle.zip *');
    shell.cd('..');

    const bytes = fs.statSync('bundle.zip').size;

    console.log('Done!\n');
    console.log(`Final archive size: ${bytes} of 13312 / ${(bytes / 13312 * 100).toFixed(2)}%\n`);
};

main();
