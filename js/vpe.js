/* VPE-α (Vector Pixel Enhancement alpha): самописный апскейлер. Читает пиксели и перерисовывает картинку в SVG.
   Конвейер (v0.8, «физический» движок сглаживания + цветовая проверка в Lab):
   -1) мелкие картинки предварительно увеличиваются бикубикой (Митчелл) — иначе фильтры радиусом в 1 px стирают детали
   0) быстрая оценка резкости (дисперсия Лапласиана)
   1) анизотропная диффузия Перона–Малика (c = exp(−(|∇I|/K)²)): цвет растекается внутри однородных областей и тормозит на краях
      → k-means++ в CIE Lab (расстояние ΔL² + 1.4·(Δa²+Δb²): цветность важнее яркости, оттенки в тенях не смешиваются; до 512 цветов)
      → слияние близких смежных цветов: ΔE в Lab + проверка насыщенности (chroma) и оттенка (hue) — тёмно-коричневое не сливается с тёмно-синим
      → ограничение числа слоёв (до 256).
      Фильтр Кувахары — только по явной опции kuwahara.
   2) маска «этот цвет и всё, что поверх» → поле; вместо гауссова размытия — поверхностное натяжение (Mean Curvature Flow):
      граница двигается со скоростью, равной кривизне, пиксельные «лесенки» выпрямляются, а кривизна ограничена — углы не съедаются
      · фон и распознанный текст — резкие; мягкие переходы — только по явной опции soft
      · текст ищется и как «пятно» слоя, и как «дырка» в слое (тёмный текст на светлой фигуре)
   3) marching squares → углы (Potrace-подход) → MCF контура (точка тянется к среднему соседей, углы закреплены, шаги Таубина без усадки)
      → Дуглас–Пекер → кривые Безье
   4) «растирание» границ между слоями: каждый слой (кроме фона и текста) слегка размывается feGaussianBlur в пределах своего
      прямоугольника; слои на плавных градиентах (полосы квантизации) — сильнее
   5) адаптивный speck (мягкие коэффициенты, потолок по площади картинки)
   6) словарь символов (data/glyphs.json)
   Всё в браузере, без внешних библиотек. */
