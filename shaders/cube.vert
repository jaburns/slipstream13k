attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_proj;

varying vec3 v_color;
varying vec3 v_normal;
varying vec3 v_position;

void main()
{
    vec4 worldPos = u_model * vec4(a_position, 1);
    gl_Position = u_proj * u_view * worldPos;
    v_position = worldPos.xyz;

    bool positive = a_normal.x + a_normal.y + a_normal.z > 0.;
    v_color = positive ? a_normal : 1. + a_normal;
    v_normal = mat3(u_model) * a_normal;
}