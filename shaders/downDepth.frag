uniform sampler2D u_tex;
uniform vec2 u_resolution;
	
varying vec2 v_uv;

void main() {
    vec2 halfpixel = 1./u_resolution*2.;
    float sum = texture2D(u_tex,v_uv).r*4.0;
	sum += texture2D(u_tex, v_uv - halfpixel).r;
	sum += texture2D(u_tex, v_uv + halfpixel).r;
	sum += texture2D(u_tex, v_uv + vec2(halfpixel.x, -halfpixel.y)).r;
	sum += texture2D(u_tex, v_uv - vec2(halfpixel.x, -halfpixel.y)).r;
		
	gl_FragColor = vec4(sum/8.,0,0,1);
}