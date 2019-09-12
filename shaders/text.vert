
attribute vec2 a_position;

varying vec2 v_uv;

void main()
{
    vec2 pos = a_position;
    pos.x *= .5625;

    gl_Position = vec4(pos * 0.25 - 0.75, 0, 1);

    v_uv = a_position.xy*0.5 + 0.5;
    v_uv.y = 1.-v_uv.y;
}
