varying vec3 v_color;
varying vec3 v_normal;
varying vec3 v_position;

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

    gl_FragColor = vec4(color, 1);
}