//DO NOT CHANGE THIS FILE
#define DIFFUSE 0
#define REFLECTIVE 1
struct Ray
{
	vec3 origin, direction;
};
struct Material
{
	vec3 ambient, diffuse, specular;
	float shininess;
};
struct Plane
{
	vec3 position, normal;
	Material material;
	int mat_type;
};
struct Sphere
{
	vec3 center;
	float radius;
	Material material;
	int mat_type;
};
struct Light
{
	vec3 position, color;
};

