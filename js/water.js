/* Smart Pools — agua en WebGL
   Hero: la foto de superficie con ondas reales (cursor, toque y gotas al azar).
   Inmersión: con el scroll sube el nivel del agua y debajo aparece la foto bajo el agua,
   que queda ondulando suavemente con burbujas.
   Expone window.SmartWater; main.js anima SmartWater.state.zoom / .rise con ScrollTrigger. */
(function () {
  'use strict';

  var VERT = 'attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }';

  var FRAG = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform sampler2D uTex;',     // superficie
    'uniform sampler2D uTex2;',    // bajo el agua
    'uniform vec2 uImg;',
    'uniform vec2 uFocus;',
    'uniform float uZoom;',
    'uniform float uRise;',
    'uniform float uEdge;',        // dónde empieza el agua en la foto (0-1, desde arriba)
    'uniform vec4 uRip[8];',
    'float hash(vec2 q){ return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }',
    // Cáusticas: patrón de luz que el agua proyecta
    'float caustic(vec2 uv, float t){',
    '  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;',
    '  vec2 i = p; float c = 1.0; float inten = 0.005;',
    '  for (int n = 0; n < 4; n++) {',
    '    float tt = t * (1.0 - (3.5 / float(n + 1)));',
    '    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));',
    '    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));',
    '  }',
    '  c /= 4.0;',
    '  c = 1.17 - pow(c, 1.4);',
    '  return clamp(pow(abs(c), 8.0), 0.0, 1.0);',
    '}',
    // pantalla (y hacia abajo) -> coordenadas de la imagen, igual que object-fit: cover
    'vec2 coverF(vec2 s, float z, vec2 f){',
    '  float rs = uRes.x / uRes.y; float ri = uImg.x / uImg.y;',
    '  vec2 sc = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0);',
    '  sc /= z;',
    '  return (1.0 - sc) * f + s * sc;',
    '}',
    'vec2 cover(vec2 s, float z){ return coverF(s, z, uFocus); }',
    'float waterMask(vec2 p){ return smoothstep(uEdge - 0.002, uEdge + 0.02, p.y); }',
    'float height(vec2 p){',
    '  float ia = uImg.x / uImg.y;',
    '  float persp = clamp((p.y - uEdge) / (1.0 - uEdge), 0.0, 1.0);',
    '  float sc = mix(2.6, 0.9, persp);',
    '  vec2 q = vec2(p.x * ia, p.y * 2.6) * sc;',
    '  float t = uTime;',
    '  float h = sin(q.x * 26.0 + t * 1.1 + sin(q.y * 14.0 + t * 0.7) * 1.2) * 0.45',
    '          + sin(q.x * 15.0 - q.y * 21.0 - t * 1.5) * 0.35',
    '          + sin(q.x * 47.0 + q.y * 33.0 + t * 2.3) * 0.2;',
    '  h *= 0.30;',
    '  for (int k = 0; k < 8; k++) {',
    '    vec4 r = uRip[k];',
    '    float age = t - r.z;',
    '    if (r.w <= 0.0 || age < 0.0 || age > 4.0) continue;',
    '    vec2 d = vec2((p.x - r.x) * ia, (p.y - r.y) * 3.0);',
    '    float dist = length(d) * mix(1.7, 0.85, persp);',
    '    float front = age * 0.16;',
    '    float band = smoothstep(front + 0.012, front - 0.002, dist) * exp(-(front - dist) * 26.0);',
    '    h += r.w * 0.2 * band * exp(-age * 0.9) * sin(dist * 170.0 - age * 16.0);',
    '  }',
    '  return h;',
    '}',
    'void main(){',
    '  vec2 s = vec2(vUv.x, 1.0 - vUv.y);',
    '  vec2 p = cover(vec2(s.x, s.y + 0.16 * uRise), 1.0 + 0.14 * uZoom);',
    '  float m = waterMask(p);',
    '  vec2 off = vec2(0.0); float spec = 0.0; float shade = 0.0;',
    '  if (m > 0.001 && uRise < 0.999) {',
    '    float e = 0.0015;',
    '    float h0 = height(p);',
    '    vec2 g = vec2(height(p + vec2(e, 0.0)) - h0, height(p + vec2(0.0, e)) - h0) / e;',
    '    off = g * 0.00011 * m;',
    '    vec3 n = normalize(vec3(-g * 0.022, 1.0));',
    '    spec = pow(max(dot(n, normalize(vec3(-0.25, -0.55, 0.8))), 0.0), 70.0) * m;',
    '    shade = h0 * 0.05 * m;',
    '  }',
    '  vec3 col = texture2D(uTex, p + off).rgb + spec * 0.5 + shade;',
    '  if (uRise > 0.0) {',
    '    float level = mix(1.12, -0.16, uRise);',
    '    float wl = level + 0.012 * sin(s.x * 11.0 + uTime * 1.8) + 0.006 * sin(s.x * 29.0 - uTime * 2.6);',
    '    float under = smoothstep(wl - 0.004, wl + 0.004, s.y);',
    // lo que queda sobre el agua se desenfoca (la cámara ya está al ras de la superficie)
    '    float above = clamp((wl - s.y) / 0.45, 0.0, 1.0);',
    '    float bl = 0.0032 * smoothstep(0.0, 0.4, uRise) * above * (1.0 - under);',
    '    if (bl > 0.0002) {',
    '      vec3 acc = vec3(0.0);',
    '      for (int k = 0; k < 8; k++) {',
    '        float a = float(k) * 0.7854;',
    '        acc += texture2D(uTex, p + off + vec2(cos(a), sin(a) * uRes.x / uRes.y) * bl).rgb;',
    '      }',
    '      col = mix(col, acc / 8.0 + spec * 0.2, 0.85);',
    '    }',
    '    if (under > 0.0) {',
    '      float wob = mix(0.007, 0.0022, smoothstep(0.6, 1.0, uRise));',
    '      vec2 w = vec2(sin(s.y * 22.0 + uTime * 1.4), cos(s.x * 17.0 + uTime * 1.1)) * wob;',
    '      float zt = smoothstep(0.3, 1.0, uRise);',
    '      float uz = mix(1.6, 1.0, zt);',
    '      vec2 uf = mix(vec2(0.1, 0.05), uFocus, zt);',
    '      vec2 pu = coverF(vec2(s.x, s.y - max(wl, 0.0)), uz, uf) + w;',
    '      vec3 u = texture2D(uTex2, pu).rgb;',
    '      u += caustic(vec2(s.x * uRes.x / uRes.y, s.y) * 1.3, uTime * 0.5 + 23.0) * 0.06;',
    '      u = mix(u, u * vec3(0.82, 0.93, 1.0), (1.0 - smoothstep(0.0, 0.25, s.y - wl)) * (1.0 - uRise) * 0.6);',
    '      col = mix(col, u, under);',
    '    }',
    // línea de agua: brillo, espuma y gotas que saltan
    '    float vis = 1.0 - smoothstep(0.86, 1.0, uRise);',
    '    float fn = 0.5 + 0.5 * sin(s.x * 90.0 + uTime * 3.0) * sin(s.x * 41.0 - uTime * 2.2);',
    '    float dist = s.y - wl;',
    '    col += exp(-abs(dist) * 240.0) * 0.5 * vis;',
    '    col += exp(-abs(dist) * 90.0) * (0.35 + 0.45 * fn) * 0.55 * vis;',
    '    col += smoothstep(0.0, 0.03, dist) * (1.0 - smoothstep(0.03, 0.09, dist)) * (0.08 + 0.1 * fn) * vis;',
    '    if (dist < 0.0 && dist > -0.11) {',
    '      for (int k = 0; k < 2; k++) {',
    '        float sc = 34.0 + 16.0 * float(k);',
    '        vec2 g = vec2(s.x * uRes.x / uRes.y, dist) * sc + float(k) * 3.7;',
    '        vec2 id = floor(g);',
    '        vec2 c = vec2(hash(id + 0.3), hash(id + 1.7)) * 0.6 + 0.2;',
    '        float life = fract(uTime * (0.35 + 0.3 * hash(id + 2.1)) + hash(id + 4.4));',
    '        c.y += (1.0 - life) * 0.6;',
    '        float r = (0.05 + 0.08 * hash(id + 3.3)) * sin(life * 3.1416);',
    '        float d = length(fract(g) - c);',
    '        col += smoothstep(r, r * 0.4, d) * 0.6 * vis * (1.0 + dist / 0.11);',
    '      }',
    '    }',
    '  }',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function createGL(canvas, frag) {
    var gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    if (!gl) return null;
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return null; }
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var cache = {};
    return {
      gl: gl,
      u: function (name) { if (!(name in cache)) cache[name] = gl.getUniformLocation(prog, name); return cache[name]; },
      draw: function () { gl.drawArrays(gl.TRIANGLES, 0, 3); }
    };
  }

  function fit(canvas, gl, dpr) {
    var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    return [w, h];
  }

  function loadImage(src) {
    return new Promise(function (res, rej) {
      var im = new Image();
      im.decoding = 'async';
      im.onload = function () { res(im); };
      im.onerror = rej;
      im.src = src;
    });
  }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var state = { zoom: 0, rise: 0 };
  var t0 = performance.now();
  function now() { return (performance.now() - t0) / 1000; }

  /* ---------------- HERO ---------------- */
  var FOCUS = [0.5, 0.6];        // igual que object-position del <img>
  var EDGE = 0.548;              // borde lejano del agua en hero-surface.jpg
  var hero = { ok: false, ready: false, visible: true, img: [1367, 1000] };
  var heroCanvas = document.querySelector('.hero__gl');
  var heroImgEl = document.querySelector('.hero__img');
  var H = heroCanvas && !reduce ? createGL(heroCanvas, FRAG) : null;
  var ripples = new Float32Array(32);
  var ripIdx = 0;

  function makeTex(gl, unit, img) {
    var tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  var surfaceReady = heroImgEl.complete && heroImgEl.naturalWidth
    ? Promise.resolve(heroImgEl)
    : new Promise(function (res, rej) {
      heroImgEl.addEventListener('load', function () { res(heroImgEl); }, { once: true });
      heroImgEl.addEventListener('error', rej, { once: true });
    });

  hero.readyPromise = (H
    ? Promise.all([surfaceReady, loadImage(heroCanvas.dataset.under)]).then(function (imgs) {
      makeTex(H.gl, 0, imgs[0]);
      makeTex(H.gl, 1, imgs[1]);
      hero.img = [imgs[0].naturalWidth, imgs[0].naturalHeight];
      hero.ok = true; hero.ready = true;
      heroCanvas.classList.add('is-ready');
      return true;
    })
    : surfaceReady.then(function () { return false; })
  ).catch(function () {
    hero.ok = false;
    if (heroCanvas) heroCanvas.style.display = 'none';
    return false;
  });
  if (!H && heroCanvas) heroCanvas.style.display = 'none';

  function heroCover(sx, sy) {
    var r = heroCanvas.getBoundingClientRect();
    var rs = r.width / r.height, ri = hero.img[0] / hero.img[1];
    var scx = rs > ri ? 1 : rs / ri, scy = rs > ri ? ri / rs : 1;
    var z = 1 + 0.14 * state.zoom;
    scx /= z; scy /= z;
    return [(1 - scx) * FOCUS[0] + sx * scx, (1 - scy) * FOCUS[1] + sy * scy];
  }
  function isWaterUV(p) { return p[1] > EDGE + 0.01 && p[1] < 1 && p[0] > 0 && p[0] < 1; }

  hero.isWaterAt = function (cx, cy) {
    if (!hero.ready || state.rise > 0.05) return false;
    var r = heroCanvas.getBoundingClientRect();
    return isWaterUV(heroCover((cx - r.left) / r.width, (cy - r.top) / r.height));
  };
  hero.ripple = function (cx, cy, strength) {
    if (!hero.ready || state.rise > 0.05) return false;
    var r = heroCanvas.getBoundingClientRect();
    var p = heroCover((cx - r.left) / r.width, (cy - r.top) / r.height);
    if (!isWaterUV(p)) return false;
    var i = (ripIdx++ % 8) * 4;
    ripples[i] = p[0]; ripples[i + 1] = p[1]; ripples[i + 2] = now(); ripples[i + 3] = strength;
    return true;
  };

  // gotas al azar para que el agua se vea viva aunque nadie la toque
  if (H) {
    (function drop() {
      setTimeout(function () {
        if (hero.ready && hero.visible) {
          var r = heroCanvas.getBoundingClientRect();
          for (var k = 0; k < 6; k++) {
            if (hero.ripple(r.left + r.width * (0.08 + Math.random() * 0.84), r.top + r.height * (0.62 + Math.random() * 0.36), 0.55 + Math.random() * 0.3)) break;
          }
        }
        drop();
      }, 1500 + Math.random() * 1800);
    })();
  }

  /* ---------------- burbujas (cuando ya estamos bajo el agua) ---------------- */
  var bubCanvas = document.querySelector('.hero__bubbles');
  var bctx = bubCanvas && !reduce ? bubCanvas.getContext('2d') : null;
  var bubbles = [];
  var bubBoost = 0;
  function spawnBubble(w, h, anywhere) {
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10 + Math.random() * 40,
      r: 1.2 + Math.pow(Math.random(), 2.4) * 6,
      v: 22 + Math.random() * 46,
      ph: Math.random() * 6.28,
      amp: 4 + Math.random() * 10
    };
  }
  var lastB = now();
  function drawBubbles(alpha, wlFrac, extra) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = bubCanvas.clientWidth, h = bubCanvas.clientHeight;
    if (bubCanvas.width !== Math.round(w * dpr)) { bubCanvas.width = Math.round(w * dpr); bubCanvas.height = Math.round(h * dpr); }
    var t = now(), dt = Math.min(0.05, t - lastB); lastB = t;
    var target = Math.round(Math.min(130, 26 + w / 45 + bubBoost * 40 + extra));
    while (bubbles.length < target) bubbles.push(spawnBubble(w, h, bubbles.length < 16));
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.clearRect(0, 0, w, h);
    bctx.save();
    bctx.beginPath();
    bctx.rect(0, Math.max(0, wlFrac * h + 6), w, h);
    bctx.clip();
    bctx.globalAlpha = alpha;
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      b.y -= b.v * dt * (1 + bubBoost * 1.5);
      var x = b.x + Math.sin(t * 1.6 + b.ph) * b.amp;
      if (b.y < -20) { if (bubbles.length > target) bubbles.splice(i, 1); else bubbles[i] = spawnBubble(w, h, false); continue; }
      var fade = Math.min(1, b.y / (h * 0.25));
      bctx.beginPath();
      bctx.arc(x, b.y, b.r, 0, 6.2832);
      bctx.strokeStyle = 'rgba(225,248,255,' + (0.45 * fade) + ')';
      bctx.lineWidth = 1;
      bctx.stroke();
      bctx.beginPath();
      bctx.arc(x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.28, 0, 6.2832);
      bctx.fillStyle = 'rgba(255,255,255,' + (0.6 * fade) + ')';
      bctx.fill();
    }
    bctx.restore();
    bubBoost *= 0.94;
  }

  /* ---------------- bucle ---------------- */
  if ('IntersectionObserver' in window) {
    var heroSec = document.querySelector('.hero');
    if (heroSec) new IntersectionObserver(function (e) { hero.visible = e[0].isIntersecting; }, { rootMargin: '100px 0px' }).observe(heroSec);
  }

  var bubblesOn = false;
  function loop() {
    var t = now();
    if (hero.visible) {
      if (H && hero.ready) {
        var gl = H.gl;
        var size = fit(heroCanvas, gl, Math.min(window.devicePixelRatio || 1, 1.5));
        gl.uniform2f(H.u('uRes'), size[0], size[1]);
        gl.uniform1f(H.u('uTime'), t);
        gl.uniform2f(H.u('uImg'), hero.img[0], hero.img[1]);
        gl.uniform2f(H.u('uFocus'), FOCUS[0], FOCUS[1]);
        gl.uniform1f(H.u('uEdge'), EDGE);
        gl.uniform1f(H.u('uZoom'), state.zoom);
        gl.uniform1f(H.u('uRise'), state.rise);
        gl.uniform4fv(H.u('uRip[0]'), ripples);
        gl.uniform1i(H.u('uTex'), 0);
        gl.uniform1i(H.u('uTex2'), 1);
        H.draw();
      }
      if (bctx) {
        var a = Math.min(1, Math.max(0, (state.rise - 0.12) / 0.4));
        var wl = 1.12 - 1.28 * state.rise;
        var extra = 70 * (1 - Math.min(1, Math.max(0, (state.rise - 0.8) / 0.2)));
        if (a > 0) { drawBubbles(a, wl, extra); bubblesOn = true; }
        else if (bubblesOn) { bctx.clearRect(0, 0, bubCanvas.width, bubCanvas.height); bubblesOn = false; }
      }
    }
    requestAnimationFrame(loop);
  }
  if (H || bctx) requestAnimationFrame(loop);

  window.SmartWater = {
    state: state,
    hero: hero,
    boostBubbles: function (v) { bubBoost = Math.min(3, Math.max(bubBoost, v)); }
  };
})();
