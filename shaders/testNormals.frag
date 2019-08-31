varying vec3 v_normal;

void main()
{
    gl_FragColor = vec4((1.0+v_normal)*0.5, 1.0);
}