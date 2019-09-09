
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

varying vec2 v_uv;

uniform sampler2D u_objTex;

void main()
{
    vec3 position = a_position;
    v_uv = a_position.xz / G_TERRAIN_WORLDSPACE_SIZE;
    vec4 terrainLookup = texture2DLod(u_objTex, v_uv, 0.);
    position.y += G_TERRAIN_WORLDSPACE_HEIGHT * terrainLookup.r;

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
