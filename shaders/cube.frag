varying vec3 v_normal;

varying vec4 v_pos;
varying vec4 v_pos_old;

void main()
{
    vec3 sunDir =  normalize(vec3(0.,2,-1));

    vec2 tpos = v_pos.xy/v_pos.w;

    vec2 tpos_old = v_pos_old.xy/v_pos_old.w;

    vec2 diff = (tpos_old*0.5+0.5)-(tpos*0.5+0.5);

    gl_FragColor = vec4(clamp(0., 1., dot(sunDir, normalize(v_normal))),diff, 1);
}