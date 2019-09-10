
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
    float off = G_TERRAIN_WORLDSPACE_SIZE / 2048.;
    vec4 terrainLookup = texture2DLod(u_objTex, v_uv, 0.);

    float h0 = G_TERRAIN_WORLDSPACE_HEIGHT * terrainLookup.r;
    position.y += h0;

    float hX = texture2DLod(u_objTex, v_uv+vec2(1./2048.,0.), 0.).r*G_TERRAIN_WORLDSPACE_HEIGHT;
    float hY = texture2DLod(u_objTex, v_uv+vec2(0.,1./2048.), 0.).r*G_TERRAIN_WORLDSPACE_HEIGHT;

    

    vec3 norm = normalize(cross(vec3(0,hY-h0,off),vec3(off,hX-h0,0)));

    vec4 worldPos = u_model * vec4(position, 1);
    gl_Position = u_mvp * vec4(position, 1);
    v_pos = gl_Position;
    v_position = worldPos.xyz;

//  bool positive = a_normal.x + a_normal.y + a_normal.z > 0.;
    v_normal = mat3(u_model) * norm;

    v_color = position.xyz / 50.;

    // ALL OBJECT SHADERS
    v_pos_old = u_mvp_old * vec4(position, 1);

}
