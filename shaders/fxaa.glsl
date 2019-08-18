/**
 * https://github.com/mattdesl/glsl-fxaa
 */

//__export
vec4 fxaa(sampler2D tex, vec2 fragCoord, vec2 resolution)
{
    //compute the texture coords

    vec2 inverseVP = 1.0 / resolution.xy;
    vec2 v_rgbNW = (fragCoord + vec2(-1.0, -1.0)) * inverseVP;
    vec2 v_rgbNE = (fragCoord + vec2(1.0, -1.0)) * inverseVP;
    vec2 v_rgbSW = (fragCoord + vec2(-1.0, 1.0)) * inverseVP;
    vec2 v_rgbSE = (fragCoord + vec2(1.0, 1.0)) * inverseVP;
    vec2 v_rgbM = vec2(fragCoord * inverseVP);
    
    //compute FXAA

    float FXAA_REDUCE_MIN =  (1.0/ 128.0);
    float FXAA_REDUCE_MUL =  (1.0 / 8.0);
    float FXAA_SPAN_MAX   =  8.0;

    vec3 rgbNW = texture2D(tex, v_rgbNW).xyz;
    vec3 rgbNE = texture2D(tex, v_rgbNE).xyz;
    vec3 rgbSW = texture2D(tex, v_rgbSW).xyz;
    vec3 rgbSE = texture2D(tex, v_rgbSE).xyz;
    vec4 texColor = texture2D(tex, v_rgbM);
    vec3 rgbM  = texColor.xyz;
    vec3 luma = vec3(0.299, 0.587, 0.114);
    float lumaNW = dot(rgbNW, luma);
    float lumaNE = dot(rgbNE, luma);
    float lumaSW = dot(rgbSW, luma);
    float lumaSE = dot(rgbSE, luma);
    float lumaM  = dot(rgbM,  luma);
    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));
    
    vec2 dir;
    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));
    
    float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) *
                          (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);
    
    float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
    dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),
              max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),
              dir * rcpDirMin)) * inverseVP;
    
    vec3 rgbA = 0.5 * (
        texture2D(tex, fragCoord * inverseVP + dir * (1.0 / 3.0 - 0.5)).xyz +
        texture2D(tex, fragCoord * inverseVP + dir * (2.0 / 3.0 - 0.5)).xyz);
    vec3 rgbB = rgbA * 0.5 + 0.25 * (
        texture2D(tex, fragCoord * inverseVP + dir * -0.5).xyz +
        texture2D(tex, fragCoord * inverseVP + dir * 0.5).xyz);

    float lumaB = dot(rgbB, luma);

    return vec4((lumaB < lumaMin) || (lumaB > lumaMax) ? rgbA : rgbB, texColor.a);
}
