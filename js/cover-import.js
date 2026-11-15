/* Чтение готовых SVG-обложек (images/covers/*.svg) обратно в состояние редактора.
   Функции принимают корневой <svg> уже разобранного документа (DOMParser, в страницу он не вставляется)
   и возвращают обычные данные. Ничего не исполняется: SVG только читается. */
window.CoverImport = (function () {
  const BASE = 2.8;
  const HEXD = 'M0 -46L39.84 -23L39.84 23L0 46L-39.84 23L-39.84 -23Z';
  const CUBE_EDGES = 'M0 0L-39.84 -23M0 0L39.84 -23M0 0L0 46';
  const NATC = {
    smoke: ['#cfcfdc', '#a3a3b2', '#e8e8f2'], fire: ['#ff3b1f', '#ff9a1f', '#ffc23d'],
    fog: ['#dfe6f2', '#bcc7da', '#f2f5fb'], glitch: ['#00f0ff', '#ff2bd6']
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const kids = (el, name) => [...el.children].filter(e => !name || e.localName === name);
  const num = (v, d) => { const x = parseFloat(v); return isFinite(x) ? x : d; };
  function hex(c, d) {
    c = (c || '').trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(c)) return c;
    if (/^#[0-9a-f]{3}$/.test(c)) return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
    return d || '#ffffff';
  }
  function xf(el) {   // translate(x y) rotate(a) scale(k)
    const m = (el.getAttribute('transform') || '').match(/translate\(\s*([-\d.]+)[ ,]+([-\d.]+)\)\s*rotate\(\s*([-\d.]+)\)\s*scale\(\s*([-\d.]+)\)/);
    return m ? { x: +m[1], y: +m[2], r: +m[3], k: +m[4] } : null;
  }
  function detect(svg) {
    if (svg.querySelector('clipPath[id^="cl-cube"]')) return 'cubes';
    if (svg.querySelector('clipPath[id^="cl-key"]')) return 'keys';
    if (svg.querySelector('linearGradient') && svg.querySelector('use')) return 'coil';
    return 'pixel';
  }

  /* ---------- эффекты ---------- */
  function readFx(svg, imgCols) {
    const out = { type: 'none', n: 12, sp: 1, auto: true, col: '#ffffff', edge: true, all: false };
    const g = kids(svg, 'g').find(e => e.getAttribute('pointer-events') === 'none');
    if (!g || !window.FX) return out;
    const tag = g.getAttribute('data-fx');
    if (tag) {   // новые файлы: настройки записаны точно
      const p = tag.split('|');
      if (FX.TYPES[p[0]]) return { type: p[0], n: clamp(parseInt(p[1]) || 0, 0, FX.MAX), sp: clamp(num(p[2], 1), 0.3, 3),
        auto: p[3] === '1', col: hex(p[4]), edge: p[5] !== '0', all: p[6] === '1' };
    }
    const parts = kids(g, 'g');   // старые файлы: тип и настройки угадываем по устройству частиц
    if (!parts.length) return out;
    const q = s => g.querySelector(s);
    const move = el => {
      const a = el.querySelector('animateTransform[type="translate"]');
      const v = a && (a.getAttribute('values') || '').split(';').map(s => s.trim().split(/\s+/).map(Number));
      return v && v.length > 1 ? [v[1][0] - v[0][0], v[1][1] - v[0][1]] : [0, 0];
    };
    let t;
    if (q('defs path') && q('use')) t = 'stars';
    else if (q('radialGradient')) {
      if (q('circle[fill="#ffeaa0"]')) t = 'fire';
      else {
        const a = q('circle animate[attributeName="r"]'), v = a ? (a.getAttribute('values') || '').split(';').map(Number) : [1, 1];
        t = v[1] / (v[0] || 1) > 2 ? 'smoke' : 'fog';
      }
    }
    else if (q('animateTransform[calcMode="discrete"]')) t = 'glitch';
    else if (q('animateTransform[type="rotate"]')) t = 'confetti';
    else if (q('circle[fill="none"]')) t = 'bubbles';
    else t = parts.every(p => move(p)[1] > 0) ? 'snow' : 'sparks';
    const exp = { smoke: 1.5 * 3.25, fog: 2.2 * 3.25, glitch: 1.15 }[t] || 3.25;
    const durs = parts.map(p => num((p.querySelector('animate[dur]') || p.querySelector('animateTransform[dur]') || { getAttribute: () => 0 }).getAttribute('dur'), 0)).filter(d => d > 0);
    const mean = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : exp;
    out.type = t; out.n = clamp(parts.length, 1, FX.MAX); out.sp = clamp(Math.round(exp / mean * 10) / 10, 0.3, 3);
    const cols = new Set();
    if (NATC[t] && t !== 'glitch') g.querySelectorAll('radialGradient > stop:first-child').forEach(s => cols.add(hex(s.getAttribute('stop-color'))));
    else parts.forEach(p => p.querySelectorAll('[fill]').forEach(e => { const f = e.getAttribute('fill'); if (f && f !== 'none' && f[0] === '#') cols.add(hex(f)); }));
    const known = new Set((NATC[t] || []).concat(imgCols || []).map(c => hex(c)));
    out.auto = cols.size > 0 && [...cols].every(c => known.has(c));
    if (!out.auto && cols.size) out.col = [...cols][0];
    return out;
  }

  /* ---------- палочка (пиксели) ---------- */
  /* Окно слоя «по очереди» из ключевых кадров: старт a, конец разгорания re, конец затухания e (с учётом переноса через край круга). */
  function fadeWin(kt, vals, T) {
    const P = kt.map((k, i) => [k * T, vals[i]]), E = 1e-3;
    let ai = -1;
    for (let i = 0; i < P.length - 1; i++) if (P[i][1] < E && P[i + 1][1] > E) ai = i;
    if (ai < 0) return null;
    const a = P[ai][0];
    let re = a, ri = ai + 1;
    for (; ri < P.length; ri++) if (P[ri][1] >= 1 - E) { re = P[ri][0]; break; }
    if (ri >= P.length) return null;
    let e = -1;
    for (let i = ri; i < P.length; i++) if (P[i][1] < E) { e = P[i][0]; break; }
    if (e < 0) { for (let i = 1; i < P.length; i++) if (P[i][1] < E) { e = P[i][0] + T; break; } }   // хвост затухания переходит в начало круга
    if (e <= a) return null;
    const dur = e - a, r = re - a;
    return { a: a, dur: dur, r: r < T * 0.002 ? 0 : r };
  }
  function pixel(svg) {
    const vb = (svg.getAttribute('viewBox') || '0 0 32 32').split(/[\s,]+/).map(Number);
    const W = clamp(Math.round(vb[2]) || 32, 4, 128), H = clamp(Math.round(vb[3]) || 32, 4, 128);
    const blur = {};
    svg.querySelectorAll('filter').forEach(f => { const b = f.querySelector('feGaussianBlur'); blur[f.getAttribute('id')] = b ? num(b.getAttribute('stdDeviation'), 0) : 0; });
    const layers = [], wins = [];
    kids(svg, 'g').filter(g => g.getAttribute('pointer-events') !== 'none').forEach((g, i) => {
      const px = [];
      kids(g, 'rect').forEach(r => {
        const x = num(r.getAttribute('x'), 0), y = num(r.getAttribute('y'), 0), w = num(r.getAttribute('width'), 1), h = num(r.getAttribute('height'), 1), c = hex(r.getAttribute('fill'), '#ffffff');
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (x + xx < W && y + yy < H) px.push([x + xx, y + yy, c]);
      });
      const l = { name: 'Слой ' + (layers.length + 1), mode: 'static', dur: 3, smooth: 50, glow: 0, px: px };
      const fm = /url\(#([^)]+)\)/.exec(g.getAttribute('filter') || '');
      if (fm && blur[fm[1]] != null) l.glow = clamp(Math.round(blur[fm[1]] * 10), 0, 20);
      const an = kids(g, 'animate').find(a => a.getAttribute('attributeName') === 'opacity');
      if (an) {
        const T = num(an.getAttribute('dur'), 3), kt = (an.getAttribute('keyTimes') || '').split(';').map(Number), vals = (an.getAttribute('values') || '').split(';').map(Number);
        if (kt.length > 2 && kt.length === vals.length) {
          const w = fadeWin(kt, vals, T);
          l.mode = 'fade';
          if (w) { l.dur = clamp(+w.dur.toFixed(2), 0.1, 30); l.smooth = clamp(Math.round(w.r / (w.dur / 2) * 100), 0, 100); wins.push(w); }
          else { l.dur = clamp(T, 0.1, 30); wins.push(null); }
        } else { l.mode = 'pulse'; l.dur = clamp(T, 0.1, 30); }
      }
      layers.push(l);
    });
    let seqMode = 'after';
    if (wins.length > 1 && wins[0] && wins[1] && wins[0].r > 0) {
      const w0 = wins[0], d = wins[1].a - w0.a;
      if (Math.abs(d - (w0.dur - w0.r)) < Math.abs(d - w0.dur)) seqMode = 'overlap';
    }
    const cols = [...new Set(layers.flatMap(l => l.px.map(p => p[2])))];
    return { W: W, H: H, layers: layers, seqMode: seqMode, fx: readFx(svg, cols) };
  }

  /* ---------- катушки ---------- */
  function coil(svg) {
    const byId = id => svg.querySelector('[id="' + id + '"]');
    const bgEl = kids(svg, 'rect')[0];
    const res = { coils: [], hl: '#d9ccff', bg: bgEl ? hex(bgEl.getAttribute('fill'), '#000000') : '#000000', clear: !bgEl, anim: 'none', dur: 6 };
    kids(svg, 'g').filter(g => /^url\(#/.test(g.getAttribute('stroke') || '')).slice(0, 6).forEach(gr => {
      const grad = byId(/url\(#([^)]+)\)/.exec(gr.getAttribute('stroke'))[1]);
      if (!grad) return;
      const stops = kids(grad, 'stop').map(s => {
        const o = (s.getAttribute('offset') || '0').trim();
        return { c: hex(s.getAttribute('stop-color')), o: clamp(Math.round(o.slice(-1) === '%' ? parseFloat(o) : parseFloat(o) * 100) || 0, 0, 100) };
      });
      const x1 = num(grad.getAttribute('x1')), y1 = num(grad.getAttribute('y1')), x2 = num(grad.getAttribute('x2')), y2 = num(grad.getAttribute('y2'));
      const an = kids(grad, 'animate')[0], sa = kids(grad, 'stop').map(s => kids(s, 'animate')[0]).find(Boolean);
      if (an && grad.getAttribute('spreadMethod') === 'reflect') { res.anim = 'flow'; res.dur = num(an.getAttribute('dur'), 6); }
      else if (sa) { res.anim = 'cycle'; res.dur = num(sa.getAttribute('dur'), 6); }
      const fu = [...gr.querySelectorAll('use')].find(u => ((u.getAttribute('href') || u.getAttribute('xlink:href') || '')).indexOf('#f') === 0);
      const fp = fu && byId((fu.getAttribute('href') || fu.getAttribute('xlink:href')).slice(1));
      const hu = gr.querySelector('use[stroke]');
      if (hu && /^#/.test(hu.getAttribute('stroke'))) res.hl = hex(hu.getAttribute('stroke'), res.hl);
      const t = xf(gr) || { x: 200, y: 200, r: 0, k: 1 };
      res.coils.push({
        stops: stops.length >= 2 ? stops : [{ c: '#5b8cff', o: 0 }, { c: '#a064ff', o: 100 }],
        ang: isFinite(x1 + y1 + x2 + y2) ? ((Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI) % 360 + 360) % 360 : 315,
        len: isFinite(x1 + y1 + x2 + y2) ? clamp(Math.hypot(x2 - x1, y2 - y1), 60, 700) : 311,
        turns: clamp(fp ? ((fp.getAttribute('d') || '').match(/M/g) || []).length || 5 : 5, 1, 20),
        cx: clamp(Math.round(t.x), 0, 400), cy: clamp(Math.round(t.y), 0, 400), size: clamp(Math.round(t.k * 100), 20, 150), rot: clamp(Math.round(t.r), -180, 180)
      });
    });
    if (!res.coils.length) throw new Error('В файле не найдено ни одной катушки.');
    res.fx = readFx(svg, res.coils.flatMap(c => c.stops.map(p => p.c)));
    return res;
  }

  /* ---------- кубики и ключи ---------- */
  function shapes(svg, type) {
    const isCube = type === 'cubes', bgEl = kids(svg, 'rect')[0], items = [];
    kids(svg, 'g').filter(g => /^translate\(/.test(g.getAttribute('transform') || '') && g.querySelector('clipPath')).slice(0, 12).forEach(gr => {
      const t = xf(gr);
      if (!t) return;
      const it = { cx: clamp(Math.round(t.x), 0, 400), cy: clamp(Math.round(t.y), 0, 400), size: clamp(Math.round(t.k / BASE * 100), 10, 150), rot: clamp(Math.round(t.r), -180, 180),
        ang: 0, colors: [], ol: '#1a1a1a', ow: 0, edges: isCube, disc: '#9a9a9a' };
      const cp = kids(gr, 'g').find(e => e.hasAttribute('clip-path')), sg = cp && kids(cp, 'g')[0];
      if (sg) {
        const m = /rotate\(\s*([-\d.]+)/.exec(sg.getAttribute('transform') || '');
        it.ang = m ? ((Math.round(+m[1]) % 180) + 180) % 180 : 0;
        it.colors = kids(sg, 'rect').map(r => hex(r.getAttribute('fill'))).slice(0, 8);
      }
      if (!it.colors.length) it.colors = [isCube ? '#f7d117' : '#bdbdbd'];
      it.n = it.colors.length;
      if (isCube) {
        const ps = kids(gr, 'path'), ob = ps.find(p => p.getAttribute('d') === HEXD);
        if (ob) { it.ow = num(ob.getAttribute('stroke-width'), 2.2); it.ol = hex(ob.getAttribute('stroke'), it.ol); }
        it.edges = !ob || ps.some(p => p.getAttribute('d') === CUBE_EDGES);
      } else {
        const og = kids(gr, 'g').find(e => e.hasAttribute('stroke-width')), dc = kids(gr, 'circle')[0];
        if (og) { it.ow = num(og.getAttribute('stroke-width'), 0) / 2; it.ol = hex(og.getAttribute('fill'), it.ol); }
        if (dc) { it.disc = hex(dc.getAttribute('fill'), it.disc); if (!og && dc.getAttribute('stroke')) it.ol = hex(dc.getAttribute('stroke'), it.ol); }
      }
      it.ow = clamp(+it.ow.toFixed(1), 0, 6);
      items.push(it);
    });
    if (!items.length) throw new Error('В файле не найдено ни одного предмета.');
    return { items: items, bg: bgEl ? hex(bgEl.getAttribute('fill'), '#000000') : '#000000', clear: !bgEl,
      fx: readFx(svg, items.flatMap(i => i.colors.concat(isCube ? [] : [i.disc]))) };
  }

  return { detect: detect, pixel: pixel, coil: coil, shapes: shapes, readFx: readFx };
})();
