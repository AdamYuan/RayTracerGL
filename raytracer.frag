#version 430 core

//configs (edit scene at line 66)
#define MAX_DEPTH 3
#define RAY_T_MIN 0.0001f
#define RAY_T_MAX 1.0e30f
#define NONE -1
#define SPHERE 0
#define PLANE 1

out vec4 color;
in vec3 ray_dir;
uniform vec3 ray_origin;

struct Ray
{
	vec3 origin, direction;
};
const Ray kDefaultRay = Ray(vec3(0.0f, 0.0f, 0.0f), vec3(0.0f, 1.0f, 0.0f));
struct Material
{
	vec3 ambient, diffuse, specular;
	float shininess;
};
const Material emerald = {{0.0215, 0.1745, 0.0215}, {0.07568, 0.61424, 0.07568}, {0.633, 0.727811, 0.633}, 0.6};
const Material jade = {{0.135, 0.2225, 0.1575}, {0.54, 0.89, 0.63}, {0.316228, 0.316228, 0.316228}, 0.1};
const Material obsidian = {{0.05375, 0.05, 0.06625}, {0.18275, 0.17, 0.22525}, {0.332741, 0.328634, 0.346435}, 0.3};
const Material pearl = {{0.25, 0.20725, 0.20725}, {1, 0.829, 0.829}, {0.296648, 0.296648, 0.296648}, 0.088};
const Material ruby = {{0.1745, 0.01175, 0.01175}, {0.61424, 0.04136, 0.04136}, {0.727811, 0.626959, 0.626959}, 0.6};
const Material turquoise = {{0.1, 0.18725, 0.1745}, {0.396, 0.74151, 0.69102}, {0.297254, 0.30829, 0.306678}, 0.1};
const Material brass = {{0.329412, 0.223529, 0.027451}, {0.780392, 0.568627, 0.113725}, {0.992157, 0.941176, 0.807843}, 0.2179487};
const Material bronze = {{0.2125, 0.1275, 0.054}, {0.714, 0.4284, 0.18144}, {0.393548, 0.271906, 0.166721}, 0.2};
const Material chrome = {{0.25, 0.25, 0.25}, {0.4, 0.4, 0.4}, {0.774597, 0.774597, 0.774597}, 0.6};
const Material copper = {{0.19125, 0.0735, 0.0225}, {0.7038, 0.27048, 0.0828}, {0.256777, 0.137622, 0.086014}, 0.1};
const Material gold = {{0.24725, 0.1995, 0.0745}, {0.75164, 0.60648, 0.22648}, {0.628281, 0.555802, 0.366065}, 0.4};
const Material silver = {{0.19225, 0.19225, 0.19225}, {0.50754, 0.50754, 0.50754}, {0.508273, 0.508273, 0.508273}, 0.4};
const Material black_plastic = {{0.0, 0.0, 0.0}, {0.01, 0.01, 0.01}, {0.50, 0.50, 0.50}, 0.25};
const Material cyan_plastic = {{0.0, 0.1, 0.06}, {0.0, 0.5098039, 0.5098039}, {0.5019608, 0.5019608, 0.5019608}, .25};
const Material green_plastic = {{0.0, 0.0, 0.0}, {0.1, 0.35, 0.1}, {0.45, 0.55, 0.45}, 0.25};
const Material red_plastic = {{0.0, 0.0, 0.0}, {0.5, 0.0, 0.0}, {0.7, 0.6, 0.6}, .25};
const Material white_plastic = {{0.0, 0.0, 0.0}, {0.55, 0.55, 0.55}, {0.70, 0.70, 0.70}, 0.25};
const Material yellow_plastic = {{0.0, 0.0, 0.0}, {0.5, 0.5, 0.0}, {0.60, 0.60, 0.50}, 0.25};
const Material black_rubber = {{0.02, 0.02, 0.02}, {0.01, 0.01, 0.01}, {0.4, 0.4, 0.4}, 0.078125};
const Material cyan_rubber = {{0.0, 0.05, 0.05}, {0.4, 0.5, 0.5}, {0.04, 0.7, 0.7}, 0.078125};
const Material green_rubber = {{0.0, 0.05, 0.0}, {0.4, 0.5, 0.4}, {0.04, 0.7, 0.04}, 0.078125};
const Material red_rubber = {{0.05, 0.0, 0.0}, {0.5, 0.4, 0.4}, {0.7, 0.04, 0.04}, 0.078125};
const Material white_rubber = {{0.05, 0.05, 0.05}, {0.5, 0.5, 0.5}, {0.7, 0.7, 0.7}, 0.078125};
const Material yellow_rubber = {{0.05, 0.05, 0.0}, {0.5, 0.5, 0.4}, {0.7, 0.7, 0.04}, 0.078125};

struct Plane
{
	vec3 position, normal;
	Material material;
};
struct Sphere
{
	vec3 center;
	float radius;
	Material material;
};
struct Light
{
	vec3 position, color;
};

