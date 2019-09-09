
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


varying vec2 v_uv;


const float RESOLUTION = 1024.0;


vec4 sampleTex_blur0(vec2 uv)
{
    return texture2D(u_tex, uv);
}

float getHeight(vec2 uv)
{
    float inHeight = sampleTex_blur0(uv).r;

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

    vec3 directionalLight = normalize(vec3(0, -1, 2));

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
            shadow = 0.0;
            break;
        }
    }

    gl_FragColor = vec4(height, shadow, 0, 1);
}

























