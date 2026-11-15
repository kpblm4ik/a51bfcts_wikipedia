/* Эффекты для SVG-обложек: чистый SMIL, без JS внутри картинки.
   Частицы рождаются на контуре рисунка и/или по всей его площади: o.pts = [[x, y, nx, ny], ...],
   где (x, y) — точка, (nx, ny) — внешняя нормаль (внутри предмета — «вверх»). Лимит частиц защищает слабые телефоны. */
window.FX = (function () {
  const MAX = 40;
  const TYPES = {
    stars: '⭐ Звёздочки', confetti: '🎉 Конфетти', sparks: '✨ Искры', bubbles: '🫧 Пузырьки', snow: '❄️ Снег',
    smoke: '💨 Дым', fire: '🔥 Огонь', glitch: '📺 Глитч', fog: '🌫️ Туман'
  };
  /* Естественные цвета: используются, когда включено «цвета из картинки».
     У глитча они добавляются к цветам картинки, у дыма, огня и тумана заменяют их. */
  const NAT = {
    smoke: ['#cfcfdc', '#a3a3b2', '#e8e8f2'],
    fire: ['#ff3b1f', '#ff9a1f', '#ffc23d'],
    fog: ['#dfe6f2', '#bcc7da', '#f2f5fb'],
    glitch: ['#00f0ff', '#ff2bd6']
  };
  const r2 = v => +v.toFixed(2);
  function rng(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  /* o.id — префикс id внутри картинки (нужен, когда несколько картинок стоят на одной странице) */
  function svg(o) {
    const t = o.type, P = o.pts;
    if (!t || t === 'none' || !TYPES[t] || !P || !P.length) return '';
    const n = Math.min(MAX, Math.max(0, Math.round(+o.count || 0)));
    if (!n) return '';
    const u = Math.max(o.w, o.h) / 100 * (o.scale || 1);
    const sp = Math.min(5, Math.max(0.2, +o.speed || 1));
    let cs = (o.colors && o.colors.length) ? o.colors : ['#ffffff'];
    if (o.auto && NAT[t]) cs = t === 'glitch' ? cs.concat(NAT[t]) : NAT[t];
    const id = o.id || 'fx', soft = t === 'smoke' || t === 'fire' || t === 'fog';
    const R = rng(o.seed || 7);
    let defs = '';
    if (t === 'stars') defs += '<path id="' + id + 's" d="M0-1 .3-.3 1 0 .3 .3 0 1-.3 .3-1 0-.3-.3Z"/>';
    if (soft) cs.forEach((c, j) => {   // мягкое пятно: к краю становится прозрачным
      defs += '<radialGradient id="' + id + 'g' + j + '"><stop offset="0" stop-color="' + c + '" stop-opacity=".9"/>' +
        '<stop offset="1" stop-color="' + c + '" stop-opacity="0"/></radialGradient>';
    });
    let s = '<g pointer-events="none">' + (defs ? '<defs>' + defs + '</defs>' : '');
    for (let i = 0; i < n; i++) {
      const p = P[Math.floor(R() * P.length)], ci = i % cs.length, c = cs[ci];
      const dm = t === 'fog' ? 2.2 : t === 'smoke' ? 1.5 : 1;
      const d = t === 'glitch' ? r2((0.5 + R() * 1.3) / sp) : r2((2 + R() * 2.5) / sp * dm), k = r2((1 + R() * 1.6) * u);
      const rep = ' dur="' + d + 's" begin="-' + r2(R() * d) + 's" repeatCount="indefinite"';
      const a = Math.atan2(p[3], p[2]) + (R() - 0.5) * 0.9, nx = Math.cos(a), ny = Math.sin(a);
      const x = r2(p[0]), y = r2(p[1]);
      if (t === 'glitch') {   // короткие рваные полосы: прыгают на месте и мигают
        const bw = r2((3 + R() * 9) * u * 0.7), bh = r2((0.5 + R() * 1.2) * u * 0.7), g2 = cs[(ci + 1) % cs.length];
        const pos = [0, 1, 2, 3].map(j => j ? r2(x + (R() - 0.5) * u * 12) + ' ' + r2(y + (R() - 0.5) * u * 3) : x + ' ' + y).join(';');
        s += '<g opacity="0"><animateTransform attributeName="transform" type="translate" calcMode="discrete" values="' + pos +
          '" keyTimes="0;0.25;0.5;0.75"' + rep + '/>' +
          '<animate attributeName="opacity" calcMode="discrete" values="0;1;0;1;0;1;0;0" keyTimes="0;0.1;0.2;0.3;0.45;0.55;0.7;0.85"' + rep + '/>' +
          '<rect x="' + r2(-bw / 2) + '" y="' + r2(-bh / 2) + '" width="' + bw + '" height="' + bh + '" fill="' + c + '"/>' +
          '<rect x="' + r2(-bw / 2 + u * 0.7) + '" y="' + r2(-bh / 2) + '" width="' + bw + '" height="' + bh + '" fill="' + g2 + '" opacity=".7"/></g>';
        continue;
      }
      let dx, dy, shape, pk = '0;1;0', kt = '0;0.2;1';
      if (t === 'stars') {
        dx = nx * u * 2; dy = ny * u * 2;
        shape = '<use href="#' + id + 's" transform="scale(' + k + ')" fill="' + c + '"/>';
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
      } else if (t === 'smoke') {   // клубы поднимаются, растут и растворяются
        dx = nx * u * 3 + (R() - 0.5) * u * 4; dy = -(8 + R() * 8) * u;
        pk = '0;0.8;0'; kt = '0;0.25;1';
        shape = '<circle r="' + r2(k * 1.2) + '" fill="url(#' + id + 'g' + ci + ')"><animate attributeName="r" values="' +
          r2(k * 1.2) + ';' + r2(k * 3.6) + '"' + rep + '/></circle>';
      } else if (t === 'fire') {   // язычки пламени: красный ореол и жёлтая сердцевина, тают кверху
        dx = (R() - 0.5) * u * 3; dy = -(5 + R() * 7) * u;
        pk = '0;1;0'; kt = '0;0.15;1';
        shape = '<circle r="' + r2(k * 1.5) + '" fill="url(#' + id + 'g' + ci + ')"><animate attributeName="r" values="' + r2(k * 1.5) + ';0"' + rep + '/></circle>' +
          '<circle r="' + r2(k * 0.7) + '" fill="#ffeaa0" opacity=".85"><animate attributeName="r" values="' + r2(k * 0.7) + ';0"' + rep + '/></circle>';
      } else if (t === 'fog') {   // крупные медленные пятна, плывут в стороны
        dx = (R() - 0.5) * u * 14; dy = -(1 + R() * 3) * u;
        pk = '0;0.45;0'; kt = '0;0.5;1';
        shape = '<circle r="' + r2(k * 3.5) + '" fill="url(#' + id + 'g' + ci + ')"><animate attributeName="r" values="' +
          r2(k * 3.5) + ';' + r2(k * 4.6) + '"' + rep + '/></circle>';
      } else {
        dx = nx * u * 3; dy = (8 + R() * 6) * u;
        shape = '<circle r="' + r2(k / 2) + '" fill="' + c + '"/>';
      }
      s += '<g opacity="0"><animateTransform attributeName="transform" type="translate" values="' + x + ' ' + y + ';' + r2(x + dx) + ' ' + r2(y + dy) + '"' + rep + '/>' +
        '<animate attributeName="opacity" values="' + pk + '" keyTimes="' + kt + '"' + rep + '/>' + shape + '</g>';
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
  /* Точки появления частиц. o.edge (по умолчанию да) — по краям предмета, o.all — по всей его площади.
     Если включены оба режима, лимит делится пополам. Внутри предмета нормаль смотрит вверх. */
  function points(w, h, occ, o, limit) {
    const lim = limit || 300, edge = !o || o.edge !== false, all = !!(o && o.all);
    if (!all) return outline(w, h, occ, lim);
    const cells = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (occ(x, y)) cells.push([x + 0.5, y + 0.5, 0, -1]);
    const take = (arr, m) => {   // m случайных клеток без повторов
      if (arr.length <= m) return arr;
      const R = rng(11), a = arr.slice();
      for (let i = 0; i < m; i++) { const j = i + Math.floor(R() * (a.length - i)), t = a[i]; a[i] = a[j]; a[j] = t; }
      return a.slice(0, m);
    };
    if (!edge) return take(cells, lim);
    const half = Math.ceil(lim / 2);
    return outline(w, h, occ, half).concat(take(cells, lim - half));
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
  return { MAX, TYPES, svg, bind, outline, points };
})();
