
varying vec2 v_uv;

uniform sampler2D u_tex;

void main()
{
    gl_FragColor = .7*texture2D(u_tex, v_uv);
}
