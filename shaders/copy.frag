uniform sampler2D u_tex;
uniform sampler2D u_bloom;

varying vec2 v_uv;

void main()
{
    gl_FragColor = vec4(
        //texture2D(u_bloom,v_uv).rgb
        +texture2D(u_tex, v_uv).rgb,1);//+max(vec4(0,0,0,0),texture2D(u_bloom,v_uv)-1.).rgb,1);
}