/* VPE-α (Vector Pixel Enhancement alpha): самописный апскейлер. Читает пиксели и перерисовывает картинку в SVG.
   Конвейер (v0.4):
   0) быстрая оценка резкости (дисперсия Лапласиана)
   1) фильтр Кувахары по цвету (радиус ограничен размером картинки) → k-means++ → слияние близких смежных цветов (ΔE в Lab)
   2) маска «этот цвет и всё, что поверх» → поле: Кувахара по маске + 3×3-покрытие для субпикселя
      · фон и распознанный текст — резкие; мягкие переходы — только по явной опции soft
      · текст ищется и как «пятно» слоя, и как «дырка» в слое (тёмный текст на светлой фигуре)
   3) marching squares → углы (Potrace-подход) → сглаживание без углов → Дуглас–Пекер → кривые Безье
   4) адаптивный speck (мягкие коэффициенты, потолок по площади картинки)
   5) словарь символов (data/glyphs.json)
   Всё в браузере, без внешних библиотек. */
window.VPE = (function () {
  'use strict';
  const VERSION = 'VPE-α 0.4';
  const SRC = (document.currentScript && document.currentScript.src) || '';
  const tick = () => new Promise(r => setTimeout(r, 0));
  const r2 = v => Math.round(v * 100) / 100;
  const hex = c => '#' + [0, 1, 2].map(i => ('0' + Math.max(0, Math.min(255, Math.round(c[i]))).toString(16)).slice(-2)).join('');
  function rng(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- 0. резкость: дисперсия Лапласиана (ядро 0 1 0 / 1 -4 1 / 0 1 0) по яркости ---------- */
  const SHARP_BLURRY = 50, SHARP_SOFT = 250; // < 50 размыто, < 250 мягко, иначе резко
  function sharpness(im) {
    const w = im.width, h = im.height, d = im.data;
    if (w < 3 || h < 3) return { variance: 0, level: 'unknown' };
    const ys = Math.max(1, Math.floor(w * h / 1000000));
    const g = i => 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    let s = 0, s2 = 0, c = 0;
    for (let y = 1; y < h - 1; y += ys) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (d[i * 4 + 3] < 128) continue;
        const l = g(i - w) + g(i + w) + g(i - 1) + g(i + 1) - 4 * g(i);
        s += l; s2 += l * l; c++;
      }
    }
    if (!c) return { variance: 0, level: 'unknown' };
    const m = s / c, v = s2 / c - m * m;
    return { variance: v, level: v < SHARP_BLURRY ? 'blurry' : v < SHARP_SOFT ? 'soft' : 'sharp' };
  }

  /* ---------- цвет: sRGB → CIE Lab, ΔE76 ---------- */
  function lab(r, g, b) {
    const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const R = f(r), G = f(g), B = f(b);
    const q = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    const X = q((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047), Y = q(0.2126 * R + 0.7152 * G + 0.0722 * B), Z = q((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
    return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
  }
  const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  /* ---------- 1. фильтр Кувахары ----------
     Для каждого пикселя берём 4 квадранта (r+1)×(r+1), сходящихся в нём; результат — среднее квадранта с наименьшей дисперсией яркости.
     stride/nch: 4/3 для RGBA-изображения, 1/1 для скалярного поля. */
  function kuwahara(src, w, h, stride, nch, r, out) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let bv = 1e30, m0 = 0, m1 = 0, m2 = 0;
        for (let q = 0; q < 4; q++) {
          let xa = (q & 1) ? x : x - r, xb = (q & 1) ? x + r : x, ya = (q & 2) ? y : y - r, yb = (q & 2) ? y + r : y;
          if (xa < 0) xa = 0; if (xb >= w) xb = w - 1; if (ya < 0) ya = 0; if (yb >= h) yb = h - 1;
          let c = 0, s0 = 0, s1 = 0, s2 = 0, sl = 0, sq = 0;
          for (let yy = ya; yy <= yb; yy++) {
            for (let xx = xa; xx <= xb; xx++) {
              const i = (yy * w + xx) * stride, a = src[i];
              let l = a;
              if (nch === 3) { const b = src[i + 1], e = src[i + 2]; s1 += b; s2 += e; l = 0.299 * a + 0.587 * b + 0.114 * e; }
              s0 += a; sl += l; sq += l * l; c++;
            }
          }
          const mean = sl / c, v = sq / c - mean * mean;
          if (v < bv) { bv = v; m0 = s0 / c; m1 = s1 / c; m2 = s2 / c; }
        }
        const o = (y * w + x) * stride;
        out[o] = m0;
        if (nch === 3) { out[o + 1] = m1; out[o + 2] = m2; }
      }
    }
  }
  /* среднее 3×3 (покрытие пикселя) — даёт субпиксельную позицию границы для marching squares */
  function box3(src, w, h, tmp, out) {
    for (let y = 0; y < h; y++) {
      const o = y * w;
      for (let x = 0; x < w; x++) {
        const a = src[o + (x > 0 ? x - 1 : 0)], b = src[o + x], c = src[o + (x < w - 1 ? x + 1 : x)];
        tmp[o + x] = (a + b + c) / 3;
      }
    }
    for (let y = 0; y < h; y++) {
      const ya = (y > 0 ? y - 1 : 0) * w, yb = y * w, yc = (y < h - 1 ? y + 1 : y) * w;
      for (let x = 0; x < w; x++) out[yb + x] = (tmp[ya + x] + tmp[yb + x] + tmp[yc + x]) / 3;
    }
  }

  /* ---------- слияние близких смежных цветов (агломеративно, ΔE в Lab) ----------
     T — порог ΔE для смежных кластеров; несмежные сливаются только при ΔE < T/3; совсем мелкие кластеры
     (кольца антиалиасинга) вливаются в ближайший смежный при ΔE < 4T. */
  function mergeClose(C, labels, counts, K, w, h, T, minShare) {
    const n = w * h, adj = new Uint8Array(K * K);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x, a = labels[i];
        if (a < 0) continue;
        if (x + 1 < w) { const b = labels[i + 1]; if (b >= 0 && b !== a) { adj[a * K + b] = 1; adj[b * K + a] = 1; } }
        if (y + 1 < h) { const b = labels[i + w]; if (b >= 0 && b !== a) { adj[a * K + b] = 1; adj[b * K + a] = 1; } }
      }
    }
    const cnt = Float64Array.from(counts), sum = new Float64Array(K * 3), alive = new Uint8Array(K), map = new Int16Array(K);
    for (let c = 0; c < K; c++) { map[c] = c; alive[c] = cnt[c] > 0 ? 1 : 0; for (let j = 0; j < 3; j++) sum[3 * c + j] = C[3 * c + j] * cnt[c]; }
    const tiny = minShare * n;
    for (;;) {
      const L = [];
      for (let c = 0; c < K; c++) if (alive[c]) L[c] = lab(sum[3 * c] / cnt[c], sum[3 * c + 1] / cnt[c], sum[3 * c + 2] / cnt[c]);
      let bi = -1, bj = -1, bd = 1e9;
      for (let i = 0; i < K; i++) {
        if (!alive[i]) continue;
        for (let j = i + 1; j < K; j++) {
          if (!alive[j]) continue;
          const e = dE(L[i], L[j]), ad = adj[i * K + j];
          const ok = e < (ad ? T : T / 3) || (ad && (cnt[i] < tiny || cnt[j] < tiny) && e < 4 * T);
          if (ok && e < bd) { bd = e; bi = i; bj = j; }
        }
      }
      if (bi < 0) break;
      for (let j = 0; j < 3; j++) sum[3 * bi + j] += sum[3 * bj + j];
      cnt[bi] += cnt[bj]; alive[bj] = 0;
      for (let k = 0; k < K; k++) if (adj[bj * K + k]) { adj[bi * K + k] = 1; adj[k * K + bi] = 1; }
      for (let c = 0; c < K; c++) if (map[c] === bj) map[c] = bi;
    }
    for (let i = 0; i < n; i++) { const l = labels[i]; if (l >= 0) labels[i] = map[l]; }
    counts.fill(0);
    for (let c = 0; c < K; c++) {
      if (alive[c]) for (let j = 0; j < 3; j++) C[3 * c + j] = sum[3 * c + j] / cnt[c];
      if (alive[c]) counts[c] = cnt[c];
    }
  }

  /* квантизация: k-means++ по выборке пикселей, потом метка каждому пикселю (-1 = прозрачный), потом слияние близких цветов */
  function quantize(d, w, h, K, seed, T, minShare) {
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
    let raw = 0;
    for (let c = 0; c < K; c++) if (counts[c]) raw++;
    if (T > 0) mergeClose(C, labels, counts, K, w, h, T, minShare);
    const order = [];
    for (let c = 0; c < K; c++) if (counts[c]) order.push(c);
    order.sort((a, b) => counts[b] - counts[a]);
    const rank = new Int16Array(K).fill(-1);
    order.forEach((c, i) => { rank[c] = i; });
    return { C: C, labels: labels, order: order, rank: rank, raw: raw };
  }

  /* ---------- словарь символов: шаблоны из JSON, сравнение битовых масок 12×12 (IoU) ---------- */
  const G = 12, WORDS = 5; // 144 бита = 5 слов по 32
  const pc = v => { v = v - ((v >>> 1) & 0x55555555); v = (v & 0x33333333) + ((v >>> 2) & 0x33333333); return Math.imul((v + (v >>> 4)) & 0x0F0F0F0F, 0x01010101) >>> 24; };
  function bitsOf(test, x0, y0, bw, bh) {
    const bits = new Uint32Array(WORDS);
    for (let gy = 0; gy < G; gy++) {
      const ya = y0 + Math.floor(gy * bh / G), yb = Math.max(ya + 1, y0 + Math.floor((gy + 1) * bh / G));
      for (let gx = 0; gx < G; gx++) {
        const xa = x0 + Math.floor(gx * bw / G), xb = Math.max(xa + 1, x0 + Math.floor((gx + 1) * bw / G));
        let s = 0, c = 0;
        for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) { c++; if (test(x, y)) s++; }
        if (s * 2 >= c) { const k = gy * G + gx; bits[k >> 5] |= (1 << (k & 31)); }
      }
    }
    return bits;
  }
  const sameBits = (a, b) => { for (let k = 0; k < WORDS; k++) if (a[k] !== b[k]) return false; return true; };

  function buildGlyphIndex(j) {
    const S = 48, W = S * 2, cv = document.createElement('canvas');
    cv.width = W; cv.height = W;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const fonts = j.fonts && j.fonts.length ? j.fonts : [{ family: 'sans-serif', style: '400' }];
    const render = (ch, f) => {
      ctx.clearRect(0, 0, W, W); ctx.font = f.style + ' ' + S + 'px ' + f.family; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#000';
      ctx.fillText(ch, S / 2, S * 1.3);
      const dat = ctx.getImageData(0, 0, W, W).data;
      let x0 = W, y0 = W, x1 = -1, y1 = -1;
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (dat[(y * W + x) * 4 + 3] > 127) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) return null;
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      return { b: bitsOf((x, y) => dat[(y * W + x) * 4 + 3] > 127, x0, y0, bw, bh), a: bw / bh };
    };
    const notdef = fonts.map(f => render('\u{10FFFF}', f));
    const t = [], cats = j.categories || {};
    for (const cname of Object.keys(cats)) {
      const cat = cats[cname];
      for (const ch of Array.from(cat.chars || '')) {
        fonts.forEach((f, fi) => {
          const r = render(ch, f);
          if (!r) return;
          if (notdef[fi] && sameBits(r.b, notdef[fi].b)) return; // шрифт не умеет этот символ — пропускаем «квадратик»
          t.push({ ch: ch, cat: cname, a: r.a, b: r.b, deg: cat.cornerDeg || 0 });
        });
      }
    }
    return { t: t, profile: j.profile || {}, limits: j.limits || {} };
  }
  let GLYPH_PROMISE = null;
  function loadGlyphs(url) {
    if (!GLYPH_PROMISE) {
      const u = url || (SRC ? new URL('../data/glyphs.json', SRC).href : 'data/glyphs.json');
      GLYPH_PROMISE = fetch(u).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(buildGlyphIndex).catch(e => { console.warn('VPE: словарь символов не загружен:', e); return null; });
    }
    return GLYPH_PROMISE;
  }

  /* связные компоненты бинарной маски (4-связность) */
  function components(mask, w, h, lab, stack) {
    lab.fill(0);
    const comps = []; let id = 0;
    for (let s = 0; s < mask.length; s++) {
      if (!mask[s] || lab[s]) continue;
      id++;
      let sp = 0, x0 = w, y0 = h, x1 = -1, y1 = -1, area = 0;
      stack[sp++] = s; lab[s] = id;
      while (sp) {
        const p = stack[--sp], x = p % w, y = (p - x) / w;
        area++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x > 0 && mask[p - 1] && !lab[p - 1]) { lab[p - 1] = id; stack[sp++] = p - 1; }
        if (x < w - 1 && mask[p + 1] && !lab[p + 1]) { lab[p + 1] = id; stack[sp++] = p + 1; }
        if (y > 0 && mask[p - w] && !lab[p - w]) { lab[p - w] = id; stack[sp++] = p - w; }
        if (y < h - 1 && mask[p + w] && !lab[p + w]) { lab[p + w] = id; stack[sp++] = p + w; }
      }
      comps.push({ id: id, x0: x0, y0: y0, x1: x1, y1: y1, area: area });
    }
    return comps;
  }
  function bestMatch(idx, bits, aspect) {
    let best = 0, bt = null;
    for (let i = 0; i < idx.t.length; i++) {
      const t = idx.t[i];
      if (aspect / t.a > 1.8 || t.a / aspect > 1.8) continue;
      let inter = 0, uni = 0;
      for (let k = 0; k < WORDS; k++) { inter += pc(bits[k] & t.b[k]); uni += pc(bits[k] | t.b[k]); }
      const s = uni ? inter / uni : 0;
      if (s > best) { best = s; bt = t; }
    }
    return { score: best, t: bt };
  }
  /* отмечает в gmap области вокруг компонент, похожих на символы из словаря; возвращает число найденных.
     inv=true: ищем символы-«дырки» (тёмный текст на светлой фигуре) — вход уже инвертирован, gmap не очищается,
     компоненты, касающиеся края картинки (это фон), пропускаются. */
  function findGlyphs(mask, w, h, S, inv) {
    if (!inv) S.gmap.fill(0);
    const comps = components(mask, w, h, S.lab, S.stack), lim = S.idx.limits, mn = lim.minSize || 4, mx = Math.min(lim.maxSize || 160, Math.max(w, h));
    const cand = comps.filter(c => {
      const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1, m = Math.max(bw, bh);
      if (inv && (c.x0 === 0 || c.y0 === 0 || c.x1 === w - 1 || c.y1 === h - 1)) return false;
      return m >= mn && m <= mx && (bw < w || bh < h);
    });
    if (!cand.length || cand.length > 8000) return 0; // фото/шум: тысячи мелких пятен — не текст
    const minScore = S.idx.profile.minScore || 0.62;
    let hit = 0;
    for (const c of cand) {
      const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1, id = c.id, lab = S.lab;
      const m = bestMatch(S.idx, bitsOf((x, y) => lab[y * w + x] === id, c.x0, c.y0, bw, bh), bw / bh);
      if (!m.t || m.score < minScore) continue;
      hit++;
      const pad = 2 + Math.round(0.15 * Math.max(bw, bh));
      for (let y = Math.max(0, c.y0 - pad); y <= Math.min(h - 1, c.y1 + pad); y++) for (let x = Math.max(0, c.x0 - pad); x <= Math.min(w - 1, c.x1 + pad); x++) S.gmap[y * w + x] = 1;
    }
    return hit;
  }

  /* ---------- контуры ---------- */
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

  /* --- углы: внутренний угол в точке по соседям на расстоянии arc вдоль контура --- */
  function cumLen(L, n) {
    const cum = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; cum[i + 1] = cum[i] + Math.hypot(L[2 * j] - L[2 * i], L[2 * j + 1] - L[2 * i + 1]); }
    return cum;
  }
  function anglesAt(L, n, cum, arc) {
    const per = cum[n], A = new Float32Array(n).fill(180);
    const C = k => { const q = Math.floor(k / n); return cum[k - q * n] + q * per; };
    let f = 0, b = -n;
    for (let i = 0; i < n; i++) {
      if (f < i) f = i;
      while (C(f) - cum[i] < arc) f++;
      while (C(b + 1) <= cum[i] - arc) b++;
      const pf = ((f % n) + n) % n, pb = ((b % n) + n) % n;
      const ux = L[2 * pb] - L[2 * i], uy = L[2 * pb + 1] - L[2 * i + 1], vx = L[2 * pf] - L[2 * i], vy = L[2 * pf + 1] - L[2 * i + 1];
      const l = Math.hypot(ux, uy) * Math.hypot(vx, vy);
      A[i] = l ? Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / l))) * 57.29578 : 180;
    }
    return A;
  }
  function fitLine(p) {
    const m = p.length / 2; let mx = 0, my = 0;
    for (let i = 0; i < m; i++) { mx += p[2 * i]; my += p[2 * i + 1]; }
    mx /= m; my /= m;
    let sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < m; i++) { const dx = p[2 * i] - mx, dy = p[2 * i + 1] - my; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
    const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    return [mx, my, Math.cos(th), Math.sin(th)];
  }
  /* Ищет углы (< deg). Позицию вершины восстанавливаем как пересечение двух прямых, подогнанных по участкам контура по обе стороны
     от угла (идея из Potrace); смещение ограничено arc * 1.1, чтобы на плавных буквах не появлялись острые «шипы».
     Закруглённые точки рядом с вершиной выкидываем. */
  function findCorners(L, deg, arc) {
    const n = L.length / 2, cor = new Uint8Array(n);
    if (n < 8) return { L: L, cor: cor };
    const cum = cumLen(L, n);
    if (cum[n] < 6 * arc) return { L: L, cor: cor };
    const A1 = anglesAt(L, n, cum, arc), A2 = anglesAt(L, n, cum, arc * 2.2), isC = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (A1[i] < deg && A2[i] < deg + 25 && A2[i] > A1[i] - 18) isC[i] = 1; // на кривой угол растёт с большей дугой, на настоящем углу — нет
    for (let i = 0; i < n; i++) {
      if (!isC[i]) continue;
      let ok = true;
      for (let dir = -1; dir <= 1 && ok; dir += 2) {
        let j = i, dist = 0;
        for (let s = 0; s < n; s++) {
          const k = ((j + dir) % n + n) % n;
          dist += Math.hypot(L[2 * k] - L[2 * j], L[2 * k + 1] - L[2 * j + 1]); j = k;
          if (dist > arc * 1.5) break;
          if (isC[j] && (A1[j] < A1[i] || (A1[j] === A1[i] && dir < 0))) { ok = false; break; }
        }
      }
      if (ok) cor[i] = 1;
    }
    const side = (i, dir) => {
      const pts = []; let j = i, dist = 0;
      for (let s = 0; s < n; s++) {
        const k = ((j + dir) % n + n) % n;
        dist += Math.hypot(L[2 * k] - L[2 * j], L[2 * k + 1] - L[2 * j + 1]); j = k;
        if (cor[j] || dist > arc * 3.5) break;
        if (dist >= arc * 0.9) pts.push(L[2 * j], L[2 * j + 1]);
      }
      return pts;
    };
    const drop = new Uint8Array(n), NL = L.slice();
    for (let i = 0; i < n; i++) {
      if (!cor[i]) continue;
      const pa = side(i, -1), pb = side(i, 1);
      if (pa.length < 4 || pb.length < 4) continue;
      const l1 = fitLine(pa), l2 = fitLine(pb), cr = l1[2] * l2[3] - l1[3] * l2[2];
      if (Math.abs(cr) < 0.2) continue;
      const t = ((l2[0] - l1[0]) * l2[3] - (l2[1] - l1[1]) * l2[2]) / cr, px = l1[0] + t * l1[2], py = l1[1] + t * l1[3];
      if (Math.hypot(px - L[2 * i], py - L[2 * i + 1]) > arc * 1.1) continue;
      NL[2 * i] = px; NL[2 * i + 1] = py;
      for (let dir = -1; dir <= 1; dir += 2) {
        let j = i, dist = 0;
        for (let s = 0; s < n; s++) {
          const k = ((j + dir) % n + n) % n;
          dist += Math.hypot(L[2 * k] - L[2 * j], L[2 * k + 1] - L[2 * j + 1]); j = k;
          if (cor[j] || dist > arc * 0.9) break;
          drop[j] = 1;
        }
      }
    }
    const oL = [], oC = [];
    for (let i = 0; i < n; i++) if (!drop[i]) { oL.push(NL[2 * i], NL[2 * i + 1]); oC.push(cor[i]); }
    if (oC.length < 4) return { L: L, cor: cor };
    return { L: oL, cor: Uint8Array.from(oC) };
  }
  /* сглаживание, углы не трогаем */
  function smooth1(L, cor) {
    const n = L.length / 2, o = new Array(L.length);
    for (let i = 0; i < n; i++) {
      if (cor && cor[i]) { o[2 * i] = L[2 * i]; o[2 * i + 1] = L[2 * i + 1]; continue; }
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
        const px = L[2 * (k % n)], py = L[2 * (k % n) + 1];
        let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const qx = ax + t * dx - px, qy = ay + t * dy - py, e = qx * qx + qy * qy;
        if (e > md) { md = e; mk = k; }
      }
      if (md > eps * eps) { keep[mk % n] = 1; st.push(i, mk, mk, j); }
    }
  }
  /* Дуглас–Пойкер для замкнутого контура: углы — обязательные опорные точки, между ними упрощаем */
  function simplify(L, cor, eps) {
    const n = L.length / 2;
    if (n < 5) return { L: L, cor: cor };
    const keep = new Uint8Array(n); let anchors = [];
    for (let i = 0; i < n; i++) if (cor[i]) { keep[i] = 1; anchors.push(i); }
    if (anchors.length < 2) {
      const a0 = anchors.length ? anchors[0] : 0;
      let far = a0, md = -1;
      for (let i = 0; i < n; i++) { const dx = L[2 * i] - L[2 * a0], dy = L[2 * i + 1] - L[2 * a0 + 1], e = dx * dx + dy * dy; if (e > md) { md = e; far = i; } }
      keep[a0] = 1; keep[far] = 1;
      anchors = [a0, far].sort((x, y) => x - y);
    }
    for (let k = 0; k < anchors.length; k++) mark(L, n, anchors[k], k + 1 < anchors.length ? anchors[k + 1] : anchors[0] + n, eps, keep);
    const o = [], oc = [];
    for (let i = 0; i < n; i++) if (keep[i]) { o.push(L[2 * i], L[2 * i + 1]); oc.push(cor[i]); }
    return { L: o, cor: Uint8Array.from(oc) };
  }
  /* кривые Безье через точки (катмулл–ром); в углах (помеченных или острее deg−10°) касательная нулевая — углы остаются острыми */
  function toPath(L, cor, deg) {
    const n = L.length / 2;
    if (n < 3) return '';
    const X = i => L[2 * ((i + n) % n)], Y = i => L[2 * ((i + n) % n) + 1];
    const cosT = Math.cos((180 - (deg - 10)) * Math.PI / 180), T = new Array(n);
    for (let i = 0; i < n; i++) {
      if (cor[i]) { T[i] = null; continue; }
      const ux = X(i) - X(i - 1), uy = Y(i) - Y(i - 1), vx = X(i + 1) - X(i), vy = Y(i + 1) - Y(i);
      const cos = (ux * vx + uy * vy) / ((Math.hypot(ux, uy) * Math.hypot(vx, vy)) || 1);
      if (cos < cosT) { T[i] = null; continue; }
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

  /* основной конвейер. im: ImageData;
     o: {colors, sigma, eps, speck, passes, denoise, scale,
         corner (градусы, по умолчанию 120), deltaE (порог слияния цветов, по умолчанию 7), minShare,
         kuwahara (радиус по цвету; по умолчанию 0, с denoise 2; всегда ограничен размером картинки),
         soft (0..1, мягкость переходов; по умолчанию 0 — включается только явно), softBlur (false — без SVG-блюра),
         adaptive (false — без подстройки по резкости), glyphs (false — без словаря символов), glyphUrl} */
  async function run(im, o, say) {
    say = say || function () {};
    o = o || {};
    const w = im.width, h = im.height, n = w * h, big = Math.max(w, h);
    const maxR = big <= 200 ? 1 : big <= 500 ? 2 : 3; // максимальный радиус Кувахары по размеру картинки
    let sigma = o.sigma || 0.8, eps = o.eps, passes = o.passes || 0, denoise = o.denoise, T = o.deltaE != null ? o.deltaE : 7;
    const deg = o.corner || 120, sp0 = o.speck || 0;

    say('Оцениваю резкость…'); await tick();
    const sh = sharpness(im), level = sh.level;
    let kr = Math.min(o.kuwahara != null ? o.kuwahara : (denoise ? 2 : 0), maxR);
    let soft = o.soft; // только явная опция, автоматически не включается
    if (o.adaptive !== false) {
      if (level === 'blurry') { sigma = Math.max(sigma, 1.0); T *= 1.25; passes = Math.max(passes, 1); }
      else if (level === 'sharp') { sigma = Math.min(sigma, 0.8); T *= 0.85; }
    }
    soft = Math.max(0, Math.min(1, soft || 0));

    let d = im.data;
    if (kr > 0) {
      say('Фильтр Кувахары (r=' + kr + ')…'); await tick();
      d = new Uint8ClampedArray(im.data);
      kuwahara(im.data, w, h, 4, 3, kr, d);
    }
    say('Строю палитру…'); await tick();
    const Q = quantize(d, w, h, o.colors, 12345, T, o.minShare != null ? o.minShare : 0.0008);
    if (!Q) throw new Error('картинка полностью прозрачная');
    const K = Q.order.length;

    /* адаптивный speck: мягкие коэффициенты (K>15: до ×2.6 при 64 слоях; blurry ×1.5; soft ×1.25; потолок ×4)
       и общий потолок по площади (0.04% кадра), чтобы на маленьких картинках не вырезать детали.
       К контурам распознанного текста применяется только базовый speck. */
    let sf = 1;
    if (K > 15) sf *= 1 + (K - 15) / 30;
    if (level === 'blurry') sf *= 1.5; else if (level === 'soft') sf *= 1.25;
    sf = Math.min(sf, 4);
    const speckEff = Math.min(sp0 * sf, Math.max(sp0, n * 0.0004));

    let GS = null, gp = null;
    if (o.glyphs !== false) {
      say('Загружаю словарь символов…'); await tick();
      const idx = await loadGlyphs(o.glyphUrl);
      if (idx && idx.t.length) {
        const pr = idx.profile;
        GS = { idx: idx, lab: new Int32Array(n), stack: new Int32Array(n), gmap: new Uint8Array(n) };
        gp = { eps: eps * (pr.epsScale || 0.55), passes: pr.passes || 0, deg: pr.cornerDeg || 135, arc: pr.arc || 1.2 };
      }
    }
    const np = { eps: eps, passes: passes, deg: deg, arc: 1.6 };
    const rSoft = Math.max(1, Math.min(maxR, Math.round(sigma * 2)));

    const mask = new Float32Array(n), Fn = new Float32Array(n), tmp = new Float32Array(n), kt = new Float32Array(n), Fg = GS ? new Float32Array(n) : null;
    const Wp = w + 4, Hp = h + 4, P = new Float32Array(Wp * Hp);
    let shapes = '', loopsN = 0, nodes = 0, glyphHits = 0, softUsed = false, dropped = 0;
    const opa = r2(1 - 0.25 * soft), blurSd = r2(0.4 + 0.8 * soft);
    for (let ri = 0; ri < K; ri++) {
      say('Слой ' + (ri + 1) + ' из ' + K + '…'); await tick();
      const col = hex([Q.C[3 * Q.order[ri]], Q.C[3 * Q.order[ri] + 1], Q.C[3 * Q.order[ri] + 2]]);
      /* маска слоя: этот цвет и всё, что рисуется поверх — стыки перекрываются, щелей нет */
      let full = true;
      for (let i = 0; i < n; i++) { const l = Q.labels[i], m = (l >= 0 && Q.rank[l] >= ri) ? 1 : 0; mask[i] = m; if (!m) full = false; }
      if (full) { shapes += '<rect width="' + w + '" height="' + h + '" fill="' + col + '"/>'; loopsN++; continue; }
      /* поле для контура: Кувахара по маске + покрытие 3×3 для субпикселя. Фон — r=1; мягкие слои (только при soft>0) — rSoft. */
      const softLayer = soft > 0 && ri > 0;
      kuwahara(mask, w, h, 1, 1, softLayer ? rSoft : 1, kt);
      box3(kt, w, h, tmp, Fn);
      let hasG = false;
      if (GS) {
        let hit = findGlyphs(mask, w, h, GS, false);
        for (let i = 0; i < n; i++) kt[i] = mask[i] ? 0 : 1; // инверсия: текст-«дырка» в светлой фигуре
        hit += findGlyphs(kt, w, h, GS, true);
        if (hit) { hasG = true; glyphHits += hit; box3(mask, w, h, tmp, Fg); }
      }
      P.fill(0);
      for (let y = -1; y <= h; y++) {
        const yy = y < 0 ? 0 : y >= h ? h - 1 : y;
        for (let x = -1; x <= w; x++) {
          const xx = x < 0 ? 0 : x >= w ? w - 1 : x, p = yy * w + xx;
          P[(y + 2) * Wp + x + 2] = (hasG && GS.gmap[p]) ? Fg[p] : Fn[p];
        }
      }
      const loops = marching(P, Wp, Hp);
      let dn = '', dg = '';
      for (let li = 0; li < loops.length; li++) {
        let L = loops[li];
        /* профиль текста — только если больше 60% вершин контура лежат в gmap */
        let isG = false;
        if (hasG) {
          const m = L.length / 2; let inG = 0;
          for (let i = 0; i < m; i++) {
            const px = Math.max(0, Math.min(w - 1, Math.floor(L[2 * i]))), py = Math.max(0, Math.min(h - 1, Math.floor(L[2 * i + 1])));
            if (GS.gmap[py * w + px]) inG++;
          }
          isG = inG > 0.6 * m;
        }
        if (area(L) < (isG ? sp0 : speckEff)) { dropped++; continue; }
        const prm = isG ? gp : np;
        const C = findCorners(L, prm.deg, prm.arc);
        L = C.L; const cor = C.cor;
        for (let p = 0; p < prm.passes; p++) L = smooth1(L, cor);
        const S = simplify(L, cor, prm.eps);
        if (S.L.length < 6) continue;
        const ps = toPath(S.L, S.cor, prm.deg);
        if (isG) dg += ps; else dn += ps;
        loopsN++; nodes += S.L.length / 2;
      }
      if (dn) {
        if (softLayer) {
          softUsed = true;
          const pth = '<path fill="' + col + '" fill-opacity="' + opa + '" fill-rule="evenodd" d="' + dn + '"/>';
          shapes += o.softBlur === false ? pth : '<g filter="url(#vpe-soft)">' + pth + '</g>';
        } else shapes += '<path fill="' + col + '" fill-rule="evenodd" d="' + dn + '"/>';
      }
      if (dg) shapes += '<path fill="' + col + '" fill-rule="evenodd" d="' + dg + '"/>';
    }
    /* область фильтра — всё изображение с запасом, чтобы блюр не обрезался и не давал полос на краях */
    const defs = softUsed && o.softBlur !== false ? '<defs><filter id="vpe-soft" filterUnits="userSpaceOnUse" x="-4" y="-4" width="' + (w + 8) + '" height="' + (h + 8) + '" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="' + blurSd + '" edgeMode="duplicate"/></filter></defs>' : '';
    const W = Math.round(w * o.scale), H = Math.round(h * o.scale);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + W + '" height="' + H + '" shape-rendering="geometricPrecision">' + defs + shapes + '</svg>';
    return { svg: svg, w: w, h: h, W: W, H: H, stats: { layers: K, rawColors: Q.raw, paths: loopsN, nodes: nodes, bytes: svg.length, glyphs: glyphHits, sharpness: { variance: r2(sh.variance), level: level }, kuwahara: kr, soft: soft, speck: r2(speckEff), droppedLoops: dropped } };
  }

  return { version: VERSION, run: run, sharpness: sharpness, loadGlyphs: loadGlyphs };
})();
