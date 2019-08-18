uniform vec2 u_resolution;
uniform sampler2D u_tex;

varying vec2 v_uv;

void main()
{
    float far = 100.;
    float near = 0.2;
    float depth = texture2D(u_tex, v_uv).r;
    float z = depth * 2.0 - 1.0; // back to NDC 
    float linz = (2.0 * near * far) / (far + near - z * (far - near));
    gl_FragColor = vec4(vec3(linz/10.),1);
}
