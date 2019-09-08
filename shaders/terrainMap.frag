
#include "simplexNoise.glsl"

uniform sampler2D u_tex;

uniform float u_preScalePower;
uniform float u_curveScale;
uniform float u_curveOffset;
uniform float u_postScalePower;
uniform vec3 u_noise0;
uniform vec3 u_noise1;
uniform vec3 u_noise2;
uniform vec3 u_noise3;
uniform float u_finalScale;
uniform float u_finalPower;


uniform float u_testTime;

varying vec2 v_uv;


const float RESOLUTION = 128.0;


vec4 sampleTex_blur0(vec2 uv)
{
    return texture2D(u_tex, uv);
}

vec4 sampleTex_blur1(vec2 uv)
{
    vec4 color = vec4(0.0);
    vec2 off1 = vec2(1.3, 0);
    color += sampleTex_blur0(uv) * 0.29411764705882354;
    color += sampleTex_blur0(uv + (off1 / RESOLUTION)) * 0.35294117647058826;
    color += sampleTex_blur0(uv - (off1 / RESOLUTION)) * 0.35294117647058826;
    return color; 
}

vec4 sampleTex_blur2(vec2 uv)
{
    vec4 color = vec4(0.0);
    vec2 off1 = vec2(0, 1.3);
    color += sampleTex_blur1(uv) * 0.29411764705882354;
    color += sampleTex_blur1(uv + (off1 / RESOLUTION)) * 0.35294117647058826;
    color += sampleTex_blur1(uv - (off1 / RESOLUTION)) * 0.35294117647058826;
    return color; 
}

float getHeight(vec2 uv)
{
    float inHeight = sampleTex_blur2(uv).r;

    inHeight = pow(inHeight, u_preScalePower);
    inHeight = clamp(u_curveScale*inHeight + u_curveOffset, 0., 1.);
    inHeight = pow(inHeight, u_postScalePower);

    float outHeight = inHeight
        + u_noise0.x * snoise(vec4((uv + vec2(u_noise0.z, 0))*u_noise0.y, 0, 0))
        + u_noise1.x * snoise(vec4((uv + vec2(u_noise1.z, 0))*u_noise1.y, 0, 0))
        + u_noise2.x * snoise(vec4((uv + vec2(u_noise2.z, 0))*u_noise2.y, 0, 0))
        + u_noise3.x * snoise(vec4((uv + vec2(u_noise3.z, 0))*u_noise3.y, 0, 0))
    ;

    return pow(clamp(outHeight * u_finalScale, 0., 1.), u_finalPower);
}

void main()
{
    float height = getHeight(v_uv);

    vec3 directionalLight = normalize(vec3(sin(u_testTime), -2, sin(u_testTime)));

    //vec3 directionalLight = normalize(vec3(-1, -2, 1));
    float G_TERRAIN_WORLDSPACE_HEIGHT =  40.0;
    float G_TERRAIN_WORLDSPACE_SIZE   = 200.0;

    vec3 worldMarch = vec3(
        G_TERRAIN_WORLDSPACE_SIZE * v_uv.x,
        G_TERRAIN_WORLDSPACE_HEIGHT * height,
        G_TERRAIN_WORLDSPACE_SIZE * v_uv.y
    );

    vec3 worldStep = (0.25 * G_TERRAIN_WORLDSPACE_SIZE / 50.0) * -directionalLight;

    float shadow = 1.0;
    for (int i = 0; i < 50; ++i) {
        worldMarch += worldStep;
        float marchHeight = G_TERRAIN_WORLDSPACE_HEIGHT * getHeight(worldMarch.xz / G_TERRAIN_WORLDSPACE_SIZE);
        if (marchHeight > worldMarch.y) {
            shadow = 0.5;
            break;
        }
    }

    gl_FragColor = shadow*vec4(height, height, height, 1) + (1.0-shadow)*vec4(0.5,0.0,0.0,0.0);
}

























