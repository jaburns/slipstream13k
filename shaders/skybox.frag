uniform samplerCube u_tex;
varying vec4 v_pos;
varying vec4 v_reproject;
varying vec2 v_uv;

void main()
{
    vec3 pos = v_pos.xyz/v_pos.w;
    gl_FragColor = vec4(textureCube(u_tex, pos/length(pos)).r,v_reproject.xy/v_reproject.w*0.5+0.5-v_uv,1.);
}