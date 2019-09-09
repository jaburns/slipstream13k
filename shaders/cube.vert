attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_proj;

uniform mat4 u_mvp_old;
uniform mat4 u_mvp;

varying vec3 v_color;
varying vec3 v_normal;
varying vec3 v_position;

varying vec4 v_pos;
varying vec4 v_pos_old;

void main()
{
    gl_Position = u_mvp * vec4(a_position, 1);
    v_pos = gl_Position;

    v_normal = mat3(u_model) * a_normal;

    // ALL OBJECT SHADERS
    v_pos_old = u_mvp_old * vec4(a_position, 1);

}