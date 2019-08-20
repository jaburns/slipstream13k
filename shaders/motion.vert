attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_mvp;
uniform mat4 u_mvp_old;

varying vec4 v_pos;
varying vec4 v_pos_old;

void main()
{
    v_pos = u_mvp* vec4(a_position, 1);
    gl_Position = v_pos;
    v_pos_old = u_mvp_old * vec4(a_position, 1);
}