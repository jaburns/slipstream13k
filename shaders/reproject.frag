uniform sampler2D u_tex;
uniform sampler2D u_old;
uniform sampler2D u_depth;
uniform sampler2D u_motion;
uniform samplerCube u_cube1;
uniform samplerCube u_cube2;
uniform float u_interpolate;
uniform float u_aspect;

varying vec3 v_pos;
varying vec2 v_uv;

#include "linearDepth.glsl"

void main()
{
    vec4 color = texture2D(u_tex, v_uv);
    float depth = texture2D(u_depth,v_uv).r;
    vec2 objectMotion = color.gb;

    vec2 uv_off = v_uv+objectMotion;
    vec3 dir = v_pos/length(v_pos);
    vec2 offset = mix(textureCube(u_cube1, dir).rg,textureCube(u_cube2,dir).rg,u_interpolate);
    offset.y*=u_aspect;

    //gl_FragColor = vec4(offset,0,1);
    gl_FragColor = vec4(mix(vec3(max(0.,color.r)),texture2D(u_old,uv_off+offset*0.0001*linearDepth(depth)).rgb,0.9),1);
}
