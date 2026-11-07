/* Эффекты для SVG-обложек: чистый SMIL, без JS внутри картинки.
   Частицы рождаются строго на контуре рисунка: o.pts = [[x, y, nx, ny], ...],
   где (x, y) — точка контура, (nx, ny) — внешняя нормаль. Лимит частиц защищает слабые телефоны. */
window.FX = (function () {
  const MAX = 40;
  const TYPES = { stars: '⭐ Звёздочки', confetti: '🎉 Конфетти', sparks: '✨ Искры', bubbles: '🫧 Пузырьки', snow: '❄️ Снег' };
  const r2 = v => +v.toFixed(2);
  function rng(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function svg(o) {
    const t = o.type, P = o.pts;
    if (!t || t === 'none' || !TYPES[t] || !P || !P.length) return '';
    const n = Math.min(MAX, Math.max(0, Math.round(+o.count || 0)));
    if (!n) return '';
    const u = Math.max(o.w, o.h) / 100 * (o.scale || 1);
    const sp = Math.min(5, Math.max(0.2, +o.speed || 1));
    const cs = (o.colors && o.colors.length) ? o.colors : ['#ffffff'];
    const R = rng(o.seed || 7);
    let s = '<g>';
    if (t === 'stars') s += '<defs><path id="fxs" d="M0-1 .3-.3 1 0 .3 .3 0 1-.3 .3-1 0-.3-.3Z"/></defs>';
    for (let i = 0; i < n; i++) {
      const p = P[Math.floor(R() * P.length)], c = cs[i % cs.length];
      const d = r2((2 + R() * 2.5) / sp), k = r2((1 + R() * 1.6) * u);
      const rep = ' dur="' + d + 's" begin="-' + r2(R() * d) + 's" repeatCount="indefinite"';
      const a = Math.atan2(p[3], p[2]) + (R() - 0.5) * 0.9, nx = Math.cos(a), ny = Math.sin(a);
      let dx, dy, shape;
      if (t === 'stars') {
        dx = nx * u * 2; dy = ny * u * 2;
        shape = '<use href="#fxs" transform="scale(' + k + ')" fill="' + c + '"/>';
      } else if (t === 'sparks') {
        const L = (6 + R() * 10) * u;
        dx = nx * L; dy = ny * L;
        shape = '<circle r="' + r2(k / 2) + '" fill="' + c + '"/>';
      } else if (t === 'confetti') {
        dx = nx * u * 6; dy = (10 + R() * 8) * u;
        shape = '<rect x="' + r2(-k / 2) + '" y="' + r2(-k / 4) + '" width="' + k + '" height="' + r2(k / 2) + '" fill="' + c + '">' +
          '<animateTransform attributeName="transform" type="rotate" values="0;360"' + rep + '/></rect>';
      } else if (t === 'bubbles') {
        dx = nx * u * 4; dy = -(10 + R() * 10) * u;
        shape = '<circle r="' + k + '" fill="none" stroke="' + c + '" stroke-width="' + r2(u / 3) + '"/>';
      } else {
        dx = nx * u * 3; dy = (8 + R() * 6) * u;
        shape = '<circle r="' + r2(k / 2) + '" fill="' + c + '"/>';
      }
      const x = r2(p[0]), y = r2(p[1]);
      s += '<g opacity="0"><animateTransform attributeName="transform" type="translate" values="' + x + ' ' + y + ';' + r2(x + dx) + ' ' + r2(y + dy) + '"' + rep + '/>' +
        '<animate attributeName="opacity" values="0;1;0" keyTimes="0;0.2;1"' + rep + '/>' + shape + '</g>';
    }
    return s + '</g>';
  }
  /* Внешний контур фигуры по маске: occ(x, y) — занята ли клетка сетки w×h.
     Берутся только клетки, которые касаются «наружи» (области, доступной с края сетки),
     поэтому дырки и внутренние просветы между витками частиц не рождают.
     Возвращает [[x, y, nx, ny], ...] в клетках сетки, нормаль сглажена по окну 5×5. */
  function outline(w, h, occ, limit) {
    const W = w + 2, H = h + 2, g = new Uint8Array(W * H), out = new Uint8Array(W * H), D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (occ(x, y)) g[(y + 1) * W + x + 1] = 1;
    const st = [0]; out[0] = 1;
    while (st.length) {
      const i = st.pop(), x = i % W, y = (i / W) | 0;
      for (const d of D) {
        const nx = x + d[0], ny = y + d[1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (!g[j] && !out[j]) { out[j] = 1; st.push(j); }
      }
    }
    const pts = [];
    for (let y = 1; y <= h; y++) for (let x = 1; x <= w; x++) {
      if (!g[y * W + x]) continue;
      let ex = 0, ey = 0, edge = false;
      for (const d of D) if (out[(y + d[1]) * W + x + d[0]]) { edge = true; ex += d[0]; ey += d[1]; }
      if (!edge) continue;
      let mx = 0, my = 0;
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
        const yy = y + j, xx = x + i;
        if (yy >= 0 && yy < H && xx >= 0 && xx < W && g[yy * W + xx]) { mx += i; my += j; }
      }
      let nx = -mx, ny = -my;
      const l = Math.hypot(nx, ny);
      if (l < 0.5 || (nx * ex + ny * ey) < 0) { nx = ex; ny = ey; } else { nx /= l; ny /= l; }
      const m = Math.hypot(nx, ny) || 1;
      pts.push([x - 0.5 + Math.sign(ex) * 0.5, y - 0.5 + Math.sign(ey) * 0.5, nx / m, ny / m]);
    }
    const lim = limit || 300, step = Math.ceil(pts.length / lim);
    return step > 1 ? pts.filter((_, i) => i % step === 0) : pts;
  }
  /* Подключает блок «Эффекты» (id: fx, fxn, fxsp, fxauto, fxcol) к объекту состояния o */
  function bind(o, cb) {
    const $ = q => document.querySelector(q), sel = $('#fx');
    if (!sel) return;
    sel.innerHTML = '<option value="none">Без эффекта</option>' +
      Object.keys(TYPES).map(k => '<option value="' + k + '">' + TYPES[k] + '</option>').join('');
    sel.onchange = () => { o.type = sel.value; cb(); };
    $('#fxn').onchange = e => { o.n = Math.min(MAX, Math.max(0, parseInt(e.target.value) || 0)); e.target.value = o.n; cb(); };
    $('#fxsp').oninput = e => { o.sp = +e.target.value; cb(); };
    $('#fxauto').onchange = e => { o.auto = e.target.checked; cb(); };
    $('#fxcol').oninput = e => { o.col = e.target.value; cb(); };
  }
  return { MAX, TYPES, svg, bind, outline };
})();
