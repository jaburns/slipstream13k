## js13kserver-packer

This is a toolchain for building a multiplayer WebGL game for the js13kgames competition server category.
The goal of this project is to have a system that does lots of little things to make the final bundle as small as possible so that a game submission can be developed without worrying about tiny optimizations.

The main build script acts as a front-end to UglifyJS.
It performs a bunch of domain-specific optimizations such as shader minification, minifying uniform names across JS/GLSL, WebGL function name mangling, and renaming external resources to single letter filenames.
The output of the pre-build step is fed to UglifyJS to produce the final javascript for each of the main components.
The final results are placed in the build directory where they are served by the test server, which mimics the behaviour of the js13kserver boilerplate, and also zipped using ADVZIP to create a submission bundle for the comp.

Additionally some useful math and graphics utility functions are provided, as well as some shaders useful for a variety of effects.
The sample game just draws a cube on the screen for each player, and each player can slide it around at a constant speed with the arrow keys.
It provides an example for how you can update the state on the server at a low tick rate and interpolate on client side for smooth rendering.
