attribute vec2 a_position;
uniform mat4 u_invVp;
varying vec3 v_pos;
varying vec2 v_uv;

void main()
{
    gl_Position = vec4(a_position, 0, 1);
    vec4 p = u_invVp*vec4(a_position,1.0,1.);
    v_pos = p.xyz/p.w;
    v_uv = a_position.xy*0.5 + 0.5;
}