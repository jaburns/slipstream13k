vec4 mod289_v4(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0; }

float mod289_f(float x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0; }

vec4 permute_v4(vec4 x) {
     return mod289_v4(((x*34.0)+1.0)*x);
}

float permute_f(float x) {
     return mod289_f(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt_v4(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float taylorInvSqrt_f(float r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec4 grad4(float j, vec4 ip)
  {
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p,s;

  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www; 

  return p;
  }
						
// (sqrt(5) - 1)/4 = F4, used once below
#define F4 0.309016994374947451

float snoise(vec4 v)
  {
  const vec4  C = vec4( 0.138196601125011,  // (5 - sqrt(5))/20  G4
                        0.276393202250021,  // 2 * G4
                        0.414589803375032,  // 3 * G4
                       -0.447213595499958); // -1 + 4 * G4

// First corner
  vec4 i  = floor(v + dot(v, vec4(F4)) );
  vec4 x0 = v -   i + dot(i, C.xxxx);

// Other corners

// Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
  vec4 i0;
  vec3 isX = step( x0.yzw, x0.xxx );
  vec3 isYZ = step( x0.zww, x0.yyz );
//  i0.x = dot( isX, vec3( 1.0 ) );
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;
//  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;
  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;

  // i0 now contains the unique values 0,1,2,3 in each channel
  vec4 i3 = clamp( i0, 0.0, 1.0 );
  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

  //  x0 = x0 - 0.0 + 0.0 * C.xxxx
  //  x1 = x0 - i1  + 1.0 * C.xxxx
  //  x2 = x0 - i2  + 2.0 * C.xxxx
  //  x3 = x0 - i3  + 3.0 * C.xxxx
  //  x4 = x0 - 1.0 + 4.0 * C.xxxx
  vec4 x1 = x0 - i1 + C.xxxx;
  vec4 x2 = x0 - i2 + C.yyyy;
  vec4 x3 = x0 - i3 + C.zzzz;
  vec4 x4 = x0 + C.wwww;

// Permutations
  i = mod289_v4(i); 
  float j0 = permute_f( permute_f( permute_f( permute_f(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute_v4( permute_v4( permute_v4( permute_v4 (
             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));

// Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope
// 7*7*6 = 294, which is close to the ring size 17*17 = 289.
  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

  vec4 p0 = grad4(j0,   ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);

// Normalise gradients
  vec4 norm = taylorInvSqrt_v4(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  p4 *= taylorInvSqrt_f(dot(p4,p4));

// Mix contributions from the five corners
  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
  m0 = m0 * m0;
  m1 = m1 * m1;
  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
               + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;

}

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
  	float t = 0.02;
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