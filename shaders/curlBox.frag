
#include "simplexNoise.glsl"

vec2 curl2d(vec4 p,vec3 X, vec3 Y)
{
	vec3 e = vec3(0.001, -0.001, 0.0);
	float fxp = snoise(p + vec4(X,0));
	float fxm = snoise(p - vec4(X,0));
	float fyp = snoise(p + vec4(Y,0));
	float fym = snoise(p - vec4(Y,0));

	vec2 c = vec2((fyp - fym) / (2.*e.x),
		(-fxp + fxm) / (2.*e.x));
	return c;
}

varying vec2 v_uv;
uniform mat3 u_rot;
uniform float u_slice;

void main()
{
    float _Slice = u_slice*8.;
  	float t = 0.05;
    gl_FragColor = vec4(0);
    vec3 dir = u_rot*vec3(v_uv*2.-1.,1);
    vec3 up = vec3(0,1,0);
    vec3 dirX = cross(dir,up);
    vec3 dirY = cross(dir,dirX);
    dirX = dirX/length(dirX)*0.001;
    dirY = dirY/length(dirY)*0.001;

    vec3 ray = dir/length(dir)*.4;
    gl_FragColor.rg=vec2(0,0);
    for(int i=0; i<7;i++){
      float f = pow(2.,float(i));
      gl_FragColor.rg+=curl2d(vec4(ray * f, _Slice * (f/10.)*t),dirX,dirY);
    }
		//gl_FragColor.rg = curl2d(vec4(ray * 300., _Slice * 30.*t),dirX,dirY)/30.+curl2d(vec4(ray * 100., _Slice * 10. * t),dirX,dirY)/10.+curl2d(vec4(ray * 30., _Slice*3. * t),dirX,dirY)/3. + curl2d(vec4(ray * 10., _Slice*1. * t)) + curl2d(vec4(ray*3., _Slice*0.3*t))/0.3;
}