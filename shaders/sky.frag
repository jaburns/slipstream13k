
#include "simplexNoise.glsl"

varying vec2 v_uv;
uniform mat3 u_rot;
uniform float u_slice;

float turb(vec3 p,float gain, float lac,int iter){
	float sum = 0.;
	for(float i=0.; i<10.; ++i){
	  float g = pow(gain,i);
	  float l = lac * pow(2.,i);
		float spd = lac * pow(2.,floor(i/2.));
		sum=max(0.,min(1.,sum+g*abs(snoise(vec4(p*l,1.)))));
	}
	return max(0.,min(1.,sum));
}

void main()
{
    vec3 dir = u_rot*vec3(v_uv*2.-1.,1);
    dir = dir/length(dir);
    vec3 p = dir/10.;

    float n = turb(vec3(
							turb(p,0.6,4.,5),
							turb(p+vec3(0.2,0.2,0.2),0.6,4.,5),
              turb(p+vec3(0.4,0.4,0.4),0.6,4.,5)
							)
							,0.3,2.,8);
    vec3 sun = normalize(vec3(0.,-1,-2));
	gl_FragColor = vec4(n*float(n>0.3)+float(dot(dir,sun)>0.9)*1000.,0.,0.,1.);
}