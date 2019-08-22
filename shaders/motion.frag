varying vec4 v_pos;
varying vec4 v_pos_old;

void main()
{
    vec2 tpos = v_pos.xy/v_pos.w;

    vec2 tpos_old = v_pos_old.xy/v_pos_old.w;

    vec2 diff = (tpos*0.5+0.5)-(tpos_old*0.5+0.5);
    gl_FragColor = vec4(diff,1., 1.);
}