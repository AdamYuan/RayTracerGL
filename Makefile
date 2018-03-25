RayTracerGL: main.cpp
	g++ main.cpp ./GL/gl3w.c -I. -lGL -lglfw -lm -ldl -Ofast -std=c++11 -o RayTracerGL

.PHONY: clean

clean:
	rm RayTracerGL
