/* Стеклянное небо (экспериментально), векторная графика (SVG).
   Меняет только оформление: рисует небо с облаками позади страницы, делает линии карточек
   прозрачными с бликом стекла, а текст «парящим». Раскладку, виджет с кнопками и баннер не трогает.
   Настройки лежат в localStorage этого браузера. Если что-то пошло не так, добавьте к адресу ?theme=off */
window.SKY = (function () {
  'use strict';
  const KEY = 'a51.sky';
  const DEF = { schema: 'a51-sky-1', on: false, mode: 'auto', t: 12, clouds: 0.55, wind: 0.4, glass: 0.6 };
  const PRESETS = { 'Рассвет': 5.75, 'Утро': 8.5, 'День': 12.5, 'Закат': 18.5, 'Сумерки': 20.25, 'Ночь': 23.5 };
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const num = (v, a, b, d) => (v !== '' && v !== null && typeof v !== 'object' && isFinite(+v)) ? clamp(+v, a, b) : d;

  function validate(raw) {
    const k = Object.assign({}, DEF);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return k;
    k.on = raw.on === true;
    k.mode = raw.mode === 'fixed' ? 'fixed' : 'auto';
    k.t = num(raw.t, 0, 24, DEF.t);
    k.clouds = num(raw.clouds, 0, 1, DEF.clouds);
    k.wind = num(raw.wind, 0, 1, DEF.wind);
    k.glass = num(raw.glass, 0, 1, DEF.glass);
    return k;
  }

  /* ---------- Палитра по часам ----------
     столбцы: час, зенит (синий), голубой, сиреневый, дымка у горизонта (это небо напротив солнца),
     звёзды, свет облаков, тень облаков, сила зарева со стороны солнца */
  const hx = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
  const KF = [
    [0,    '#03040c', '#070d24', '#101a40', '#141f45', 1,   '#6a7aa8', '#1a2244', 0],
    [4.5,  '#070b20', '#101a45', '#2a2f68', '#3c3c70', 0.9, '#7a82b0', '#222a54', 0],
    [5.5,  '#1a2764', '#3f64b0', '#9a7cb4', '#c4b4cc', 0.3, '#ffc8b0', '#8a5a88', 0.85],
    [6.5,  '#2f68c0', '#62a0e4', '#b0b4dc', '#e0e4f0', 0,   '#fff0dc', '#a0a8c8', 1],
    [8,    '#2a78dc', '#4c98ec', '#86bcf0', '#bcdcf8', 0,   '#ffffff', '#a8bcd8', 0.35],
    [10,   '#1a66dc', '#3a8ae8', '#6eb0f0', '#b8def9', 0,   '#ffffff', '#9fb6d6', 0.12],
    [15.5, '#2470d6', '#448fe6', '#78b3ee', '#bcdcf6', 0,   '#ffffff', '#a4b8d6', 0.12],
    [17.5, '#2f62b8', '#5a84cc', '#9aaee0', '#c8d6ee', 0,   '#fff0d8', '#b09aa8', 0.45],
    [18.5, '#1f3a8a', '#4f86d0', '#a58cc8', '#b4cce8', 0,   '#ffd0a0', '#a8647a', 1],
    [19.5, '#151f5c', '#33509c', '#7a64a8', '#8aa0cc', 0.2, '#ffa682', '#6a4476', 0.9],
    [20.5, '#0b1236', '#1c2a68', '#3a3478', '#5a5f98', 0.6, '#a8809c', '#3a3060', 0.3],
    [21.5, '#060a22', '#0e1844', '#1a2258', '#2a3068', 1,   '#6a76a6', '#1c2448', 0],
    [24,   '#03040c', '#070d24', '#101a40', '#141f45', 1,   '#6a7aa8', '#1a2244', 0]
  ].map(r => ({ h: r[0], zen: hx(r[1]), blu: hx(r[2]), lil: hx(r[3]), haz: hx(r[4]), st: r[5], lt: hx(r[6]), sh: hx(r[7]), gl: r[8] }));
  /* зарев на стороне солнца снизу вверх: оранжевый, жёлтый, лимонный, сиреневый, голубой; днём те же слои бледнеют */
  const GDUSK = ['#ff8a30', '#ffc93c', '#f2eb7a', '#b9a0d8', '#8fc4ee'].map(hx);
  const GDAY = ['#fff4d6', '#fff8e4', '#f6fbff', '#d8ecfb', '#a8d4f6'].map(hx);
  const GOP = [1, 1, 1, 0.95, 0.6, 0];
  const mix = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
  const rgba = (c, a) => 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a === undefined ? 1 : +a.toFixed(3)) + ')';
  function state(t) {
    t = clamp(t, 0, 24);
    let i = 0;
    while (i < KF.length - 2 && t >= KF[i + 1].h) i++;
    const a = KF[i], b = KF[i + 1];
    let u = (t - a.h) / (b.h - a.h); u = u * u * (3 - 2 * u);
    return { zen: mix(a.zen, b.zen, u), blu: mix(a.blu, b.blu, u), lil: mix(a.lil, b.lil, u), haz: mix(a.haz, b.haz, u), st: a.st + (b.st - a.st) * u, lt: mix(a.lt, b.lt, u), sh: mix(a.sh, b.sh, u), gl: a.gl + (b.gl - a.gl) * u };
  }
  function rng(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- Состояние ---------- */
  let st = validate(null), root = null, B = null, clouds = [], seed = 0;
  let W = 0, H = 0, tNow = 12, timer = 0, resizeT = 0;
  /* слои облаков: t = w (перьястые и слоистые) или c (кучевые); чем ближе к горизонту, тем мельче и площе */
  const LAYERS = [
    { t: 'w', y0: .03, y1: .28, s0: .5,  s1: 1,   n: 4, a: .6,  sq: .5,  v: .25, bl: 2.2 },
    { t: 'c', y0: .44, y1: .66, s0: .1,  s1: .2,  n: 9, a: .8,  sq: .45, v: .35, bl: 1 },
    { t: 'c', y0: .2,  y1: .5,  s0: .2,  s1: .38, n: 5, a: .9,  sq: .65, v: .6,  bl: 1.4 },
    { t: 'c', y0: .04, y1: .3,  s0: .38, s1: .7,  n: 3, a: .97, sq: .8,  v: 1,   bl: 2 }
  ];

  function clock() {
    if (st.mode === 'fixed') return st.t;
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  }

  /* ---------- CSS стекла и парящего текста ---------- */
  function css() {
    const g = st.glass, P = 'html.sky-on body .wrapper', N = ':not(.zz):not(.zy)';
    const sel = (list, suf) => list.map(x => P + ' ' + x + N + (suf || '')).join(',');
    const C = ['.main-sector-card', '.item-card', '.ed-card'];
    const blur = Math.round(4 + 16 * g) + 'px';
    const a1 = (0.10 + 0.22 * g).toFixed(2), a2 = (0.02 + 0.07 * g).toFixed(2);
    const tsh = '0 1px 2px rgba(3,14,44,.6),0 2px 14px rgba(3,14,44,.4)';
    const hsh = '0 2px 3px rgba(3,14,44,.55),0 5px 22px rgba(3,14,44,.45),0 0 26px rgba(255,255,255,.22)';
    let s = '';
    s += 'html.sky-on{background:#03040c!important}html.sky-on body{background:transparent!important}html.sky-on body::before{display:none!important}';
    s += P + '{background:transparent!important;box-shadow:none!important;color:#fff!important}';
    s += sel(['h1', 'h2', 'h3', 'h4']) + '{color:#fff!important;text-shadow:' + hsh + '!important}';
    s += sel(['p', 'li', 'label', 'em', 'strong', 'small', 'span:not(.stat):not(.badge)', 'footer', 'footer p']) + '{color:rgba(255,255,255,.93)!important;text-shadow:' + tsh + '!important}';
    s += sel(['.hint', '.card-text p', '.item-card p']) + '{color:rgba(255,255,255,.84)!important}';
    s += sel(['a']) + '{color:#d4eaff!important;text-shadow:0 1px 3px rgba(3,14,44,.6),0 0 14px rgba(160,210,255,.5)!important}';
    s += sel(['.stat']) + '{color:#c9fff0!important;text-shadow:0 1px 3px rgba(3,14,44,.55),0 0 12px rgba(120,255,220,.5)!important}';
    s += sel(['.badge']) + '{color:#fff!important;background:rgba(255,255,255,.16)!important;border-color:rgba(255,255,255,.3)!important}';
    s += sel(['footer']) + '{border-top-color:rgba(255,255,255,.14)!important}';
    s += sel(['hr']) + '{background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)!important;box-shadow:0 0 12px rgba(255,255,255,.25)!important}';
    s += sel(['img:not(footer img)']) + '{border-color:rgba(255,255,255,.3)!important;box-shadow:0 8px 24px rgba(3,14,44,.35)!important}';
    const fill = 'linear-gradient(135deg,rgba(255,255,255,' + a1 + '),rgba(255,255,255,' + a2 + ')),linear-gradient(rgba(8,24,60,var(--sky-tint,.2)),rgba(8,24,60,var(--sky-tint,.2)))';
    s += sel(C) + '{position:relative!important;isolation:isolate!important;background:' + fill + '!important;border-color:transparent!important;-webkit-backdrop-filter:blur(' + blur + ') saturate(1.5)!important;backdrop-filter:blur(' + blur + ') saturate(1.5)!important;box-shadow:0 10px 34px rgba(3,14,44,.22)!important;overflow:hidden!important}';
    s += sel(['.main-sector-card', '.item-card'], ':hover') + '{border-color:transparent!important;box-shadow:0 14px 40px rgba(3,14,44,.3)!important}';
    s += sel(C, '::before') + '{content:""!important;position:absolute!important;left:0!important;right:0!important;top:0!important;bottom:0!important;height:auto!important;border-radius:inherit!important;pointer-events:none!important;z-index:-1!important;opacity:1!important;background:linear-gradient(115deg,rgba(255,255,255,.34) 0%,rgba(255,255,255,.10) 18%,rgba(255,255,255,0) 40%,rgba(255,255,255,0) 100%)!important}';
    s += sel(C, '::after') + '{content:""!important;position:absolute!important;left:0!important;right:0!important;top:0!important;bottom:0!important;border-radius:inherit!important;padding:1px!important;pointer-events:none!important;z-index:-1!important;background:linear-gradient(135deg,rgba(255,255,255,.7),rgba(255,255,255,.06) 35%,rgba(255,255,255,.02) 62%,rgba(255,255,255,.42))!important;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;-webkit-mask-composite:xor!important;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)!important;mask-composite:exclude!important}';
    s += sel(['.ed-card input[type=text]', '.ed-card input[type=password]', '.ed-card input[type=number]', '.ed-card select', '.ed-card textarea']) + '{background:rgba(255,255,255,.12)!important;color:#fff!important;border-color:rgba(255,255,255,.22)!important}';
    s += sel(['.ed-card select option']) + '{background:#1a2038!important;color:#fff!important}';
    s += sel(['.ed-card .ed-btn', '.lang-btn']) + '{background:rgba(255,255,255,.14)!important;border-color:rgba(255,255,255,.3)!important;color:#fff!important}';
    s += sel(['.ed-card .ed-btn.on']) + '{background:rgba(255,255,255,.36)!important}';
    s += sel(['.ed-card .layer', '.ed-card .jr']) + '{border-color:rgba(255,255,255,.18)!important}';
    s += sel(['.ed-card input[type=range]']) + '{accent-color:#fff}';
    s += '@keyframes a51fl{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,-3px,0)}}';
    s += '@media (prefers-reduced-motion:no-preference){' + sel(['h1', '.card-text', '.item-card h3', '.item-card p']) + '{animation:a51fl 5.5s ease-in-out infinite alternate}' + sel(['.items-grid>*:nth-child(2n) h3', '.items-grid>*:nth-child(2n) p', '.main-sector-card:nth-of-type(2n) .card-text']) + '{animation-duration:6.8s;animation-delay:-2.2s}}';
    return s;
  }
  function setCss() {
    let el = document.getElementById('a51-sky-css');
    if (!el) { el = document.createElement('style'); el.id = 'a51-sky-css'; (document.head || document.documentElement).appendChild(el); }
    el.textContent = css();
  }

  /* ---------- Векторное небо ---------- */
  const f1 = v => (+v).toFixed(1);
  function ridge(base, amp, k, ph) {
    let d = 'M0 ' + H;
    for (let x = 0; x <= W + 6; x += 6) {
      const u = x / W;
      d += 'L' + x + ' ' + f1(base - amp * (0.55 * Math.sin(u * k + ph) + 0.3 * Math.sin(u * k * 2.1 + ph * 1.7) + 0.15 * Math.sin(u * k * 4.7 + ph * 0.6)));
    }
    return d + 'L' + W + ' ' + H + 'Z';
  }
  function skyMarkup() {
    const hy = H * 0.8, rs = rng(77);
    let s = '<defs>';
    /* основа: синий сверху, голубой, сиреневый, дымчато-голубой у горизонта */
    s += '<linearGradient id="a51g" x1="0" y1="0" x2="0" y2="1">';
    [0, .38, .62, .8, 1].forEach((o, i) => { s += '<stop id="a51g' + i + '" offset="' + o + '"/>'; });
    s += '</linearGradient>';
    /* зарев со стороны солнца: слои растут от горизонта вверх */
    s += '<radialGradient id="a51s" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1">';
    [0, .16, .3, .48, .74, 1].forEach((o, i) => { s += '<stop id="a51s' + i + '" offset="' + o + '" stop-opacity="' + GOP[i] + '"/>'; });
    s += '</radialGradient>';
    s += '<radialGradient id="a51sh"><stop id="a51sh0" offset="0"/><stop id="a51sh1" offset=".12"/><stop id="a51sh2" offset="1"/></radialGradient>';
    s += '<radialGradient id="a51sd"><stop offset="0" stop-color="#fff"/><stop id="a51sd1" offset=".7"/><stop id="a51sd2" offset="1"/></radialGradient>';
    s += '<radialGradient id="a51mh"><stop offset="0" stop-color="rgb(190,210,255)" stop-opacity=".35"/><stop offset="1" stop-color="rgb(190,210,255)" stop-opacity="0"/></radialGradient>';
    s += '<radialGradient id="a51md" cx=".35" cy=".35" r=".75"><stop offset="0" stop-color="#fffdf2"/><stop offset="1" stop-color="#cfd3dc"/></radialGradient>';
    s += '</defs>';
    s += '<rect width="' + W + '" height="' + H + '" fill="url(#a51g)"/>';
    s += '<rect id="a51sg" width="' + W + '" height="' + H + '" fill="url(#a51s)"/>';
    /* звёзды: три группы мерцают в разной фазе */
    s += '<g id="a51st">';
    for (let g = 0; g < 3; g++) {
      s += '<g class="a51t' + g + '" fill="#fff">';
      for (let i = 0; i < 55; i++) {
        const y = rs() * 0.72, a = Math.sqrt(Math.max(0, 1 - y / 0.8));
        s += '<circle cx="' + f1(rs() * W) + '" cy="' + f1(y * H) + '" r="' + f1(0.4 + rs() * 0.7) + '" opacity="' + a.toFixed(2) + '"/>';
      }
      s += '</g>';
    }
    s += '</g>';
    s += '<g id="a51sun"><circle id="a51sunh" fill="url(#a51sh)"/><circle id="a51sund" fill="url(#a51sd)"/></g>';
    s += '<g id="a51moon"><g id="a51mr"><circle r="7" fill="url(#a51mh)"/><circle r="1" fill="url(#a51md)"/><g fill="rgba(120,125,140,.16)">';
    [[-.35, -.1, .22], [.25, .2, .3], [.1, -.4, .14], [-.2, .4, .16]].forEach(c => { s += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '"/>'; });
    s += '</g></g></g>';
    s += '<path id="a51h1" d="' + ridge(hy, H * 0.035, 5, 0.6) + '"/>';
    s += '<path id="a51h2" d="' + ridge(hy + H * 0.04, H * 0.04, 3.4, 2.1) + '"/>';
    return s;
  }

  /* ---------- Облака: случайные кучевые, перьястые и слоистые ---------- */
  const circ = (x, y, r, f) => '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(r) + '" fill="' + f + '"/>';
  /* кучевое: плоское основание, купол из накладывающихся шаров, сверху светло, снизу тень */
  function cumulus(cw, rnd, gid) {
    const f = 'url(#' + gid + ')', n = 6 + Math.floor(rnd() * 7);
    let o = '<ellipse cx="0" cy="' + f1(cw * 0.012) + '" rx="' + f1(cw * (0.4 + 0.12 * rnd())) + '" ry="' + f1(cw * 0.04) + '" style="fill:var(--sh)" opacity=".55"/>';
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, hp = Math.pow(Math.sin(u * Math.PI), 0.8), r = cw * (0.06 + 0.12 * hp) * (0.8 + 0.5 * rnd());
      o += circ((u - 0.5) * cw * 0.92 + (rnd() - 0.5) * cw * 0.03, -r * (0.55 + 0.35 * rnd()), r, f);
    }
    const tops = 2 + Math.floor(rnd() * 3);
    for (let j = 0; j < tops; j++) {
      const r = cw * (0.09 + 0.07 * rnd());
      o += circ((rnd() - 0.5) * cw * 0.5, -cw * (0.07 + 0.1 * rnd()) - r * 0.2, r, f);
    }
    return o;
  }
  /* перьястые: тонкие изгибающиеся штрихи */
  function wisp(cw, rnd) {
    const m = 3 + Math.floor(rnd() * 4), sk = (rnd() - 0.5) * cw * 0.06;
    let o = '';
    for (let j = 0; j < m; j++) {
      const y0 = (j - m / 2) * cw * 0.022 + (rnd() - 0.5) * 8, x0 = -cw / 2 + rnd() * cw * 0.2, x1 = cw / 2 - rnd() * cw * 0.2;
      o += '<path d="M' + f1(x0) + ' ' + f1(y0) + 'Q0 ' + f1(y0 + (rnd() - 0.5) * cw * 0.1) + ' ' + f1(x1) + ' ' + f1(y0 + sk) + '" fill="none" stroke-linecap="round" stroke-width="' + f1(0.8 + rnd() * 2.2) + '" opacity="' + (0.4 + 0.4 * rnd()).toFixed(2) + '" style="stroke:var(--lt)"/>';
    }
    return o;
  }
  /* слоистые: длинные плоские эллипсы */
  function strat(cw, rnd) {
    const m = 3 + Math.floor(rnd() * 3);
    let o = '';
    for (let j = 0; j < m; j++) o += '<ellipse cx="' + f1((rnd() - 0.5) * cw * 0.5) + '" cy="' + f1((rnd() - 0.5) * cw * 0.03) + '" rx="' + f1(cw * (0.15 + 0.2 * rnd())) + '" ry="' + f1(cw * (0.012 + 0.02 * rnd())) + '" opacity="' + (0.25 + 0.2 * rnd()).toFixed(2) + '" style="fill:var(--lt)"/>';
    return o;
  }
  function layerSvg(L, i, rnd) {
    const gid = 'a51cl' + i, fid = 'a51bl' + i, cw0 = Math.min(W, 900), n = Math.round(L.n * st.clouds * 2);
    let body = '';
    for (let j = 0; j < n; j++) {
      const x = rnd() * W, y = H * (L.y0 + rnd() * (L.y1 - L.y0)), cw = cw0 * (L.s0 + rnd() * (L.s1 - L.s0));
      const sh = L.t === 'w' ? (rnd() < 0.6 ? wisp(cw, rnd) : strat(cw, rnd)) : cumulus(cw, rnd, gid);
      for (let k = 0; k < 2; k++) body += '<g transform="translate(' + f1(x + k * W) + ' ' + f1(y) + ') scale(1 ' + L.sq + ')">' + sh + '</g>';
    }
    const sv = document.createElementNS(NS, 'svg');
    sv.setAttribute('class', 'a51c');
    sv.setAttribute('width', 2 * W); sv.setAttribute('height', H); sv.setAttribute('viewBox', '0 0 ' + 2 * W + ' ' + H);
    sv.style.cssText = 'position:absolute;left:0;top:0';
    sv.innerHTML = '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2=".15" y2="1"><stop offset="0" style="stop-color:var(--lt)"/><stop offset=".5" style="stop-color:var(--lt)"/><stop offset="1" style="stop-color:var(--sh)"/></linearGradient>' +
      '<filter id="' + fid + '" filterUnits="userSpaceOnUse" x="-80" y="-80" width="' + (2 * W + 160) + '" height="' + (H + 160) + '"><feGaussianBlur stdDeviation="' + L.bl + '"/></filter></defs>' +
      '<g filter="url(#' + fid + ')" opacity="' + L.a + '">' + body + '</g>';
    sv.dataset.v = L.v;
    sv.dataset.d = rnd().toFixed(3);
    return sv;
  }
  function makeClouds() {
    if (!root) return;
    root.querySelectorAll('.a51c').forEach(e => e.remove());
    clouds = [];
    LAYERS.forEach((L, i) => { const sv = layerSvg(L, i, rng(seed + i * 101)); root.appendChild(sv); clouds.push(sv); });
    applyWind(); paint();
  }
  function applyWind() {
    clouds.forEach(sv => {
      const D = W / ((4 + 26 * st.wind) * (+sv.dataset.v));
      sv.style.animationDuration = D.toFixed(1) + 's';
      sv.style.animationDelay = (-(+sv.dataset.d) * D).toFixed(1) + 's';
    });
  }

  /* ---------- Каркас на странице ---------- */
  function animCss() {
    return '@keyframes a51tw{from{opacity:.35}to{opacity:1}}' +
      '.a51t0{animation:a51tw 2.6s ease-in-out infinite alternate}.a51t1{animation:a51tw 3.7s ease-in-out -1s infinite alternate}.a51t2{animation:a51tw 5.1s ease-in-out -2s infinite alternate}' +
      '@keyframes a51dr{from{transform:translate3d(-' + W + 'px,0,0)}to{transform:translate3d(0,0,0)}}' +
      '.a51c{animation-name:a51dr;animation-timing-function:linear;animation-iteration-count:infinite;will-change:transform}' +
      '@media (prefers-reduced-motion:reduce){.a51t0,.a51t1,.a51t2,.a51c{animation:none!important}}';
  }
  function mount() {
    if (!document.body) return;
    W = window.innerWidth; H = window.innerHeight;
    if (!seed) seed = (Math.random() * 4294967296) >>> 0;
    if (!root) {
      root = document.createElement('div'); root.id = 'a51-sky'; root.setAttribute('aria-hidden', 'true');
      root.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:-1;overflow:hidden;pointer-events:none';
      document.body.insertBefore(root, document.body.firstChild);
    }
    root.innerHTML = '';
    const sty = document.createElement('style'); sty.textContent = animCss(); root.appendChild(sty);
    const sv = document.createElementNS(NS, 'svg');
    sv.setAttribute('width', W); sv.setAttribute('height', H); sv.setAttribute('viewBox', '0 0 ' + W + ' ' + H); sv.setAttribute('preserveAspectRatio', 'none');
    sv.style.cssText = 'position:absolute;left:0;top:0';
    sv.innerHTML = skyMarkup();
    root.appendChild(sv);
    const q = id => sv.querySelector('#' + id), qs = (p, n) => Array.from({ length: n }, (_, i) => q(p + i));
    B = { g: qs('a51g', 5), s: qs('a51s', 6), sg: q('a51sg'), st: q('a51st'), sun: q('a51sun'), sunh: q('a51sunh'), sund: q('a51sund'), sh: qs('a51sh', 3), sd: [null, q('a51sd1'), q('a51sd2')], moon: q('a51moon'), mr: q('a51mr'), h1: q('a51h1'), h2: q('a51h2') };
    tNow = clock(); makeClouds(); setTint();
  }
  function paint() {
    if (!root || !B) return;
    const s = state(tNow), hy = H * 0.8;
    [s.zen, s.blu, s.lil, s.haz, s.haz].forEach((c, i) => B.g[i].setAttribute('stop-color', rgba(c)));
    /* зарев */
    const f = clamp((s.gl - 0.2) / 0.6, 0, 1), sp = (tNow - 5.5) / 14, gx = W * (0.1 + 0.8 * clamp(sp, 0, 1));
    const gc = GDUSK.map((c, i) => mix(GDAY[i], c, f));
    [gc[0], gc[1], gc[2], gc[3], gc[4], gc[4]].forEach((c, i) => B.s[i].setAttribute('stop-color', rgba(c)));
    B.s[0].parentNode.setAttribute('gradientTransform', 'translate(' + f1(gx) + ' ' + f1(hy) + ') scale(' + f1(W * 0.95) + ' ' + f1(H * 0.8) + ')');
    B.sg.setAttribute('opacity', clamp(s.gl, 0, 1).toFixed(3));
    B.st.setAttribute('opacity', s.st.toFixed(3));
    /* солнце */
    if (sp > -0.05 && sp < 1.05) {
      const e = Math.sin(sp * Math.PI), x = W * (0.1 + 0.8 * clamp(sp, 0, 1)), y = hy - e * hy * 0.82;
      const col = mix([255, 170, 90], [255, 248, 225], clamp(e * 1.6, 0, 1));
      B.sun.setAttribute('transform', 'translate(' + f1(x) + ' ' + f1(y) + ')'); B.sun.setAttribute('opacity', 1);
      B.sunh.setAttribute('r', f1(Math.max(W, H) * (0.4 - 0.12 * clamp(e, 0, 1))));
      B.sund.setAttribute('r', f1(Math.min(W, H) * 0.045));
      [[0, .6], [1, .25], [2, 0]].forEach(p => { B.sh[p[0]].setAttribute('stop-color', rgba(col)); B.sh[p[0]].setAttribute('stop-opacity', p[1]); });
      B.sd[1].setAttribute('stop-color', rgba(col)); B.sd[2].setAttribute('stop-color', rgba(col)); B.sd[2].setAttribute('stop-opacity', 0);
    } else B.sun.setAttribute('opacity', 0);
    /* луна */
    const q = (((tNow - 19) % 24) + 24) % 24 / 12;
    if (q < 1) {
      const e = Math.sin(q * Math.PI), x = W * (0.1 + 0.8 * q), y = hy - e * hy * 0.78, r = Math.min(W, H) * 0.05;
      B.moon.setAttribute('transform', 'translate(' + f1(x) + ' ' + f1(y) + ')');
      B.mr.setAttribute('transform', 'scale(' + f1(r) + ')');
      B.moon.setAttribute('opacity', (Math.pow(e, 0.35) * (0.3 + 0.7 * clamp(s.st * 1.5, 0, 1))).toFixed(3));
    } else B.moon.setAttribute('opacity', 0);
    B.h1.setAttribute('fill', rgba(mix(s.haz, s.zen, 0.4)));
    B.h2.setAttribute('fill', rgba(mix(s.haz, [8, 16, 30], 0.62)));
    clouds.forEach(sv => { sv.style.setProperty('--lt', rgba(s.lt)); sv.style.setProperty('--sh', rgba(s.sh)); });
  }
  function setTint() {
    const m = state(tNow).blu, l = (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255;
    document.documentElement.style.setProperty('--sky-tint', (0.10 + 0.24 * clamp(l / 0.6, 0, 1)).toFixed(2));
  }
  function tick() { tNow = clock(); paint(); setTint(); }
  function start() { if (!timer) timer = setInterval(tick, 2000); }
  function stop() { if (timer) { clearInterval(timer); timer = 0; } }
  function whenBody(fn) { if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn, { once: true }); }
  function onResize() {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { if (root && (window.innerWidth !== W || Math.abs(window.innerHeight - H) > 80)) mount(); }, 200);
  }
  function enable() {
    document.documentElement.classList.add('sky-on'); setCss();
    whenBody(() => { mount(); start(); });
    window.removeEventListener('resize', onResize); window.addEventListener('resize', onResize);
  }
  function disable() {
    stop(); window.removeEventListener('resize', onResize);
    document.documentElement.classList.remove('sky-on');
    document.documentElement.style.removeProperty('--sky-tint');
    const el = document.getElementById('a51-sky-css'); if (el) el.remove();
    if (root) { root.remove(); root = B = null; clouds = []; }
    seed = 0;
  }

  /* ---------- Публичный интерфейс ---------- */
  function stored() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function get() { return Object.assign({}, st); }
  function set(p) {
    const was = st.on, prev = st;
    st = validate(Object.assign({}, st, p || {}));
    if (st.on && !was) enable();
    else if (!st.on && was) disable();
    else if (st.on) {
      setCss();
      if (root) {
        if (prev.clouds !== st.clouds) makeClouds();
        applyWind(); tNow = clock(); paint(); setTint();
      }
    }
    return get();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); return true; } catch (e) { return false; } }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} st = validate(null); disable(); return get(); }

  /* Загрузка при открытии любой страницы; ?theme=off отключает небо */
  if (!/[?&](theme|kit|sky)=off\b/.test(location.search)) {
    const raw = stored();
    if (raw) { st = validate(raw); if (st.on) enable(); }
  }

  return { PRESETS: PRESETS, get: get, set: set, save: save, reset: reset, stored: stored, clock: clock };
})();
