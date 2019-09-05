uniform sampler2D u_tex;
uniform sampler2D u_old;
uniform sampler2D u_depth;
uniform sampler2D u_motion;
uniform samplerCube u_cube1;
uniform samplerCube u_cube2;
uniform float u_interpolate;
uniform float u_aspect;
uniform vec4 u_proj;
uniform vec3 u_clip;

uniform mat4 u_pmat;


varying vec3 v_pos;
varying vec2 v_uv;

vec3 getPosition(vec2 uv,sampler2D tex) {
    float depth = texture2D(tex,uv).r;
    return vec3((uv.xy * u_proj.xy + u_proj.zw) * -depth, -depth);
}

#include "linearDepth.glsl"

void main()
{
    vec4 color = texture2D(u_tex, v_uv);

    vec3 camPos = getPosition(v_uv,u_depth);

    vec2 objectMotion = color.gb;

    vec2 uv_off = v_uv+objectMotion;
    vec3 dir = v_pos/length(v_pos);
    vec2 offset = mix(textureCube(u_cube1, dir).rg,textureCube(u_cube2,dir).rg,u_interpolate);
    offset.y*=u_aspect;

    //gl_FragColor = vec4(offset,0,1);
    float i = color.r;
    color.r = min(max(color.r,0.),1.);

    vec3 col = mix(mix(vec3(0,0,0.2),vec3(0.5,0,0.2),min(color.r*2.,1.)),vec3(1,0.9,0.7),max(0.,color.r-0.5)*2.);
    col = col*i;
    gl_FragColor = vec4(vec3(float(camPos.z<-50.)),1);
    gl_FragColor = vec4(normalize(cross(dFdx(camPos),dFdy(camPos)))*0.5+0.5,1);
    //gl_FragColor = vec4(mix(col,texture2D(u_old,uv_off+offset*0.001*depth).rgb,0.9),1);
}
