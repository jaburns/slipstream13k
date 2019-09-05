varying vec3 v_color;
varying vec3 v_normal;
varying vec3 v_position;

varying vec4 v_pos;
varying vec4 v_pos_old;

uniform sampler2D u_heightMap;

void main()
{
    gl_FragColor = texture2D(u_heightMap, v_pos.xz);
}
