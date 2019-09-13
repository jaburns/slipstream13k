uniform sampler2D u_tex;
uniform sampler2D u_old;
uniform sampler2D d;
uniform sampler2D d1;
uniform sampler2D d2;
uniform sampler2D d3;
uniform sampler2D d4;
uniform sampler2D d5;
uniform sampler2D d6;

uniform sampler2D u_motion;
uniform samplerCube u_cube1;
uniform samplerCube u_cube2;
uniform float u_interpolate;
uniform float u_aspect;
uniform vec4 u_proj;
uniform vec2 u_resolution;
uniform float u_time;

varying vec3 v_pos;
varying vec2 v_uv;

vec3 getPosition(vec2 uv,sampler2D tex) {
    float depth = texture2D(tex,uv).r;
    return vec3((uv.xy * u_proj.xy + u_proj.zw) * -depth, -depth);
}

float rand(vec2 co)
{
    return fract(sin(mod(dot(co.xy + vec2(u_time,u_time*7.) ,vec2(12.9898,78.233)),3.14)) * 43758.5453)*2.-1.;
}

float sampleAO(vec3 C, vec3 n_C, vec2 pos, sampler2D tex){
    vec3 v = getPosition(pos,tex) - C;
	float vv = dot(v, v);
    float f = max(0.7 - vv, 0.0);
    return f * f * f * max((dot(v, n_C) - 0.0001) / (0.01 + vv), 0.0);
}

void main()
{
    vec4 color = texture2D(u_tex, v_uv);

    vec3 camPos = getPosition(v_uv,d);

    vec3 norm = normalize(cross(dFdx(camPos),dFdy(camPos)));

    float sum = 0.;
    for(int i=0; i<2; i++){
        sum+=sampleAO(camPos,norm,v_uv+rand(v_uv+2.)/u_resolution*2., d1);
        sum+=sampleAO(camPos,norm,v_uv+rand(v_uv+3.)/u_resolution*4., d2);
        sum+=sampleAO(camPos,norm,v_uv+rand(v_uv+4.)/u_resolution*8., d3);
        sum+=sampleAO(camPos,norm,v_uv+rand(v_uv+5.)/u_resolution*16.,d4);
        sum+=sampleAO(camPos,norm,v_uv+rand(v_uv+6.)/u_resolution*32.,d5);
        sum+=sampleAO(camPos,norm,v_uv+rand(v_uv+7.)/u_resolution*64.,d6);
    }
    vec3 dir = v_pos/length(v_pos);
    vec2 offset = mix(textureCube(u_cube1, dir).rg,textureCube(u_cube2,dir).rg,u_interpolate);
    offset.y*=u_aspect;



    float i=color.r+mix(1.-sum/3.5,0.,float(camPos.z<-99.));
    color.r = min(max(mix(color.r*0.9,color.r*1.1,clamp(1.+camPos.z*0.02,0.,1.)),0.),1.);
    vec3 col = (mix(mix(vec3(0,0,0.2),vec3(0.5,0,0.2),min(color.r*2.,1.)),vec3(1,0.9,0.7),max(0.,color.r-0.5)*2.)+vec3(0,0,camPos.z*0.01)*0.1)*i;
    gl_FragColor = vec4(mix(col,texture2D(u_old,v_uv+color.gb+offset*0.0002*-camPos.z*0.01).rgb,0.95),1);
}
