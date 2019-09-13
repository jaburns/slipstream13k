varying vec3 v_normal;

varying vec4 v_pos;
varying vec4 v_posOld;
uniform float u_bright;
varying float v_back;

void main()
{
    vec2 tpos = v_pos.xy/v_pos.w;

    vec2 tpos_old = v_posOld.xy/v_posOld.w;

    vec2 diff = (tpos_old*0.5+0.5)-(tpos*0.5+0.5);

    gl_FragColor = vec4(clamp(dot(vec3(0,.9,-.45), v_normal), 0., 1.)+u_bright+v_back*1.,diff, 1);
}