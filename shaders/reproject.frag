uniform sampler2D u_tex;
uniform sampler2D u_old;
uniform sampler2D u_depth;
uniform samplerCube u_cube1;
uniform samplerCube u_cube2;
uniform float u_interpolate;
uniform float u_aspect;
uniform mat4 u_reproject;

varying vec3 v_pos;
varying vec2 v_uv;

void main()
{
    float depth = texture2D(u_depth,v_uv).r;
    vec4 rp = u_reproject*vec4(v_uv*2.-1.,depth,1.);
    vec2 uv_off = rp.xy/rp.w*0.5+0.5;
    vec3 dir = v_pos/length(v_pos);
    vec2 offset = mix(textureCube(u_cube1, dir).rg,textureCube(u_cube2,dir).rg,u_interpolate);
    offset.y*=u_aspect;

    gl_FragColor = vec4(texture2D(u_tex, v_uv).rgb*0.1+texture2D(u_old,uv_off+offset*0.001).rgb*0.9,1);
}
