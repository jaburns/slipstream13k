varying vec3 v_color;
varying vec3 v_normal;
varying vec3 v_position;

varying vec4 v_pos;
varying vec4 v_pos_old;

void main()
{
    vec3 color = v_color;

    if (!(color.r > .9 && color.g < .1 && color.b < .1))
    {
        vec3 lightVec = -normalize(v_position);
        float brightness = clamp(0., 1., dot(lightVec, v_normal));
        float distanceDecay = clamp(1.1 - .05*dot(v_position, v_position), 0., 1.);
  
        color *= .1 + .7*brightness*distanceDecay;
    }


    vec2 tpos = v_pos.xy/v_pos.w;

    vec2 tpos_old = v_pos_old.xy/v_pos_old.w;

    vec2 diff = (tpos_old*0.5+0.5)-(tpos*0.5+0.5);

    gl_FragColor = vec4(color.r * 0.299 + color.g * 0.587 + color.b * 0.114,diff, 1);
}