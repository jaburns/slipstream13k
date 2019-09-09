uniform sampler2D u_tex;
uniform sampler2D u_old;
uniform sampler2D u_depth;
uniform sampler2D u_depth1;
uniform sampler2D u_depth2;
uniform sampler2D u_depth3;
uniform sampler2D u_depth4;
uniform sampler2D u_depth5;
uniform sampler2D u_depth6;

uniform sampler2D u_motion;
uniform samplerCube u_cube1;
uniform samplerCube u_cube2;
uniform float u_interpolate;
uniform float u_aspect;
uniform vec4 u_proj;
uniform vec3 u_clip;
uniform vec2 u_resolution;
uniform float u_time;

uniform mat4 u_pmat;


varying vec3 v_pos;
varying vec2 v_uv;

vec3 getPosition(vec2 uv,sampler2D tex) {
    float depth = texture2D(tex,uv).r;
    return vec3((uv.xy * u_proj.xy + u_proj.zw) * -depth, -depth);
}

float linearDepth(float depthSample)
{
    float zNear = 0.2;
    float zFar = 100.0;
    depthSample = 2.0 * depthSample - 1.0;
    float zLinear = 2.0 * zNear * zFar / (zFar + zNear - depthSample * (zFar - zNear));
    return zLinear/zFar;
}

float rand(vec2 co)
{
    return fract(sin(mod(dot(co.xy + vec2(u_time,u_time*7.) ,vec2(12.9898,78.233)),3.14)) * 43758.5453)*2.-1.;
}

float sampleAO(vec3 C, vec3 n_C, vec2 pos, sampler2D tex){
    vec3 Q = getPosition(pos,tex);
    vec3 v = Q - C;

	float vv = dot(v, v);
	float vn = dot(v, n_C);
    float radius2 = 0.7;
    float bias = 0.0001;
    float epsilon = 0.01;
    float f = max(radius2 - vv, 0.0);
    return f * f * f * max((vn - bias) / (epsilon + vv), 0.0);

}

void main()
{
    vec4 color = texture2D(u_tex, v_uv);

    vec3 camPos = getPosition(v_uv,u_depth);

    vec2 objectMotion = color.gb;

    vec3 norm = normalize(cross(dFdx(camPos),dFdy(camPos)));

    float sum = 0.;
    for(int i=0; i<2; i++){
        //sum+=sampleAO(camPos,norm,v_uv+rand(v_uv+1.)/u_resolution,u_depth);
        sum+=sampleAO(camPos,norm,v_uv+rand(v_uv+2.)/u_resolution*2.,u_depth1);
        sum+=sampleAO(camPos,norm,v_uv+rand(v_uv+3.)/u_resolution*4.,u_depth2);
        sum+=sampleAO(camPos,norm,v_uv+rand(v_uv+4.)/u_resolution*8.,u_depth3);
        sum+=sampleAO(camPos,norm,v_uv+rand(v_uv+5.)/u_resolution*16.,u_depth4);
        sum+=sampleAO(camPos,norm,v_uv+rand(v_uv+6.)/u_resolution*32.,u_depth5);
        sum+=sampleAO(camPos,norm,v_uv+rand(v_uv+7.)/u_resolution*64.,u_depth6);
    }
    sum = sum/12.;

    vec2 uv_off = v_uv+objectMotion;
    vec3 dir = v_pos/length(v_pos);
    vec2 offset = mix(textureCube(u_cube1, dir).rg,textureCube(u_cube2,dir).rg,u_interpolate);
    offset.y*=u_aspect;

    //gl_FragColor = vec4(offset,0,1);
    float i=color.r+mix(1.-sum*3.,0.,-camPos.z*0.01);
    color.r = min(max(color.r,0.),1.);

    vec3 col = mix(mix(vec3(0,0,0.2),vec3(0.5,0,0.2),min(color.r*2.,1.)),vec3(1,0.9,0.7),max(0.,color.r-0.5)*2.);
    col = col*i;
    col = col*0.9+ (norm*0.5+0.5)*0.2;
    //gl_FragColor = vec4(vec3(float(camPos.z<-50.)),1);
    //gl_FragColor = vec4(norm*0.5+0.5,1);
    //gl_FragColor = vec4(vec3(sum),1);
    gl_FragColor = vec4(mix(col,texture2D(u_old,uv_off+offset*0.000003*camPos.z).rgb,0.9),1);
}
