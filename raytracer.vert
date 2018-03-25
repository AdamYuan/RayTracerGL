#version 430 core
layout(location=0) in vec2 vertex_position;
uniform vec3 forward, up, right;
uniform float width, height;
out vec3 ray_dir;
void main()
{
	ray_dir = forward + (right * vertex_position.x * width) + (up * vertex_position.y * height);
    gl_Position = vec4(vertex_position, 0.0f, 1.0f);
}
