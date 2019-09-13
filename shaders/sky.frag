
#include "simplexNoise.glsl"

varying vec2 v_uv;
uniform mat3 u_rot;
uniform float u_slice;

float turb(vec3 p,float gain, float lac){
	float sum = 0.;
	for(float i=0.; i<10.; i++){
		sum+=pow(gain,i)*abs(snoise(vec4(p*lac * pow(2.,i),1.)));
	}
	return sum;
}

void main()
{
    vec3 dir = normalize(u_rot*vec3(v_uv*2.-1.,1));
    vec3 p = dir/10.;

    float n = turb(vec3(
							turb(p,.6,4.),
							turb(p+vec3(.2,.2,.2),.6,4.),
              turb(p+vec3(.4,.4,.4),.6,4.)
							)
							,.3,2.);
	gl_FragColor.r = n*float(n>0.3)+float(dot(dir,-vec3(0,.45,.9))>0.9)*1000.;
}