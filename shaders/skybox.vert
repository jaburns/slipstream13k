attribute vec2 a_position;
uniform mat4 u_inv_vp;
varying vec3 v_pos;

void main()
{

    gl_Position = vec4(a_position, 0, 1);
    vec4 p = u_inv_vp*vec4(a_position,1.0,1.);
    v_pos = p.xyz/p.w;
}