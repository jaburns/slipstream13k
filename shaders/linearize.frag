uniform sampler2D u_tex;
uniform vec2 u_resolution;
	
varying vec2 v_uv;
uniform vec3 u_clip;

void main() {
	gl_FragColor = vec4(u_clip[0] / (u_clip[1] * texture2D(u_tex,v_uv).r + u_clip[2]),0,0,1);
}