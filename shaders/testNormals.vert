attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_model;
uniform mat4 u_vp;

varying vec3 v_normal;

void main()
{
    gl_Position = u_vp * u_model * vec4(a_position, 1);
    v_normal = mat3(u_model) * a_normal;
}