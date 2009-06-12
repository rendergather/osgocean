uniform sampler2D uTextureMap;
uniform sampler2D uOverlayMap;
uniform sampler2D uNormalMap;

// osgOcean uniforms
// -------------------
uniform float osgOcean_DOF_Near;
uniform float osgOcean_DOF_Focus;
uniform float osgOcean_DOF_Far;
uniform float osgOcean_DOF_Clamp;

uniform bool osgOcean_EnableGlare;
uniform bool osgOcean_EnableDOF;
uniform bool osgOcean_EyeUnderwater;

uniform float osgOcean_UnderwaterFogDensity;
uniform float osgOcean_AboveWaterFogDensity;
uniform float osgOcean_WaterHeight;

uniform int osgOcean_LightID;

uniform vec4 osgOcean_UnderwaterFogColor;
uniform vec4 osgOcean_AboveWaterFogColor;
uniform vec4 osgOcean_UnderwaterDiffuse;
// -------------------

varying vec3 vLightDir;
varying vec3 vEyeVec;

varying float vWorldHeight;
varying float vUnitHeight;

float computeDepthBlur(float depth, float focus, float near, float far, float clampval )
{
   float f;
   if (depth < focus){
      f = (depth - focus)/(focus - near);
   }
   else{
      f = (depth - focus)/(far - focus);
      f = clamp(f, 0.0, clampval);
   }
   return f * 0.5 + 0.5;
}

vec4 lighting( vec4 diffuse, vec4 colormap, vec3 N )
{
	vec4 final_color = gl_LightSource[osgOcean_LightID].ambient * colormap;

	vec3 L = normalize(vLightDir);

	float lambertTerm = dot(N,L);

	if(lambertTerm > 0.0)
	{
		final_color += diffuse * lambertTerm * colormap;

		vec3 E = normalize(vEyeVec);
		vec3 R = reflect(-L, N);

		float specular = pow( max(dot(R, E), 0.0), 2.0 );

		final_color += gl_LightSource[osgOcean_LightID].specular * specular;
	}

	return final_color;
}

void main(void)
{
	vec4 baseColor    = texture2D( uTextureMap, gl_TexCoord[0].st );
	vec4 overlayColor = texture2D( uOverlayMap, gl_TexCoord[1].st );
	vec4 bumpColor    = texture2D( uNormalMap,  gl_TexCoord[0].st );

	float unitHeight = clamp( vUnitHeight, 0.0, 1.0);
	vec4 textureColor = mix(overlayColor, baseColor, unitHeight);

	vec3 bump = (bumpColor.xyz*2.0)-1.0;

	float alpha;
	float fogFactor;
	vec4 fogColor;
	vec4 final_color;

	// +2 tweak here as waves peak above average wave height,
	// and surface fog becomes visible.
	if(osgOcean_EyeUnderwater && vWorldHeight < osgOcean_WaterHeight+2.0)
	{
		final_color = lighting( osgOcean_UnderwaterDiffuse, textureColor, bump );

		fogColor = osgOcean_UnderwaterFogColor;
		fogFactor = exp2(osgOcean_UnderwaterFogDensity * gl_FogFragCoord * gl_FogFragCoord );

		if(osgOcean_EnableDOF)
			alpha = computeDepthBlur( gl_FogFragCoord, osgOcean_DOF_Focus, osgOcean_DOF_Near, osgOcean_DOF_Far, osgOcean_DOF_Clamp );
		else
			alpha = final_color.a;
	}
	else
	{
		final_color = lighting( gl_LightSource[osgOcean_LightID].diffuse, textureColor, bump );

		fogColor = osgOcean_AboveWaterFogColor;
		fogFactor = exp2(osgOcean_AboveWaterFogDensity * gl_FogFragCoord * gl_FogFragCoord );

		if(osgOcean_EnableGlare)
			alpha = 0.0;
		else
			alpha = final_color.a;
	}

	gl_FragColor = mix( fogColor, final_color, fogFactor );
	gl_FragColor.a = alpha;
}