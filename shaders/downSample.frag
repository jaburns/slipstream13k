uniform sampler2D u_tex;
uniform vec2 u_resolution;
	
varying vec2 v_uv;

void main() {
    vec2 halfpixel = 1./u_resolution*4.;
    vec4 sum = texture2D(u_tex,v_uv)*4.0;
	sum += texture2D(u_tex, v_uv - halfpixel);
	sum += texture2D(u_tex, v_uv + halfpixel);
	sum += texture2D(u_tex, v_uv + vec2(halfpixel.x, -halfpixel.y));
	sum += texture2D(u_tex, v_uv - vec2(halfpixel.x, -halfpixel.y));
		
	gl_FragColor = sum/8.;
}