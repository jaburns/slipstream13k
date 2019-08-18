uniform sampler2D u_tex;

varying vec2 v_uv;

void main()
{
    vec4 color = texture2D(u_tex, v_uv);
    gl_FragColor = color.r > .9 ? color : vec4(0);
}
