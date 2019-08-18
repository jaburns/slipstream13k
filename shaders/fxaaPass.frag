//__include fxaa.glsl

uniform vec2 u_resolution;
uniform sampler2D u_tex;

varying vec2 v_uv;

void main()
{
    gl_FragColor = fxaa(u_tex, v_uv * u_resolution, u_resolution);
}
