varying vec3 v_color;
varying vec3 v_normal;
varying vec3 v_position;

varying vec4 v_pos;
varying vec4 v_pos_old;

varying vec2 v_uv;

uniform sampler2D u_objTex;

void main()
{
    vec2 tpos = v_pos.xy/v_pos.w;

    vec2 tpos_old = v_pos_old.xy/v_pos_old.w;

    vec2 diff = (tpos_old*0.5+0.5)-(tpos*0.5+0.5);

    vec4 terrainLookup = texture2D(u_objTex, v_uv);
    float height = terrainLookup.r;
    float shadow = terrainLookup.g;
    vec3 sunDir =  normalize(vec3(0.,2.,-1.));

    gl_FragColor = vec4(clamp(dot(sunDir, v_normal), 0., 1.)*0.5*shadow+height*0.3, diff, 0);
}
