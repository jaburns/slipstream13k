attribute vec2 a_position;
uniform mat4 u_inv_vp;
uniform mat4 u_reproject;

varying vec4 v_pos;
varying vec4 v_reproject;
varying vec2 v_uv;

void main()
{

    gl_Position = vec4(a_position, 0, 1);
    v_reproject = u_reproject*vec4(a_position,1.,1.);
    vec4 p = u_inv_vp*vec4(a_position,1.0,1.);
    v_uv = a_position.xy*0.5 + 0.5;
    v_pos = p;
}