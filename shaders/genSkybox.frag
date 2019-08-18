varying vec2 v_uv;
uniform mat3 u_rot;

void main()
{
    
    gl_FragColor = vec4(u_rot*vec3(0,0,1)*0.5+0.5,1);
}

