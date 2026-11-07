/* Эффекты для SVG-обложек: чистый SMIL, без JS внутри картинки.
   Лимит частиц защищает слабые телефоны. */
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
    const t = o.type;
    if (!t || t === 'none' || !TYPES[t]) return '';
    const n = Math.min(MAX, Math.max(0, Math.round(+o.count || 0)));
    if (!n) return '';
    const w = o.w, h = o.h, u = Math.max(w, h) / 100;
    const sp = Math.min(5, Math.max(0.2, +o.speed || 1));
    const cs = (o.colors && o.colors.length) ? o.colors : ['#ffffff'];
    const R = rng(o.seed || 7);
    let s = '<g>';
    if (t === 'stars') s += '<defs><path id="fxs" d="M0-1 .3-.3 1 0 .3 .3 0 1-.3 .3-1 0-.3-.3Z"/></defs>';
    for (let i = 0; i < n; i++) {
      const c = cs[i % cs.length], d = r2((3 + R() * 3) / sp), b = '-' + r2(R() * d) + 's';
      const x = r2(R() * w), y = r2(R() * h), k = r2((1.5 + R() * 2) * u);
      const rep = ' dur="' + d + 's" begin="' + b + '" repeatCount="indefinite"';
      if (t === 'stars') {
        s += '<use href="#fxs" transform="translate(' + x + ' ' + y + ') scale(' + k + ')" fill="' + c + '" opacity="0">' +
          '<animate attributeName="opacity" values="0;1;0"' + rep + '/></use>';
      } else if (t === 'sparks') {
        const a = R() * 6.283, L = (18 + R() * 25) * u;
        s += '<circle cx="' + r2(w / 2) + '" cy="' + r2(h / 2) + '" r="' + r2(k / 2) + '" fill="' + c + '" opacity="0">' +
          '<animateTransform attributeName="transform" type="translate" values="0 0;' + r2(Math.cos(a) * L) + ' ' + r2(Math.sin(a) * L) + '"' + rep + '/>' +
          '<animate attributeName="opacity" values="1;0"' + rep + '/></circle>';
      } else {
        const up = t === 'bubbles', dx = (R() - 0.5) * 10 * u;
        const y0 = r2(up ? h + 3 * u : -3 * u), y1 = r2(up ? -3 * u : h + 3 * u);
        let shape;
        if (t === 'confetti') {
          shape = '<rect x="' + r2(-k / 2) + '" y="' + r2(-k / 4) + '" width="' + k + '" height="' + r2(k / 2) + '" fill="' + c + '">' +
            '<animateTransform attributeName="transform" type="rotate" values="0;360"' + rep + '/></rect>';
        } else if (t === 'bubbles') {
          shape = '<circle r="' + k + '" fill="none" stroke="' + c + '" stroke-width="' + r2(u / 3) + '" opacity=".7"/>';
        } else {
          shape = '<circle r="' + r2(k / 2) + '" fill="' + c + '"/>';
        }
        s += '<g><animateTransform attributeName="transform" type="translate" values="' + x + ' ' + y0 + ';' + r2(x + dx) + ' ' + y1 + '"' + rep + '/>' + shape + '</g>';
      }
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
