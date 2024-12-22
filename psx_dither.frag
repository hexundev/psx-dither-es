// Source/credit: https://github.com/jmickle66666666/PSX-Dither-Shader
// Source license: MIT
// PSX Dither Shader adapted for GLSL ES

precision highp float;

varying vec2 vTexCoord;
varying vec4 vColor;

uniform sampler2D uMainTexture;
uniform sampler2D uDitherTexture;

uniform vec2 uMainTextureScale;
uniform float uNumColors;
uniform float uDitherIntensity;

#define INV_YUV_G (0.53890924) // 1.0 / 1.8556
#define INV_YUV_B (0.63500127) // 1.0 / 1.5748

float channelError(float col, float colMin, float colMax)
{
    float range = abs(colMin - colMax);
    float aRange = abs(col - colMin);
    return aRange /range;
}

float ditheredChannel(float error, vec2 uv)
{
    vec2 ditherUV = uv * uMainTextureScale;
    float threshold = texture2D(uDitherTexture, ditherUV).a;
    return (error > threshold) ? 1.0 : 0.0;
}

vec3 RGBtoYUV(vec3 rgb) 
{
    vec3 yuv;
    yuv.r = rgb.r * 0.2126 + 0.7152 * rgb.g + 0.0722 * rgb.b;
    yuv.g = (rgb.b - yuv.r) * INV_YUV_G + 0.5;
    yuv.b = (rgb.r - yuv.r) * INV_YUV_B + 0.5;
    return yuv;
}

vec3 YUVtoRGB(vec3 yuv) 
{
    yuv.gb -= 0.5;
    return vec3(
      yuv.r * 1.0 + yuv.b * 1.5748,
      yuv.r * 1.0 + yuv.g * -0.187324 + yuv.b * -0.468124,
      yuv.r * 1.0 + yuv.g * 1.8556);
}

void main()
{	
  // Sample the texture and convert to YUV color space
  vec4 texCol = texture2D(uMainTexture, vTexCoord);
  vec3 yuv = RGBtoYUV(texCol.rgb);
  
  // Clamp the YUV color to specified color depth (default: 32, 5 bits per channel, as per playstation hardware)
  vec3 col1 = floor(yuv * uNumColors) / uNumColors;
  vec3 col2 = ceil(yuv * uNumColors) / uNumColors;
  
  // Dither each channel individually
  vec2 uv = vTexCoord;
  yuv.x = mix(col1.x, col2.x, ditheredChannel(channelError(yuv.x, col1.x, col2.x), uv));
  yuv.y = mix(col1.y, col2.y, ditheredChannel(channelError(yuv.y, col1.y, col2.y), uv));
  yuv.z = mix(col1.z, col2.z, ditheredChannel(channelError(yuv.z, col1.z, col2.z), uv));
  
  // Convert back to RGB
  vec3 dithered = YUVtoRGB(yuv);
  
  gl_FragColor = vec4(mix(texCol.rgb, dithered, uDitherIntensity), texCol.a) * vColor;
}
