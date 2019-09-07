
// COPIED from cube.vert


attribute vec3 a_position;
// attribute vec3 a_normal;

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

varying float v_height;

uniform sampler2D u_objTex;

void main()
{
    vec3 position = a_position;
    vec2 uv = a_position.xz / 200. + .5;
    v_height = texture2DLod(u_objTex, uv, 0.).r;
    position.y += 40. * v_height;

    vec4 worldPos = u_model * vec4(position, 1);
    gl_Position = u_mvp * vec4(position, 1);
    v_pos = gl_Position;
    v_position = worldPos.xyz;

//  bool positive = a_normal.x + a_normal.y + a_normal.z > 0.;
//  v_normal = mat3(u_model) * a_normal;

    v_color = position.xyz / 50.;

    // ALL OBJECT SHADERS
    v_pos_old = u_mvp_old * vec4(position, 1);

}
