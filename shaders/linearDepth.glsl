
// depthSample from depthTexture.r, for instance
float   linearDepth   (float depthSample)
{
    float zNear = 0.2;
    float zFar = 100.0;
    depthSample = 2.0 * depthSample - 1.0;
    float zLinear = 2.0 * zNear * zFar / (zFar + zNear - depthSample * (zFar - zNear));
    return zLinear/zFar;
}