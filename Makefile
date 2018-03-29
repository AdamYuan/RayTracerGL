RayTracerGL: src/main.cpp src/config.hpp
	g++ ./src/main.cpp ./src/GL/gl3w.c -I./src -lGL -lglfw -lm -ldl -Ofast -std=c++11 -o RayTracerGL

.PHONY: clean

clean:
	rm RayTracerGL
