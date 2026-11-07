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
  return { MAX, TYPES, svg, bind };
})();
