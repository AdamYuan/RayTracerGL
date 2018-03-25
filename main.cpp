#include <iostream>
#include <fstream>
#include "GL/gl3w.h"
#include <GLFW/glfw3.h>
#include <glm/glm.hpp>
#include <glm/gtc/type_ptr.hpp>

#include "config.hpp"

struct Resources 
{ 
	GLuint vao, vbo, program, unif_forward, unif_right, unif_up, unif_width, unif_height, unif_origin; 
};

struct Camera
{
	glm::vec3 origin, up_guide, forward, right, up;
	float fov, yaw, pitch, aspect_ratio;
	explicit Camera(const glm::vec3 &origin, const glm::vec3 &up_guide, float fov)
		: origin(origin), up_guide(up_guide), fov(fov)
	{
		yaw = pitch = 0.0f;
		Update(WIDTH, HEIGHT);
	}

	void Update(int width, int height)
	{
		forward.x = glm::cos(glm::radians(yaw)) * glm::cos(glm::radians(pitch));
		forward.y = glm::sin(glm::radians(pitch));
		forward.z = glm::sin(glm::radians(yaw)) * glm::cos(glm::radians(pitch));
		forward = glm::normalize(forward);

		right = glm::normalize(glm::cross(forward, up_guide));
		up = cross(right, forward);

		aspect_ratio = (float)width / (float)height;
	}

	void SetUniforms(const Resources &res)
	{
		float height = glm::tan(fov), width = height * aspect_ratio;
		glUniform3fv(res.unif_forward, 1, glm::value_ptr(forward));
		glUniform3fv(res.unif_right, 1, glm::value_ptr(right));
		glUniform3fv(res.unif_up, 1, glm::value_ptr(up));
		glUniform3fv(res.unif_origin, 1, glm::value_ptr(origin));
		glUniform1f(res.unif_height, height);
		glUniform1f(res.unif_width, width);
	}

	void Control(GLFWwindow *window)
	{
		float speed = 0.05f; // adjust accordingly
		if (glfwGetKey(window, GLFW_KEY_W) == GLFW_PRESS)
			origin += speed * forward;
		if (glfwGetKey(window, GLFW_KEY_S) == GLFW_PRESS)
			origin -= speed * forward;
		if (glfwGetKey(window, GLFW_KEY_A) == GLFW_PRESS)
			origin -= glm::normalize(glm::cross(forward, up)) * speed;
		if (glfwGetKey(window, GLFW_KEY_D) == GLFW_PRESS)
			origin += glm::normalize(glm::cross(forward, up)) * speed;
	}

	void ProcessMouseMovement(float x_offset, float y_offset)
	{
		x_offset *= MOUSE_SENSITIVITY; y_offset *= MOUSE_SENSITIVITY;
		yaw += x_offset; pitch -= y_offset;

		pitch = glm::clamp(pitch, -89.9f, 89.9f);
	}
};


class Application
{
	private:
		GLFWwindow *window_;
		Resources res_;
		Camera cam_;
		int width_, height_;
		bool control_;

		std::string read_file(const char *filename)
		{
			std::ifstream in(filename);
			return {std::istreambuf_iterator<char>(in), std::istreambuf_iterator<char>()};
		}

		static void key_callback(GLFWwindow* window, int key, int scancode, int action, int mods)
		{
			Application *app = (Application*) glfwGetWindowUserPointer(window);
			if(key == GLFW_KEY_ESCAPE && action == GLFW_PRESS)
				app->control_ = !app->control_;
		}

		static void framebuffer_size_callback(GLFWwindow* window, int width, int height)
		{
			Application *app = (Application*) glfwGetWindowUserPointer(window);
			app->width_ = width; app->height_ = height;
			glViewport(0, 0, width, height);
		}

		static void window_focus_callback(GLFWwindow* window, int focused)
		{
			Application *app = (Application*) glfwGetWindowUserPointer(window);
			if(focused == GLFW_FALSE)
				app->control_ = false;
		}

		void init_glfw()
		{
			gl3wInit();

			glfwInit();
			glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
			glfwWindowHint(GLFW_RESIZABLE, GL_TRUE);
			glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 4);
			glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
			window_ = glfwCreateWindow(width_, height_, "", nullptr, nullptr);
			glfwMakeContextCurrent(window_);

