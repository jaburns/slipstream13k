uniform samplerCube u_tex;
varying vec3 v_pos;

void main()
{
    gl_FragColor = textureCube(u_tex, v_pos/length(v_pos));
}