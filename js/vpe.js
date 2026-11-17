/* VPE-α (Vector Pixel Enhancement alpha): самописный апскейлер. Читает пиксели и перерисовывает картинку в SVG.
   Конвейер: (опц.) лёгкое подавление шума → квантизация цветов (k-means++) → для каждого цвета маска «этот цвет и всё, что поверх него» (без щелей между слоями)
   → гауссово размытие маски → marching squares с линейной интерполяцией (контур без «лестницы», точность до доли пикселя)
   → сглаживание контура → упрощение (Дуглас–Пойкер) → кривые Безье с сохранением резких углов. Всё в браузере, без внешних библиотек. */
window.VPE = (function () {
  'use strict';
  const VERSION = 'VPE-α 0.1';
  const tick = () => new Promise(r => setTimeout(r, 0));
  const r2 = v => Math.round(v * 100) / 100;
  const hex = c => '#' + [0, 1, 2].map(i => ('0' + Math.max(0, Math.min(255, Math.round(c[i]))).toString(16)).slice(-2)).join('');
  function rng(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* разделимое гауссово размытие с повтором краёв */
  function gblur(src, w, h, sigma, tmp, out) {
    const r = Math.max(1, Math.ceil(sigma * 3)), k = new Float32Array(2 * r + 1);
    let s = 0;
    for (let i = -r; i <= r; i++) { const v = Math.exp(-i * i / (2 * sigma * sigma)); k[i + r] = v; s += v; }
    for (let i = 0; i < k.length; i++) k[i] /= s;
    for (let y = 0; y < h; y++) {
      const o = y * w;
      for (let x = 0; x < w; x++) {
        let a = 0;
        for (let j = -r; j <= r; j++) { let xx = x + j; xx = xx < 0 ? 0 : xx >= w ? w - 1 : xx; a += src[o + xx] * k[j + r]; }
        tmp[o + x] = a;
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let a = 0;
        for (let j = -r; j <= r; j++) { let yy = y + j; yy = yy < 0 ? 0 : yy >= h ? h - 1 : yy; a += tmp[yy * w + x] * k[j + r]; }
        out[y * w + x] = a;
      }
    }
  }

  /* квантизация: k-means++ по выборке пикселей, потом назначаем метку каждому пикселю (-1 = прозрачный) */
  function quantize(d, w, h, K, seed) {
    const n = w * h, rnd = rng(seed), S = [], step = Math.max(1, Math.floor(n / 16000));
    for (let i = 0; i < n; i += step) if (d[i * 4 + 3] >= 128) S.push(i);
    if (!S.length) return null;
    const m = S.length; K = Math.max(1, Math.min(K, m));
    const C = new Float32Array(K * 3), dist = new Float32Array(m).fill(1e12);
    let f = S[(rnd() * m) | 0] * 4; C[0] = d[f]; C[1] = d[f + 1]; C[2] = d[f + 2];
    for (let c = 1; c < K; c++) {
      let tot = 0;
      for (let s = 0; s < m; s++) {
        const q = S[s] * 4, dr = d[q] - C[3 * c - 3], dg = d[q + 1] - C[3 * c - 2], db = d[q + 2] - C[3 * c - 1], e = dr * dr + dg * dg + db * db;
        if (e < dist[s]) dist[s] = e; tot += dist[s];
      }
      let t = rnd() * tot, pick = m - 1;
      for (let s = 0; s < m; s++) { t -= dist[s]; if (t <= 0) { pick = s; break; } }
      const q = S[pick] * 4; C[3 * c] = d[q]; C[3 * c + 1] = d[q + 1]; C[3 * c + 2] = d[q + 2];
    }
    const sum = new Float64Array(K * 3), cnt = new Int32Array(K);
    for (let it = 0; it < 8; it++) {
      sum.fill(0); cnt.fill(0);
      for (let s = 0; s < m; s++) {
        const q = S[s] * 4, r = d[q], g = d[q + 1], b = d[q + 2];
        let best = 0, bd = 1e12;
        for (let c = 0; c < K; c++) { const dr = r - C[3 * c], dg = g - C[3 * c + 1], db = b - C[3 * c + 2], e = dr * dr + dg * dg + db * db; if (e < bd) { bd = e; best = c; } }
        sum[3 * best] += r; sum[3 * best + 1] += g; sum[3 * best + 2] += b; cnt[best]++;
      }
      for (let c = 0; c < K; c++) if (cnt[c]) { C[3 * c] = sum[3 * c] / cnt[c]; C[3 * c + 1] = sum[3 * c + 1] / cnt[c]; C[3 * c + 2] = sum[3 * c + 2] / cnt[c]; }
    }
    const labels = new Int16Array(n), counts = new Int32Array(K);
    for (let i = 0; i < n; i++) {
      const q = i * 4;
      if (d[q + 3] < 128) { labels[i] = -1; continue; }
      const r = d[q], g = d[q + 1], b = d[q + 2];
      let best = 0, bd = 1e12;
      for (let c = 0; c < K; c++) { const dr = r - C[3 * c], dg = g - C[3 * c + 1], db = b - C[3 * c + 2], e = dr * dr + dg * dg + db * db; if (e < bd) { bd = e; best = c; } }
      labels[i] = best; counts[best]++;
    }
    const order = [];
    for (let c = 0; c < K; c++) if (counts[c]) order.push(c);
    order.sort((a, b) => counts[b] - counts[a]);
    const rank = new Int16Array(K).fill(-1);
    order.forEach((c, i) => { rank[c] = i; });
    return { C: C, labels: labels, order: order, rank: rank };
  }

  /* marching squares: пары рёбер ячейки (0 верх, 1 право, 2 низ, 3 лево), седла решаются по центру */
  const SEG = [[], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], null, [[0, 2]], [[0, 3]], [[0, 3]], [[0, 2]], null, [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], []];
  function marching(P, Wp, Hp) {
    const pid = new Map(), X = [], Y = [], N1 = [], N2 = [];
    let cx = 0, cy = 0, ca = 0, cb = 0, cc = 0, cd = 0;
    const pt = (id, x, y) => { let i = pid.get(id); if (i === undefined) { i = X.length; pid.set(id, i); X.push(x); Y.push(y); N1.push(-1); N2.push(-1); } return i; };
    const ep = e => e === 0 ? pt(2 * (cy * Wp + cx), cx + (0.5 - ca) / (cb - ca), cy)
      : e === 1 ? pt(2 * (cy * Wp + cx + 1) + 1, cx + 1, cy + (0.5 - cb) / (cc - cb))
      : e === 2 ? pt(2 * ((cy + 1) * Wp + cx), cx + (0.5 - cd) / (cc - cd), cy + 1)
      : pt(2 * (cy * Wp + cx) + 1, cx, cy + (0.5 - ca) / (cd - ca));
    const link = (i, j) => { if (N1[i] < 0) N1[i] = j; else N2[i] = j; if (N1[j] < 0) N1[j] = i; else N2[j] = i; };
    for (let y = 0; y < Hp - 1; y++) {
      for (let x = 0; x < Wp - 1; x++) {
        const o = y * Wp + x, a = P[o], b = P[o + 1], d = P[o + Wp], c = P[o + Wp + 1];
        const idx = (a >= 0.5 ? 8 : 0) | (b >= 0.5 ? 4 : 0) | (c >= 0.5 ? 2 : 0) | (d >= 0.5 ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        let sg = SEG[idx];
        if (idx === 5) sg = (a + b + c + d) / 4 >= 0.5 ? [[0, 3], [1, 2]] : [[0, 1], [3, 2]];
        else if (idx === 10) sg = (a + b + c + d) / 4 >= 0.5 ? [[0, 1], [3, 2]] : [[0, 3], [1, 2]];
        cx = x; cy = y; ca = a; cb = b; cc = c; cd = d;
        for (let s = 0; s < sg.length; s++) link(ep(sg[s][0]), ep(sg[s][1]));
      }
    }
    /* собираем замкнутые контуры; координаты переводим из сетки с отступом 2 в пиксели изображения (центр пикселя +0.5) */
    const vis = new Uint8Array(X.length), loops = [];
    for (let s = 0; s < X.length; s++) {
      if (vis[s]) continue;
      const L = []; let prev = -1, cur = s;
      while (cur >= 0 && !vis[cur]) {
        vis[cur] = 1; L.push(X[cur] - 1.5, Y[cur] - 1.5);
        const nx = N1[cur] !== prev ? N1[cur] : N2[cur];
        prev = cur; cur = nx;
      }
      if (L.length >= 8) loops.push(L);
    }
    return loops;
  }
  function area(L) {
    const n = L.length / 2; let a = 0;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; a += L[2 * i] * L[2 * j + 1] - L[2 * j] * L[2 * i + 1]; }
    return Math.abs(a) / 2;
  }
  function smooth1(L) {
    const n = L.length / 2, o = new Array(L.length);
    for (let i = 0; i < n; i++) {
      const p = (i + n - 1) % n, q = (i + 1) % n;
      o[2 * i] = 0.25 * L[2 * p] + 0.5 * L[2 * i] + 0.25 * L[2 * q];
      o[2 * i + 1] = 0.25 * L[2 * p + 1] + 0.5 * L[2 * i + 1] + 0.25 * L[2 * q + 1];
    }
    return o;
  }
  function mark(L, n, a, b, eps, keep) {
    const st = [a, b];
    while (st.length) {
      const j = st.pop(), i = st.pop();
      if (j - i < 2) continue;
      const ax = L[2 * (i % n)], ay = L[2 * (i % n) + 1], bx = L[2 * (j % n)], by = L[2 * (j % n) + 1];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      let md = -1, mk = -1;
      for (let k = i + 1; k < j; k++) {
        const px = L[2 * k], py = L[2 * k + 1];
        let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const qx = ax + t * dx - px, qy = ay + t * dy - py, e = qx * qx + qy * qy;
        if (e > md) { md = e; mk = k; }
      }
      if (md > eps * eps) { keep[mk] = 1; st.push(i, mk, mk, j); }
    }
  }
  function simplify(L, eps) {
    const n = L.length / 2;
    if (n < 8) return L;
    let far = 0, md = -1;
    for (let i = 1; i < n; i++) { const dx = L[2 * i] - L[0], dy = L[2 * i + 1] - L[1], e = dx * dx + dy * dy; if (e > md) { md = e; far = i; } }
    const keep = new Uint8Array(n); keep[0] = 1; keep[far] = 1;
    mark(L, n, 0, far, eps, keep); mark(L, n, far, n, eps, keep);
    const o = [];
    for (let i = 0; i < n; i++) if (keep[i]) o.push(L[2 * i], L[2 * i + 1]);
    return o;
  }
  /* кривые Безье через точки (катмулл–ром), на резких углах касательная равна нулю: углы не заливаются */
  function toPath(L) {
    const n = L.length / 2;
    if (n < 3) return '';
    const X = i => L[2 * ((i + n) % n)], Y = i => L[2 * ((i + n) % n) + 1];
    const T = new Array(n);
    for (let i = 0; i < n; i++) {
      const ux = X(i) - X(i - 1), uy = Y(i) - Y(i - 1), vx = X(i + 1) - X(i), vy = Y(i + 1) - Y(i);
      const cos = (ux * vx + uy * vy) / ((Math.hypot(ux, uy) * Math.hypot(vx, vy)) || 1);
      if (cos < 0.2) { T[i] = null; continue; }
      const tx = X(i + 1) - X(i - 1), ty = Y(i + 1) - Y(i - 1), l = Math.hypot(tx, ty) || 1;
      T[i] = [tx / l, ty / l];
    }
    let d = 'M' + r2(X(0)) + ' ' + r2(Y(0));
    for (let i = 0; i < n; i++) {
      const x1 = X(i), y1 = Y(i), x2 = X(i + 1), y2 = Y(i + 1), dd = Math.hypot(x2 - x1, y2 - y1) / 3, t1 = T[i], t2 = T[(i + 1) % n];
      const c1x = t1 ? x1 + t1[0] * dd : x1 + (x2 - x1) / 3, c1y = t1 ? y1 + t1[1] * dd : y1 + (y2 - y1) / 3;
      const c2x = t2 ? x2 - t2[0] * dd : x2 - (x2 - x1) / 3, c2y = t2 ? y2 - t2[1] * dd : y2 - (y2 - y1) / 3;
      d += 'C' + r2(c1x) + ' ' + r2(c1y) + ' ' + r2(c2x) + ' ' + r2(c2y) + ' ' + r2(x2) + ' ' + r2(y2);
    }
    return d + 'Z';
  }

  /* основной конвейер. im: ImageData; o: {colors, sigma, eps, speck, passes, denoise, scale} */
  async function run(im, o, say) {
    say = say || function () {};
    const w = im.width, h = im.height, n = w * h;
    let d = im.data;
    if (o.denoise) {
      say('Убираю шум…'); await tick();
      d = new Uint8ClampedArray(im.data);
      const ch = new Float32Array(n), tmp = new Float32Array(n), out = new Float32Array(n);
      for (let c = 0; c < 3; c++) {
        for (let i = 0; i < n; i++) ch[i] = im.data[i * 4 + c];
        gblur(ch, w, h, 0.7, tmp, out);
        for (let i = 0; i < n; i++) d[i * 4 + c] = out[i];
      }
    }
    say('Строю палитру…'); await tick();
    const Q = quantize(d, w, h, o.colors, 12345);
    if (!Q) throw new Error('картинка полностью прозрачная');
    const mask = new Float32Array(n), F = new Float32Array(n), tmp = new Float32Array(n);
    const Wp = w + 4, Hp = h + 4, P = new Float32Array(Wp * Hp);
    const K = Q.order.length;
    let shapes = '', loopsN = 0, nodes = 0;
    for (let ri = 0; ri < K; ri++) {
      say('Слой ' + (ri + 1) + ' из ' + K + '…'); await tick();
      const col = hex([Q.C[3 * Q.order[ri]], Q.C[3 * Q.order[ri] + 1], Q.C[3 * Q.order[ri] + 2]]);
      /* маска слоя: этот цвет и всё, что рисуется поверх — стыки перекрываются, щелей нет */
      let full = true;
      for (let i = 0; i < n; i++) { const l = Q.labels[i], m = (l >= 0 && Q.rank[l] >= ri) ? 1 : 0; mask[i] = m; if (!m) full = false; }
      if (full) { shapes += '<rect width="' + w + '" height="' + h + '" fill="' + col + '"/>'; loopsN++; continue; }
      gblur(mask, w, h, o.sigma, tmp, F);
      P.fill(0);
      for (let y = -1; y <= h; y++) {
        const yy = y < 0 ? 0 : y >= h ? h - 1 : y;
        for (let x = -1; x <= w; x++) { const xx = x < 0 ? 0 : x >= w ? w - 1 : x; P[(y + 2) * Wp + x + 2] = F[yy * w + xx]; }
      }
      const loops = marching(P, Wp, Hp);
      let dstr = '';
      for (let li = 0; li < loops.length; li++) {
        let L = loops[li];
        if (area(L) < o.speck) continue;
        for (let p = 0; p < o.passes; p++) L = smooth1(L);
        L = simplify(L, o.eps);
        if (L.length < 6) continue;
        dstr += toPath(L); loopsN++; nodes += L.length / 2;
      }
      if (dstr) shapes += '<path fill="' + col + '" fill-rule="evenodd" d="' + dstr + '"/>';
    }
    const W = Math.round(w * o.scale), H = Math.round(h * o.scale);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + W + '" height="' + H + '" shape-rendering="geometricPrecision">' + shapes + '</svg>';
    return { svg: svg, w: w, h: h, W: W, H: H, stats: { layers: K, paths: loopsN, nodes: nodes, bytes: svg.length } };
  }

  return { version: VERSION, run: run };
})();