			glfwSetWindowUserPointer(window_, (void*)this);
			glfwSetKeyCallback(window_, key_callback);
			glfwSetFramebufferSizeCallback(window_, framebuffer_size_callback);
			glfwSetWindowFocusCallback(window_, window_focus_callback);
		}

		void init_buffers()
		{
			constexpr GLfloat quad_vertices[] { -1.0f, -1.0f, 1.0f, -1.0f, 1.0f, 1.0f, 1.0f, 1.0f, -1.0f, 1.0f, -1.0f, -1.0f };
			glGenBuffers(1, &res_.vbo);
			glGenVertexArrays(1, &res_.vao);

			glBindVertexArray(res_.vao);
			glBindBuffer(GL_ARRAY_BUFFER, res_.vbo);
			glBufferData(GL_ARRAY_BUFFER, sizeof(quad_vertices), quad_vertices, GL_STATIC_DRAW);
			glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 2 * sizeof(GL_FLOAT), nullptr);
			glEnableVertexAttribArray(0);
		}

		void init_shaders()
		{
			std::string vert_shader_str = read_file(VERT_SHADER), frag_shader_str = read_file(FRAG_SHADER);
			const char *vert_shader_src = vert_shader_str.c_str(), *frag_shader_src = frag_shader_str.c_str();
			GLuint vert_shader = glCreateShader(GL_VERTEX_SHADER), frag_shader = glCreateShader(GL_FRAGMENT_SHADER);

			int success; char info_log[10000];
			{
				glShaderSource(vert_shader, 1, &vert_shader_src, nullptr);
				glCompileShader(vert_shader);

				glShaderSource(frag_shader, 1, &frag_shader_src, nullptr);
				glCompileShader(frag_shader);

				glGetShaderiv(frag_shader, GL_COMPILE_STATUS, &success);
				if(!success)
				{
					glGetShaderInfoLog(frag_shader, 10000, nullptr, info_log);
					printf("%s\n\n\n", info_log);
				}
			}

			//link shaders
			{
				res_.program = glCreateProgram();
				glAttachShader(res_.program, vert_shader);
				glAttachShader(res_.program, frag_shader);
				glLinkProgram(res_.program);
			}

			res_.unif_forward = glGetUniformLocation(res_.program, "forward");
			res_.unif_up = glGetUniformLocation(res_.program, "up");
			res_.unif_right = glGetUniformLocation(res_.program, "right");
			res_.unif_width = glGetUniformLocation(res_.program, "width");
			res_.unif_height = glGetUniformLocation(res_.program, "height");
			res_.unif_origin = glGetUniformLocation(res_.program, "ray_origin");

			glDeleteShader(vert_shader); glDeleteShader(frag_shader);
		}

		void destroy_gl_objects()
		{
			glDeleteVertexArrays(1, &res_.vao);
			glDeleteBuffers(1, &res_.vbo);
			glDeleteProgram(res_.program);
		}

		void render()
		{
			glUseProgram(res_.program);
			cam_.SetUniforms(res_);
			glBindVertexArray(res_.vao);
			glDrawArrays(GL_TRIANGLES, 0, 6);
		}

		double get_fps()
		{
			static double t_sum = 0.0, fps = 0.0f, t = glfwGetTime();
			static int t_counter = 0;

			double t_now = glfwGetTime();
			t_sum += t_now - t;
			t = t_now;

			if(++t_counter > FPS_REFRESH_RATE)
			{
				fps = (double)t_counter / t_sum;
				t_counter = 0;
				t_sum = 0;
			}

			return fps;
		}

	public:
		explicit Application() : cam_({0.0f, 5.0f, 0.0f}, {0.0f, 1.0f, 0.0f}, 0.3926990817f), width_(WIDTH), height_(HEIGHT), control_(true)
		{
			init_glfw();
			init_buffers();
			init_shaders();
		}

		void Run()
		{
			char title[512];
			double xpos, ypos;
			while(!glfwWindowShouldClose(window_))
			{
				glClear(GL_COLOR_BUFFER_BIT);
				render();
				glfwSwapBuffers(window_);

				glfwPollEvents();

				cam_.Update(width_, height_);

				if(control_)
				{
					glfwSetInputMode(window_, GLFW_CURSOR, GLFW_CURSOR_HIDDEN);
					cam_.Control(window_);
					glfwGetCursorPos(window_, &xpos, &ypos);
					cam_.ProcessMouseMovement(xpos - WIDTH / 2.0f, ypos - HEIGHT / 2.0f);
					glfwSetCursorPos(window_, WIDTH / 2.0f, HEIGHT / 2.0f);
				}
				else
					glfwSetInputMode(window_, GLFW_CURSOR, GLFW_CURSOR_NORMAL);

				sprintf(title, "fps: %lf [press esc to toggle control]", get_fps());
				glfwSetWindowTitle(window_, title);
			}
		}

		~Application()
		{
			destroy_gl_objects();
		}
};

int main()
{
	Application app;
	app.Run();
	return 0;
}