//EDIT SCENE////////
#define PLANE_NUM 1
#define SPHERE_NUM 2
#define LIGHT_NUM 2
const Plane planes[PLANE_NUM] = 
{
	{{0.0f, 0.0f, 0.0f}, {0.0f, 1.0f, 0.0f}, white_rubber}
};
const Sphere spheres[SPHERE_NUM] = 
{
	{{0.0f, 2.0f, -2.0f}, 2.0f, gold},
	{{0.0f, 1.5f, 2.0f}, 1.5f, copper}
};
const Light lights[LIGHT_NUM] =
{
	{{0.0f, 5.0f, 0.0f}, {1.0f, 1.0f, 1.0f}},
	{{3.0f, 5.0f, 0.0f}, {0.5f, 0.5f, 0.5f}}
};
////////////////////

float plane_intersect(const Plane plane, const Ray ray, float t_max)
{
	float d_dot_n = dot(ray.direction, plane.normal);
	if(d_dot_n == 0.0f)
		return RAY_T_MAX;

	float t = dot(plane.position - ray.origin, plane.normal) / d_dot_n;

	if(t <= RAY_T_MIN || t > t_max)
		return RAY_T_MAX;

	return t;
}
float sphere_intersect(const Sphere sphere, const Ray ray, float t_max)
{
	Ray local_ray = Ray(ray.origin - sphere.center, ray.direction);

	float b = 2.0f * dot(local_ray.direction, local_ray.origin);
	float c = dot(local_ray.origin, local_ray.origin) - sphere.radius * sphere.radius;

	float delta = b*b - 4*c;
	if(delta <= 0.0f)
		return RAY_T_MAX;

	delta = sqrt(delta);

	float t1 = (-b - delta) / 2.0f;
	if(t1 > RAY_T_MIN && t1 < t_max)
		return t1;

	float t2 = (-b + delta) / 2.0f;
	if(t2 > RAY_T_MIN && t2 < t_max)
		return t2;

	return RAY_T_MAX;
}

bool scene_is_intersected(const Ray ray, float t_max)
{
	for(int i = 0; i < PLANE_NUM; ++i)
		if(plane_intersect(planes[i], ray, t_max) < t_max)
			return true;
	for(int i = 0; i < SPHERE_NUM; ++i)
		if(sphere_intersect(spheres[i], ray, t_max) < t_max)
			return true;
	return false;
}

struct TraceReturnStruct
{
	bool terminate;
	vec3 color;
	Ray ray;
	float shininess;
};

TraceReturnStruct trace(const Ray ray)
{
	float t = RAY_T_MAX, new_t;
	int type = NONE, id;
	for(int i = 0; i < PLANE_NUM; ++i)
	{
		new_t = plane_intersect(planes[i], ray, t);
		if(new_t < t)
		{
			t = new_t; type = PLANE; id = i;
		}
	}
	for(int i = 0; i < SPHERE_NUM; ++i)
	{
		new_t = sphere_intersect(spheres[i], ray, t);
		if(new_t < t)
		{
			t = new_t; type = SPHERE; id = i;
		}
	}

	TraceReturnStruct ret;
	ret.terminate = true; ret.color = vec3(0.0f);

	if(type != NONE) //intersected
	{
		Material mat;
		vec3 normal, p = ray.origin + ray.direction * t;
		if(type == PLANE)
		{
			normal = planes[id].normal;
			mat = planes[id].material;
		}
		else if(type == SPHERE)
		{
			normal = normalize(p - spheres[id].center);
			mat = spheres[id].material;
		}

		for(int i = 0; i < LIGHT_NUM; ++i)
		{
			vec3 light_vec = lights[i].position - p;
			float max_t = length(light_vec);
			light_vec = normalize(light_vec);
			float cos_theta = dot(normal, light_vec);

			bool shadowed = true;
			//normal is face the light
			if(cos_theta > 0.0f)
				shadowed = scene_is_intersected(Ray(p, light_vec), max_t);

			//phong
			vec3 ambient = lights[i].color * mat.ambient;
			ret.color += ambient;

			if(!shadowed)
			{
				float diff = max(dot(normal, light_vec), 0.0f);
				vec3 diffuse = mat.diffuse * lights[i].color * diff;

				vec3 reflect_dir = reflect(-light_vec, normal);
				float spec = pow(max(dot(-ray.direction, reflect_dir), 0.0f), mat.shininess * 128.0f);
				vec3 specular = lights[i].color * mat.specular * spec;

				ret.color += diffuse + specular;
			}
		}

		if(mat.shininess > 0.0f)//reflect
		{
			ret.terminate = false;
			ret.shininess = mat.shininess; //set shininess
			ret.ray = Ray(p, reflect(ray.direction, normal));
		}
	}

	return ret;
}

void main()
{
	float k = 1.0f;
	vec3 color3 = vec3(0.0f);
	TraceReturnStruct ret;
	ret.ray = Ray(ray_origin, normalize(ray_dir));
	for(int i = 0; i < MAX_DEPTH; ++i)
	{
		ret = trace(ret.ray);
		color3 += ret.color * k;
		if(ret.terminate)
			break;
		k *= ret.shininess;
	}
	color = vec4(color3, 1.0f);
}
