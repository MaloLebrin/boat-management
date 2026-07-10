import type { CanvasRenderer } from '~/composables/use_canvas_lifecycle'
import { MESH_PALETTES, hexToRgb01, type MeshVariant } from './mesh_gradient_shared'

/**
 * Moteur WebGL du dégradé maillé — la technique du hero de stripe.com :
 * bruit simplex 2D (Ashima, domaine public) empilé en Fractal Brownian
 * Motion, avec « domain warping » (le champ de bruit se replie sur
 * lui-même) et pré-warp sinusoïdal des coordonnées décalé dans le temps.
 * Un seul triangle plein écran, tout le travail est dans le fragment shader.
 * Retourne `null` si WebGL est indisponible → repli sur le moteur canvas 2D.
 */

const VERTEX_SRC = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAGMENT_SRC = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_colors[5];
uniform float u_intensity;
uniform float u_lightMode;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p *= 2.0;
    a *= 0.55;
  }
  return v;
}

void main() {
  float t = u_time;
  vec2 p = v_uv * vec2(max(u_resolution.x / max(u_resolution.y, 1.0), 0.5), 1.0) * 1.4;
  p += 0.25 * vec2(sin(t * 0.7 + p.y * 2.0), cos(t * 0.5 + p.x * 2.0));
  vec2 q = vec2(fbm(p + t * 0.15), fbm(p + vec2(5.2, 1.3)));
  vec2 r = vec2(fbm(p + 2.0 * q + t * 0.12), fbm(p + 2.0 * q + vec2(8.3, 2.8)));
  float n = 0.5 + 0.5 * fbm(p + 2.0 * r);
  vec3 col = mix(u_colors[0], u_colors[1], smoothstep(0.2, 0.8, n));
  col = mix(col, u_colors[2], smoothstep(0.3, 0.9, 0.5 + 0.5 * q.x));
  col = mix(col, u_colors[3], smoothstep(0.55, 0.95, 0.5 + 0.5 * r.y));
  col = mix(col, u_colors[4], 0.6 * smoothstep(0.6, 1.0, abs(q.y)));
  float alpha = u_intensity * (0.55 + 0.45 * n);
  alpha = mix(alpha, alpha * 0.55, u_lightMode);
  gl_FragColor = vec4(col * alpha, alpha);
}
`

interface GlState {
  program: WebGLProgram
  buffer: WebGLBuffer
  uTime: WebGLUniformLocation | null
  uResolution: WebGLUniformLocation | null
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function setupProgram(
  gl: WebGLRenderingContext,
  colors: [number, number, number][],
  intensity: number,
  lightMode: boolean
): GlState | null {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC)
  const program = gl.createProgram()
  const buffer = gl.createBuffer()
  if (!vertex || !fragment || !program || !buffer) return null
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    gl.deleteBuffer(buffer)
    return null
  }
  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  // Un triangle couvrant tout l'écran (pas de quad, pas d'index buffer).
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const aPosition = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(aPosition)
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)
  gl.uniform3fv(gl.getUniformLocation(program, 'u_colors'), colors.flat())
  gl.uniform1f(gl.getUniformLocation(program, 'u_intensity'), intensity)
  gl.uniform1f(gl.getUniformLocation(program, 'u_lightMode'), lightMode ? 1 : 0)
  return {
    program,
    buffer,
    uTime: gl.getUniformLocation(program, 'u_time'),
    uResolution: gl.getUniformLocation(program, 'u_resolution'),
  }
}

export function createWebglMeshRenderer(
  canvas: HTMLCanvasElement,
  variant: MeshVariant,
  intensity: number
): CanvasRenderer | null {
  let gl: WebGLRenderingContext | null = null
  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    }) as WebGLRenderingContext | null
  } catch {
    gl = null
  }
  if (!gl) return null

  const palette = MESH_PALETTES[variant]
  const colors = palette.colors.map(hexToRgb01)
  let state = setupProgram(gl, colors, intensity, palette.mode === 'light')
  if (!state) return null

  let lost = false
  let width = 0
  let height = 0

  const onContextLost = (event: Event) => {
    event.preventDefault()
    lost = true
  }
  const onContextRestored = () => {
    if (!gl) return
    state = setupProgram(gl, colors, intensity, palette.mode === 'light')
    if (state) {
      lost = false
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    }
  }
  canvas.addEventListener('webglcontextlost', onContextLost)
  canvas.addEventListener('webglcontextrestored', onContextRestored)

  return {
    resize(w, h) {
      width = w
      height = h
      if (!gl || lost) return
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    },
    drawFrame(t) {
      if (!gl || !state || lost) return
      gl.uniform1f(state.uTime, t * 0.0001)
      gl.uniform2f(state.uResolution, width, height)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    destroy() {
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', onContextRestored)
      if (gl && state && !lost) {
        gl.deleteProgram(state.program)
        gl.deleteBuffer(state.buffer)
      }
      state = null
      gl = null
    },
  }
}
