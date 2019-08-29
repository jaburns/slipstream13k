uniform sampler2D u_tex;
uniform vec2 u_resolution;
	
varying vec2 v_uv;

void main() {
    vec2 halfpixel = 1./u_resolution*4.;
    vec4 sum = texture2D(u_tex,v_uv + vec2(-halfpixel.x*2.,0.));
	sum += texture2D(u_tex, v_uv + vec2(-halfpixel.x,halfpixel.y))*2.;
	sum += texture2D(u_tex, v_uv + vec2(0.0,halfpixel.y*2.0));
	sum += texture2D(u_tex, v_uv + halfpixel)*2.;
	sum += texture2D(u_tex, v_uv + vec2(halfpixel.x*2.0, 0.0));
	sum += texture2D(u_tex, v_uv + vec2(halfpixel.x, -halfpixel.y))*2.;
	sum += texture2D(u_tex, v_uv + vec2(0.0,-halfpixel.y*2.0));
	sum += texture2D(u_tex, v_uv - halfpixel)*2.;
	gl_FragColor = sum/12.;
}