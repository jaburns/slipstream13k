uniform sampler2D u_tex;
uniform sampler2D u_bloom;

varying vec2 v_uv;

void main()
{
    gl_FragColor = texture2D(u_tex, v_uv);
    gl_FragColor.r = clamp(gl_FragColor.r + 1.5*texture2D(u_bloom, v_uv).r, 0., 1.);
}