window.VPE = (function () {
  'use strict';
  const VERSION = 'VPE-α 0.8';
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
  /* совместимость двух Lab-цветов для слияния: у заметно цветных пар насыщенность (chroma) и оттенок (hue) должны совпадать.
     Иначе тёмно-коричневое (дерево) сливается с тёмно-синим — в Lab при малой яркости ΔE между ними мала. */
  function compatible(p, q, T) {
    const cp = Math.hypot(p[1], p[2]), cq = Math.hypot(q[1], q[2]);
    if (Math.max(cp, cq) < 10) return true; // оба почти нейтральные — решает ΔE
    if (Math.abs(cp - cq) > Math.max(10, T * 1.6)) return false; // насыщенность сильно отличается
    if (Math.min(cp, cq) < 6) return true;
    let dh = Math.abs(Math.atan2(p[2], p[1]) - Math.atan2(q[2], q[1])) * 57.29578;
    if (dh > 180) dh = 360 - dh;
    return dh < 40; // разница оттенка не больше 40°
  }

  /* ---------- 1. фильтр Кувахары (теперь только по явной опции kuwahara) ----------
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


  /* ---------- предварительное увеличение (бикубика Митчелла–Нетравали, B=C=1/3, прозрачность — через premultiplied) ----------
     Без него все фильтры работают «в пикселях исходника»: на картинке 16×16 или 140×140 радиус 1 px — это десятки процентов детали. */
  function mitchell(x) {
    const B = 1 / 3, C = 1 / 3; x = Math.abs(x);
    if (x < 1) return ((12 - 9 * B - 6 * C) * x * x * x + (-18 + 12 * B + 6 * C) * x * x + (6 - 2 * B)) / 6;
    if (x < 2) return ((-B - 6 * C) * x * x * x + (6 * B + 30 * C) * x * x + (-12 * B - 48 * C) * x + (8 * B + 24 * C)) / 6;
    return 0;
  }
  function upscale(src, w, h, f) {
    const W = w * f, H = h * f, tmp = new Float32Array(W * h * 4), out = new Uint8ClampedArray(W * H * 4);
    const pre = new Float32Array(w * h * 4);
    for (let i = 0; i < w * h; i++) { const a = src[i * 4 + 3] / 255; pre[i * 4] = src[i * 4] * a; pre[i * 4 + 1] = src[i * 4 + 1] * a; pre[i * 4 + 2] = src[i * 4 + 2] * a; pre[i * 4 + 3] = src[i * 4 + 3]; }
    const taps = (xo, n) => { // индексы и веса 4 соседей для выходной координаты xo
      const sx = (xo + 0.5) / f - 0.5, x0 = Math.floor(sx), idx = [], wt = []; let sum = 0;
      for (let k = -1; k <= 2; k++) { const wv = mitchell(sx - (x0 + k)); idx.push(Math.max(0, Math.min(n - 1, x0 + k))); wt.push(wv); sum += wv; }
      for (let k = 0; k < 4; k++) wt[k] /= sum;
      return { idx: idx, wt: wt };
    };
    const tx = []; for (let x = 0; x < W; x++) tx.push(taps(x, w));
    for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) {
      const t = tx[x], o = (y * W + x) * 4;
      for (let c = 0; c < 4; c++) { let v = 0; for (let k = 0; k < 4; k++) v += pre[(y * w + t.idx[k]) * 4 + c] * t.wt[k]; tmp[o + c] = v; }
    }
    for (let y = 0; y < H; y++) {
      const t = taps(y, h);
      for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4, v = [0, 0, 0, 0];
        for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) v[c] += tmp[(t.idx[k] * W + x) * 4 + c] * t.wt[k];
        const a = Math.max(0, Math.min(255, v[3]));
        if (a > 0.5) { const q = 255 / a; out[o] = v[0] * q; out[o + 1] = v[1] * q; out[o + 2] = v[2] * q; }
        out[o + 3] = a;
      }
    }
    return out;
  }
  /* гауссово размытие маски (σ в пикселях рабочей сетки): несколько проходов 3-точечным ядром [¼ ½ ¼] (σ² = ½ за проход).
     В отличие от Кувахары+box3 оно не стирает линии толщиной в 1–2 px и не «колеблет» ступеньки.
     Теперь служит только лёгкой предпосылкой для MCF (и запасным путём при mcf:false). */
  function blurField(src, w, h, tmp, out, sigma) {
    const passes = Math.max(1, Math.round(sigma * sigma / 0.5));
    let a = src;
    for (let p = 0; p < passes; p++) {
      for (let y = 0; y < h; y++) {
        const o = y * w;
        for (let x = 0; x < w; x++) tmp[o + x] = 0.25 * a[o + (x > 0 ? x - 1 : 0)] + 0.5 * a[o + x] + 0.25 * a[o + (x < w - 1 ? x + 1 : x)];
      }
      for (let y = 0; y < h; y++) {
        const ya = (y > 0 ? y - 1 : 0) * w, yb = y * w, yc = (y < h - 1 ? y + 1 : y) * w;
        for (let x = 0; x < w; x++) out[yb + x] = 0.25 * tmp[ya + x] + 0.5 * tmp[yb + x] + 0.25 * tmp[yc + x];
      }
      a = out;
    }
  }

  /* ---------- ФИЗИКА СГЛАЖИВАНИЯ ----------
     1) Перона–Малика: ∂I/∂t = div( c(|∇I|)·∇I ), c = exp(−(|∇I|/K)²). Цвет «растекается» как тепло внутри однородных областей
        и тормозит на перепадах, поэтому края остаются чёткими (в отличие от гауссова размытия, которое мылит всё одинаково).
        Градиент — по всем трём каналам сразу (среднеквадратичная разница цветов), поэтому тормозит и на перепадах цвета, а не только яркости.
     2) Поверхностное натяжение (Mean Curvature Flow): уровень 0.5 поля маски двигается со скоростью, равной кривизне границы
        (∂u/∂t = |∇u|·div(∇u/|∇u|)) — «лесенки» выпрямляются как мыльная плёнка. Кривизна ограничена kmax, так что острые углы не съедаются;
        дальше findCorners всё равно восстанавливает вершину как пересечение двух прямых.
        Для готового контура — дискретный аналог: точка тянется к среднему соседей (Лапласиан), углы (cor) закреплены, а чередование
        шагов λ>0 / μ<0 (Таубин) убирает усадку замкнутой кривой. */
  function pmFlux(a, b, i, j, K2, lam) {
    const i3 = i * 3, j3 = j * 3, dr = a[j3] - a[i3], dg = a[j3 + 1] - a[i3 + 1], db = a[j3 + 2] - a[i3 + 2];
    const q = (dr * dr + dg * dg + db * db) * K2 / 3;
    if (q > 12) return;
    const t = lam * Math.exp(-q);
    b[i3] += t * dr; b[i3 + 1] += t * dg; b[i3 + 2] += t * db;
    b[j3] -= t * dr; b[j3 + 1] -= t * dg; b[j3 + 2] -= t * db;
  }
  /* K автоматически: 90% от 90-го перцентиля градиента (как в оригинальной статье Перона–Малика) */
  function pmAutoK(d, w, h) {
    const H = new Uint32Array(256); let tot = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] < 128) continue;
      for (let k = 0; k < 2; k++) {
        if (k ? y >= h - 1 : x >= w - 1) continue;
        const j = k ? i + w * 4 : i + 4;
        if (d[j + 3] < 128) continue;
        const dr = d[j] - d[i], dg = d[j + 1] - d[i + 1], db = d[j + 2] - d[i + 2];
        H[Math.min(255, Math.sqrt((dr * dr + dg * dg + db * db) / 3) | 0)]++; tot++;
      }
    }
    if (!tot) return 10;
    let acc = 0, k = 0;
    for (; k < 255; k++) { acc += H[k]; if (acc >= 0.9 * tot) break; }
    return Math.max(6, Math.min(80, 0.9 * (k + 1)));
  }
  function perona(src, w, h, iters, K, lam) {
    const n = w * h, al = new Uint8Array(n);
    let a = new Float32Array(n * 3), b = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[3 * i] = src[4 * i]; a[3 * i + 1] = src[4 * i + 1]; a[3 * i + 2] = src[4 * i + 2]; al[i] = src[4 * i + 3] >= 128 ? 1 : 0; }
    const K2 = 1 / (K * K);
    for (let it = 0; it < iters; it++) {
      b.set(a);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!al[i]) continue; // прозрачное не участвует: цвет не «затекает» через границу прозрачности
        if (x < w - 1 && al[i + 1]) pmFlux(a, b, i, i + 1, K2, lam);
        if (y < h - 1 && al[i + w]) pmFlux(a, b, i, i + w, K2, lam);
      }
      const t = a; a = b; b = t;
    }
    const out = new Uint8ClampedArray(src);
    for (let i = 0; i < n; i++) if (al[i]) { out[4 * i] = a[3 * i]; out[4 * i + 1] = a[3 * i + 1]; out[4 * i + 2] = a[3 * i + 2]; }
    return out;
  }

  /* MCF поля: считаем только в узкой полосе у границы (там, где 0 < u < 1) — вдали градиент нулевой и двигать нечего.
     Буфер индексов полосы переиспользуется между слоями (на больших картинках выделять его каждый раз слишком дорого). */
  let BAND = null;
  function curvatureFlow(F, w, h, T, iters, dt, kmax) {
    let m = 0;
    if (!BAND || BAND.length < w * h) BAND = new Int32Array(w * h);
    const idx = BAND;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, v = F[i]; if (v > 0.002 && v < 0.998) idx[m++] = i; }
    if (!m || iters < 1) return;
    T.set(F);
    let a = F, b = T;
    for (let it = 0; it < iters; it++) {
      for (let k = 0; k < m; k++) {
        const i = idx[k], c = a[i], ux = (a[i + 1] - a[i - 1]) * 0.5, uy = (a[i + w] - a[i - w]) * 0.5, g2 = ux * ux + uy * uy;
        if (g2 < 1e-8) { b[i] = c; continue; }
        const uxx = a[i + 1] - 2 * c + a[i - 1], uyy = a[i + w] - 2 * c + a[i - w], uxy = (a[i + w + 1] - a[i + w - 1] - a[i - w + 1] + a[i - w - 1]) * 0.25;
        const g = Math.sqrt(g2);
        let kap = (uxx * uy * uy - 2 * uxy * ux * uy + uyy * ux * ux) / (g2 * g);
        kap = kap > kmax ? kmax : kap < -kmax ? -kmax : kap;
        b[i] = c + dt * kap * g;
      }
      const t = a; a = b; b = t;
    }
    if (a !== F) F.set(a);
  }
  function lapStep(L, cor, n, k) {
    const o = new Array(L.length);
    for (let i = 0; i < n; i++) {
      if (cor && cor[i]) { o[2 * i] = L[2 * i]; o[2 * i + 1] = L[2 * i + 1]; continue; }
      const p = (i + n - 1) % n, q = (i + 1) % n;
      o[2 * i] = L[2 * i] + k * (0.5 * (L[2 * p] + L[2 * q]) - L[2 * i]);
      o[2 * i + 1] = L[2 * i + 1] + k * (0.5 * (L[2 * p + 1] + L[2 * q + 1]) - L[2 * i + 1]);
    }
    return o;
  }
  function mcfContour(L, cor, steps) {
    const n = L.length / 2;
    if (n < 5 || steps < 1) return L;
    for (let s = 0; s < steps; s++) { L = lapStep(L, cor, n, 0.5); L = lapStep(L, cor, n, -0.53); }
    return L;
  }
  /* модуль градиента яркости в «уровнях на пиксель исходника» — отличает плавный градиент (полосы квантизации) от настоящего края */
  function gradMap(d, w, h, f) {
    const n = w * h, Y = new Float32Array(n), g = new Float32Array(n);
    for (let i = 0; i < n; i++) Y[i] = 0.299 * d[4 * i] + 0.587 * d[4 * i + 1] + 0.114 * d[4 * i + 2];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      g[i] = Math.hypot((Y[i + 1] - Y[i - 1]) * 0.5, (Y[i + w] - Y[i - w]) * 0.5) * f;
    }
    return g;
  }

  /* ---------- слияние близких смежных цветов (агломеративно, ΔE в Lab + проверка оттенка и насыщенности) ----------
     T — порог ΔE для смежных кластеров; несмежные сливаются только при ΔE < T/3; совсем мелкие кластеры
     (кольца антиалиасинга) вливаются в ближайший смежный при ΔE < 4T. Слияние по порогу — только для совместимых оттенка и насыщенности.
     maxL — предел числа слоёв: если после слияния по порогу кластеров всё ещё больше, сливаем ближайшие пары (смежным — небольшая скидка,
     несовместимым по оттенку — штраф ×2.5) до maxL. */
  function mergeClose(C, labels, counts, K, w, h, T, minShare, maxL) {
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
    let nAlive = 0;
    for (let c = 0; c < K; c++) { map[c] = c; alive[c] = cnt[c] > 0 ? 1 : 0; nAlive += alive[c]; for (let j = 0; j < 3; j++) sum[3 * c + j] = C[3 * c + j] * cnt[c]; }
    const tiny = minShare * n, cap = maxL || 1e9;
    for (;;) {
      const L = [];
      for (let c = 0; c < K; c++) if (alive[c]) L[c] = lab(sum[3 * c] / cnt[c], sum[3 * c + 1] / cnt[c], sum[3 * c + 2] / cnt[c]);
      let bi = -1, bj = -1, bd = 1e9;
      for (let i = 0; i < K; i++) {
        if (!alive[i]) continue;
        for (let j = i + 1; j < K; j++) {
          if (!alive[j]) continue;
          const e = dE(L[i], L[j]), ad = adj[i * K + j];
          const ok = (e < (ad ? T : T / 3) || (ad && (cnt[i] < tiny || cnt[j] < tiny) && e < 4 * T)) && compatible(L[i], L[j], T);
          if (ok && e < bd) { bd = e; bi = i; bj = j; }
        }
      }
      if (bi < 0 && nAlive > cap) { // порог больше ничего не сливает, а слоёв всё ещё слишком много — сливаем ближайшую пару
        let fd = 1e18;
        for (let i = 0; i < K; i++) {
          if (!alive[i]) continue;
          for (let j = i + 1; j < K; j++) {
            if (!alive[j]) continue;
            const e = dE(L[i], L[j]) * (adj[i * K + j] ? 0.7 : 1) * (compatible(L[i], L[j], T) ? 1 : 2.5);
            if (e < fd) { fd = e; bi = i; bj = j; }
          }
        }
      }
      if (bi < 0) break;
      for (let j = 0; j < 3; j++) sum[3 * bi + j] += sum[3 * bj + j];
      cnt[bi] += cnt[bj]; alive[bj] = 0; nAlive--;
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

  /* квантизация: k-means++ в Lab по выборке пикселей, потом метка каждому пикселю (-1 = прозрачный), потом слияние близких цветов.
     Расстояние: ΔL² + 1.4·(Δa² + Δb²) — цветность весит больше яркости, чтобы оттенки не смешивались в тенях.
     Ближайший центр для всех пикселей ищется через кэш по 6-битным ячейкам RGB (Lab считается один раз на ячейку). */
  const CW = 1.4;
  function quantize(d, w, h, K, seed, T, minShare, maxL) {
    const n = w * h, rnd = rng(seed), S = [], step = Math.max(1, Math.floor(n / 40000));
    for (let i = 0, k = 0; i < n; i += step + ((k++ & 1) && step > 1 ? 1 : 0)) if (d[i * 4 + 3] >= 128) S.push(i);
    if (!S.length) return null;
    const m = S.length; K = Math.max(1, Math.min(K, m));
    const SL = new Float32Array(m * 3);
    for (let s = 0; s < m; s++) { const q = S[s] * 4, l = lab(d[q], d[q + 1], d[q + 2]); SL[3 * s] = l[0]; SL[3 * s + 1] = l[1]; SL[3 * s + 2] = l[2]; }
    const C = new Float32Array(K * 3), CL = new Float32Array(K * 3), dist = new Float32Array(m).fill(1e12);
    const dl = (s, c) => { const x = SL[3 * s] - CL[3 * c], y = SL[3 * s + 1] - CL[3 * c + 1], z = SL[3 * s + 2] - CL[3 * c + 2]; return x * x + CW * (y * y + z * z); };
    const setC = (c, s) => { const q = S[s] * 4; C[3 * c] = d[q]; C[3 * c + 1] = d[q + 1]; C[3 * c + 2] = d[q + 2]; CL[3 * c] = SL[3 * s]; CL[3 * c + 1] = SL[3 * s + 1]; CL[3 * c + 2] = SL[3 * s + 2]; };
    setC(0, (rnd() * m) | 0);
    for (let c = 1; c < K; c++) {
      let tot = 0;
      for (let s = 0; s < m; s++) { const e = dl(s, c - 1); if (e < dist[s]) dist[s] = e; tot += dist[s]; }
      let t = rnd() * tot, pick = m - 1;
      for (let s = 0; s < m; s++) { t -= dist[s]; if (t <= 0) { pick = s; break; } }
      setC(c, pick);
    }
    const sum = new Float64Array(K * 3), sl = new Float64Array(K * 3), cnt = new Int32Array(K);
    for (let it = 0; it < 8; it++) {
      sum.fill(0); sl.fill(0); cnt.fill(0);
      for (let s = 0; s < m; s++) {
        const q = S[s] * 4;
        let best = 0, bd = 1e12;
        for (let c = 0; c < K; c++) { const e = dl(s, c); if (e < bd) { bd = e; best = c; } }
        sum[3 * best] += d[q]; sum[3 * best + 1] += d[q + 1]; sum[3 * best + 2] += d[q + 2];
        sl[3 * best] += SL[3 * s]; sl[3 * best + 1] += SL[3 * s + 1]; sl[3 * best + 2] += SL[3 * s + 2]; cnt[best]++;
      }
      for (let c = 0; c < K; c++) if (cnt[c]) for (let j = 0; j < 3; j++) { C[3 * c + j] = sum[3 * c + j] / cnt[c]; CL[3 * c + j] = sl[3 * c + j] / cnt[c]; }
    }
    const labels = new Int16Array(n), counts = new Int32Array(K), lut = new Int16Array(262144).fill(-1);
    for (let i = 0; i < n; i++) {
      const q = i * 4;
      if (d[q + 3] < 128) { labels[i] = -1; continue; }
      const r = d[q], g = d[q + 1], b = d[q + 2], key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
      let best = lut[key];
      if (best < 0) {
        const l = lab((r & 252) + 2, (g & 252) + 2, (b & 252) + 2);
        let bd = 1e12; best = 0;
        for (let c = 0; c < K; c++) { const x = l[0] - CL[3 * c], y = l[1] - CL[3 * c + 1], z = l[2] - CL[3 * c + 2], e = x * x + CW * (y * y + z * z); if (e < bd) { bd = e; best = c; } }
        lut[key] = best;
      }
      labels[i] = best; counts[best]++;
    }
    let raw = 0;
    for (let c = 0; c < K; c++) if (counts[c]) raw++;
    if (T > 0 || raw > (maxL || 1e9)) mergeClose(C, labels, counts, K, w, h, T, minShare, maxL);
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
    const comps = components(mask, w, h, S.lab, S.stack), lim = S.idx.limits, mn = (lim.minSize || 4) * (S.f || 1), mx = Math.min((lim.maxSize || 160) * (S.f || 1), Math.max(w, h));
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
  /* сглаживание, углы не трогаем (старый путь, используется для текста и при mcf:false) */
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
     o: {colors (до 512), maxLayers (до 256, по умолчанию 256), sigma, eps, speck, passes, denoise, scale,
         corner (градусы, по умолчанию 120), deltaE (порог слияния цветов, по умолчанию 7), minShare,
         pm (число итераций Перона–Малика; по умолчанию 3, с denoise 10; false/0 — выключить), pmK (порог K; по умолчанию авто),
         mcf (множитель силы поверхностного натяжения; по умолчанию 1; false — вернуть гауссово размытие), mcfKmax (предел кривизны, по умолчанию 0.35),
         smudge (0..1, «растирание» границ между слоями; по умолчанию 0.4; 0 — выключить),
         gradBlur (false — без усиленного смешивания слоёв на плавных градиентах), gradLow (порог градиента, уровней на px исходника; по умолчанию 14),
         layerBudget (предел «пиксели × слои» для защиты памяти; по умолчанию 9e8 — при 4096×4096 это ~53 слоя, при 2048×2048 ~214),
         kuwahara (радиус по цвету; по умолчанию 0 — теперь вместо него Перона–Малика; всегда ограничен размером картинки),
         prescale (во сколько раз увеличить вход перед трассировкой; по умолчанию авто — до ~512 px),
         soft (0..1, мягкость переходов; по умолчанию 0 — включается только явно), softBlur (false — без SVG-блюра),
         adaptive (false — без подстройки по резкости), glyphs (false — без словаря символов; для картинок >4 млн px отключён сам), glyphUrl}
     sigma, eps и speck задаются в пикселях исходной картинки. */
  async function run(im, o, say) {
    say = say || function () {};
    o = o || {};
    const w0 = im.width, h0 = im.height, big = Math.max(w0, h0);
    const f = Math.max(1, Math.min(8, o.prescale != null ? Math.round(o.prescale) : Math.min(Math.round(512 / big), Math.floor(Math.sqrt(450000 / (w0 * h0)))))); // во сколько раз увеличиваем вход
    const w = w0 * f, h = h0 * f, n = w * h;
    const maxR = big <= 200 ? 1 : big <= 500 ? 2 : 3; // максимальный радиус Кувахары по размеру картинки
    let sigma = o.sigma || 0.8, eps = Math.max(0.3, o.eps != null ? o.eps : 0.3) * f, passes = o.passes || 0, denoise = o.denoise, T = o.deltaE != null ? o.deltaE : 7;
    const deg = o.corner || 120, sp0 = (o.speck || 0) * f * f, scale = o.scale || 4, reqK = Math.max(1, Math.min(512, Math.round(o.colors || 24)));
    T *= Math.max(0.5, Math.min(1, Math.sqrt(24 / reqK))); // много слоёв просили — не сливаем их в 20–30 (раньше «64 цвета» давали ~25 слоёв)
    /* предел числа слоёв: просьба пользователя, но не больше, чем память выдержит (каждый слой — несколько проходов по всей картинке) */
    const maxL = Math.max(2, Math.min(o.maxLayers != null ? Math.round(o.maxLayers) : 256, 256, Math.floor((o.layerBudget || 9e8) / n)));

    say('Оцениваю резкость…'); await tick();
    const sh = sharpness(im), level = sh.level;
    let kr = Math.min(o.kuwahara != null ? o.kuwahara : 0, maxR);
    let soft = o.soft; // только явная опция, автоматически не включается
    if (o.adaptive !== false) {
      if (level === 'blurry') { sigma *= 1.25; T *= 1.25; passes = Math.max(passes, 1); }
      else if (level === 'sharp') { sigma *= 0.85; T *= 0.85; }
    }
    soft = Math.max(0, Math.min(1, soft || 0));

    let d = im.data;
    /* 1) предобработка: анизотропная диффузия Перона–Малика вместо обычного размытия */
    let pmIt = o.pm === false ? 0 : (o.pm != null ? Math.max(0, Math.round(o.pm)) : (denoise ? 10 : 3));
    const px0 = w0 * h0;
    if (pmIt > 0 && px0 > 1.5e6) pmIt = Math.max(1, Math.min(pmIt, Math.round(3e7 / px0))); // на огромных картинках итераций меньше, иначе минуты ожидания
    let pmK = 0;
    if (pmIt > 0) {
      say('Диффузия Перона–Малика (' + pmIt + ' ит.)…'); await tick();
      pmK = o.pmK || pmAutoK(d, w0, h0);
      d = perona(d, w0, h0, pmIt, pmK, 0.2);
    }
    if (kr > 0) {
      say('Фильтр Кувахары (r=' + kr + ')…'); await tick();
      const kt0 = new Uint8ClampedArray(d);
      kuwahara(d, w0, h0, 4, 3, kr, kt0);
      d = kt0;
    }
    if (f > 1) { say('Увеличиваю вход ×' + f + '…'); await tick(); d = upscale(d, w0, h0, f); }
    say('Строю палитру (' + reqK + ' цветов, Lab)…'); await tick();
    const Q = quantize(d, w, h, reqK, 12345, T, o.minShare != null ? o.minShare : 0.0008, maxL);
    if (!Q) throw new Error('картинка полностью прозрачная');
    const K = Q.order.length;
    /* карта градиента: по ней отличаем плавные градиенты (полосы квантизации) от настоящих краёв */
    const gm = o.gradBlur !== false ? gradMap(d, w, h, f) : null;
    const gradLow = o.gradLow != null ? o.gradLow : 14;

    /* адаптивный speck: мягкие коэффициенты (K>15: до ×2.6 при 64 слоях; blurry ×1.5; soft ×1.25; потолок ×4)
       и общий потолок по площади (0.04% кадра), чтобы на маленьких картинках не вырезать детали.
       К контурам распознанного текста применяется только базовый speck. */
    let sf = 1;
    if (K > 15) sf *= 1 + (K - 15) / 30;
    if (level === 'blurry') sf *= 1.5; else if (level === 'soft') sf *= 1.25;
    sf = Math.min(sf, 4);
    const speckEff = Math.min(sp0 * sf, Math.max(sp0, n * 0.0004));

    let GS = null, gp = null;
    if (o.glyphs !== false && n <= 4e6) {
      say('Загружаю словарь символов…'); await tick();
      const idx = await loadGlyphs(o.glyphUrl);
      if (idx && idx.t.length) {
        const pr = idx.profile;
        GS = { f: f, idx: idx, lab: new Int32Array(n), stack: new Int32Array(n), gmap: new Uint8Array(n) };
        gp = { eps: eps * (pr.epsScale || 0.55), passes: pr.passes || 0, deg: pr.cornerDeg || 135, arc: (pr.arc || 1.2) * f };
      }
    }
    const np = { eps: eps, passes: passes, deg: deg, arc: 1.6 * f };
    const rSoft = Math.max(1, Math.min(maxR * f, Math.round(sigma * 2 * f)));
    const fieldSigma = Math.max(0.6, Math.min(4, sigma * f)); // σ размытия маски в пикселях рабочей сетки
    /* 2) поверхностное натяжение: время потока ~ σ²/2·(шаг 0.2) → итераций ≈ 2.5σ²; для контура — шаги Таубина */
    const mcfK = typeof o.mcf === 'number' ? o.mcf : 1, mcfOn = o.mcf !== false && mcfK > 0;
    const mcfIters = mcfOn ? Math.max(2, Math.min(60, Math.round(fieldSigma * fieldSigma * 2.5 * mcfK))) : 0;
    const mcfKmax = o.mcfKmax != null ? o.mcfKmax : 0.35;
    const mcfSteps = mcfOn ? Math.max(1, Math.round((2 + f / 2) * mcfK)) : 0;
    /* 4) «растирание» границ между слоями: небольшой блюр каждого слоя (σ в пикселях рабочей сетки) */
    const smudge = Math.max(0, Math.min(1, o.smudge != null ? +o.smudge : 0.4));
    const smudgeSd = smudge > 0 ? r2(Math.max(0.25, smudge * 0.8 * (1 + 0.25 * (f - 1)))) : 0;

    const mask = new Float32Array(n), Fn = new Float32Array(n), tmp = new Float32Array(n), kt = new Float32Array(n), Fg = GS ? new Float32Array(n) : null;
    const Wp = w + 4, Hp = h + 4, P = new Float32Array(Wp * Hp);
    let shapes = '', loopsN = 0, nodes = 0, glyphHits = 0, softUsed = false, dropped = 0, gradLayers = 0, smudged = 0, layerDefs = '';
    const opa = r2(1 - 0.25 * soft), blurSd = r2(0.4 + 0.8 * soft), gradSd = r2(Math.max(0.8, 0.5 * f));
    /* фильтр с областью по прямоугольнику слоя (а не по всей картинке): иначе сотни слоёв × полный кадр — это минуты рендера */
    const layerFilter = (id, sd, bb) => {
      const mg = Math.ceil(sd * 4) + 2;
      layerDefs += '<filter id="' + id + '" filterUnits="userSpaceOnUse" x="' + r2(bb[0] - mg) + '" y="' + r2(bb[1] - mg) + '" width="' + r2(bb[2] - bb[0] + 2 * mg) + '" height="' + r2(bb[3] - bb[1] + 2 * mg) + '" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="' + sd + '"/></filter>';
    };
    for (let ri = 0; ri < K; ri++) {
      say('Слой ' + (ri + 1) + ' из ' + K + '…'); await tick();
      const col = hex([Q.C[3 * Q.order[ri]], Q.C[3 * Q.order[ri] + 1], Q.C[3 * Q.order[ri] + 2]]);
      /* маска слоя: этот цвет и всё, что рисуется поверх — стыки перекрываются, щелей нет */
      let full = true;
      for (let i = 0; i < n; i++) { const l = Q.labels[i], m = (l >= 0 && Q.rank[l] >= ri) ? 1 : 0; mask[i] = m; if (!m) full = false; }
      if (full) { shapes += '<rect width="' + w + '" height="' + h + '" fill="' + col + '"/>'; loopsN++; continue; }
      /* поле для контура: лёгкая предпосылка + поверхностное натяжение (MCF) вместо гауссова размытия.
         Мягкие слои (только при soft>0) — Кувахара rSoft. */
      const softLayer = soft > 0 && ri > 0;
      if (softLayer) { kuwahara(mask, w, h, 1, 1, rSoft, kt); box3(kt, w, h, tmp, Fn); }
      else if (mcfOn) { blurField(mask, w, h, tmp, Fn, Math.min(1, fieldSigma * 0.5)); curvatureFlow(Fn, w, h, kt, mcfIters, 0.2, mcfKmax); }
      else blurField(mask, w, h, tmp, Fn, fieldSigma);
      let hasG = false;
      if (GS) {
        let hit = findGlyphs(mask, w, h, GS, false);
        for (let i = 0; i < n; i++) kt[i] = mask[i] ? 0 : 1; // инверсия: текст-«дырка» в светлой фигуре
        hit += findGlyphs(kt, w, h, GS, true);
        if (hit) { hasG = true; glyphHits += hit; blurField(mask, w, h, tmp, Fg, 0.6); }
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
      /* первый проход: какие контуры — текст (gmap), лежит ли граница слоя в зоне плавного градиента и каков прямоугольник слоя.
         Решение принимается на весь слой сразу (а не по контурам): дырки должны остаться в одном path с родителем (evenodd). */
      const gflag = new Uint8Array(loops.length);
      let lowV = 0, totV = 0, bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
      for (let li = 0; li < loops.length; li++) {
        const L = loops[li], m = L.length / 2;
        let inG = 0, lo = 0;
        for (let i = 0; i < m; i++) {
          const px = Math.max(0, Math.min(w - 1, Math.floor(L[2 * i]))), py = Math.max(0, Math.min(h - 1, Math.floor(L[2 * i + 1])));
          if (hasG && GS.gmap[py * w + px]) inG++;
          if (gm && gm[py * w + px] < gradLow) lo++;
        }
        /* профиль текста — только если больше 60% вершин контура лежат в gmap */
        const isG = hasG && inG > 0.6 * m;
        gflag[li] = isG ? 1 : 0;
        if (!isG && area(L) >= speckEff) {
          lowV += lo; totV += m;
          for (let i = 0; i < m; i++) { const x = L[2 * i], y = L[2 * i + 1]; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
        }
      }
      /* фон (ri = 0) и текст остаются резкими; слой, чья граница почти целиком в зоне низкого градиента, смешивается сильнее */
      const gradLayer = !!gm && ri > 0 && !softLayer && totV >= 12 && lowV > 0.8 * totV;
      let dn = '', dg = '';
      for (let li = 0; li < loops.length; li++) {
        let L = loops[li];
        const isG = gflag[li] === 1;
        if (area(L) < (isG ? sp0 : speckEff)) { dropped++; continue; }
        const prm = isG ? gp : np;
        const C = findCorners(L, prm.deg, prm.arc);
        L = C.L; const cor = C.cor;
        /* контур: точки тянутся к среднему соседей (MCF), углы закреплены; текст — как раньше, без натяжения */
        if (isG || !mcfOn) { for (let p = 0; p < prm.passes; p++) L = smooth1(L, cor); }
        else L = mcfContour(L, cor, prm.passes + mcfSteps);
        const S = simplify(L, cor, prm.eps);
        if (S.L.length < 6) continue;
        const ps = toPath(S.L, S.cor, prm.deg);
        if (isG) dg += ps; else dn += ps;
        loopsN++; nodes += S.L.length / 2;
      }
      if (dn) {
        const bb = [bx0, by0, bx1, by1];
        if (softLayer) {
          softUsed = true;
          const pth = '<path fill="' + col + '" fill-opacity="' + opa + '" fill-rule="evenodd" d="' + dn + '"/>';
          shapes += o.softBlur === false ? pth : '<g filter="url(#vpe-soft)">' + pth + '</g>';
        } else if (ri > 0 && bx1 > bx0 && (gradLayer || smudgeSd > 0)) {
          const sd = gradLayer ? Math.max(gradSd, smudgeSd) : smudgeSd;
          layerFilter('vpe-l' + ri, sd, bb);
          if (gradLayer) gradLayers++; else smudged++;
          shapes += '<g filter="url(#vpe-l' + ri + ')"><path fill="' + col + '" fill-rule="evenodd" d="' + dn + '"/></g>';
        } else shapes += '<path fill="' + col + '" fill-rule="evenodd" d="' + dn + '"/>';
      }
      if (dg) shapes += '<path fill="' + col + '" fill-rule="evenodd" d="' + dg + '"/>';
    }
    /* область общего фильтра soft — всё изображение с запасом, чтобы блюр не обрезался и не давал полос на краях */
    const flt = (id, sd) => '<filter id="' + id + '" filterUnits="userSpaceOnUse" x="-4" y="-4" width="' + (w + 8) + '" height="' + (h + 8) + '" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="' + sd + '" edgeMode="duplicate"/></filter>';
    let defs = layerDefs;
    if (softUsed && o.softBlur !== false) defs += flt('vpe-soft', blurSd);
    if (defs) defs = '<defs>' + defs + '</defs>';
    const W = Math.round(w0 * scale), H = Math.round(h0 * scale);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + W + '" height="' + H + '" shape-rendering="geometricPrecision">' + defs + shapes + '</svg>';
    return { svg: svg, w: w0, h: h0, W: W, H: H, stats: { prescale: f, fieldSigma: r2(fieldSigma), layers: K, maxLayers: maxL, colors: reqK, rawColors: Q.raw, paths: loopsN, nodes: nodes, bytes: svg.length, glyphs: glyphHits, sharpness: { variance: r2(sh.variance), level: level }, kuwahara: kr, soft: soft, speck: r2(speckEff), droppedLoops: dropped, pm: { iters: pmIt, K: r2(pmK) }, mcf: { iters: mcfIters, steps: mcfSteps }, smudge: { sd: smudgeSd, layers: smudged }, gradLayers: gradLayers } };
  }

  return { version: VERSION, run: run, sharpness: sharpness, loadGlyphs: loadGlyphs };
})();
