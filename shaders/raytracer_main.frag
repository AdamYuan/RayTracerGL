out vec4 color;
in vec3 ray_dir;
uniform vec3 ray_origin;
uniform bool enable_trace;

#define NONE -1
#define SPHERE 0
#define PLANE 1

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
		int mat_type;
		vec3 normal, p = ray.origin + ray.direction * t;
		if(type == PLANE)
		{
			normal = planes[id].normal;
			mat = planes[id].material;
			mat_type = planes[id].mat_type;
		}
		else if(type == SPHERE)
		{
			normal = normalize(p - spheres[id].center);
			mat = spheres[id].material;
			mat_type = spheres[id].mat_type;
		}

		if(enable_trace) //tracing
		{
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

			if(mat_type == REFLECTIVE && mat.shininess > 0.0f)//reflect
			{
				ret.terminate = false;
				ret.shininess = mat.shininess; //set shininess
				ret.ray = Ray(p, reflect(ray.direction, normal));
			}
		}
		else
			ret.color = mat.diffuse * dot(normal, -ray.direction);
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
		k *= ret.shininess;
		if(ret.terminate || k < MIN_K)
			break;
	}
	color3 = pow(color3, vec3(1.0f / GAMMA));
	color = vec4(color3, 1.0f);
}
