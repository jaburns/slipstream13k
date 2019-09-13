
attribute vec2 a_position;

varying vec2 v_uv;

void main()
{
    vec2 pos = a_position;
    pos.x = 2.*.5625*pos.x+.4;

    gl_Position = vec4(pos*.25 - .75, 0, 1);

    v_uv = a_position.xy*.5 + .5;
    v_uv.y = 1.-v_uv.y;
}
