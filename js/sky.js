/* Стеклянное небо (экспериментально). Меняет только оформление: рисует небо с облаками позади страницы,
   делает линии карточек прозрачными с бликом стекла, а текст «парящим». Раскладку, виджет с кнопками и баннер не трогает.
   Настройки лежат в localStorage этого браузера. Если что-то пошло не так, добавьте к адресу ?theme=off */
window.SKY = (function () {
  'use strict';
  const KEY = 'a51.sky';
  const DEF = { schema: 'a51-sky-1', on: false, mode: 'auto', t: 12, clouds: 0.55, wind: 0.4, glass: 0.6 };
  const PRESETS = { 'Рассвет': 5.75, 'Утро': 8.5, 'День': 12.5, 'Закат': 18.5, 'Сумерки': 20.25, 'Ночь': 23.5 };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const num = (v, a, b, d) => (v !== '' && v !== null && typeof v !== 'object' && isFinite(+v)) ? clamp(+v, a, b) : d;
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

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

  /* ---------- Палитра неба по часам: верх, середина, горизонт, звёзды, свет облаков, тень облаков ---------- */
  const hx = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
  const KF = [
    [0,    '#03040c', '#070d24', '#141f45', 1,    '#6a7aa8', '#1a2244'],
    [4.5,  '#070b20', '#16224f', '#3c3c70', 0.9,  '#7a82b0', '#222a54'],
    [5.5,  '#202d62', '#8a5f98', '#ff9c6e', 0.35, '#ffc8b0', '#8a5a88'],
    [6.5,  '#4a7cc8', '#94bde4', '#ffd9ab', 0,    '#fff0dc', '#a0a8c8'],
    [9,    '#3280e0', '#74b8f2', '#c2e5fb', 0,    '#ffffff', '#a8bcd8'],
    [12,   '#2070e2', '#5eaaf2', '#b8def9', 0,    '#ffffff', '#9fb6d6'],
    [15.5, '#2c79d8', '#6cb0ec', '#c4e2f6', 0,    '#ffffff', '#a4b8d6'],
    [17.5, '#3b66b4', '#9db4d8', '#ffd2a0', 0,    '#fff0d8', '#b09aa8'],
    [18.5, '#3a4a90', '#d8887c', '#ffae62', 0,    '#ffd0a0', '#a8647a'],
    [19.5, '#2a2d68', '#a65b8a', '#ff7a52', 0.2,  '#ffa682', '#6a4476'],
    [20.5, '#131b47', '#413572', '#8c4c7c', 0.6,  '#a8809c', '#3a3060'],
    [21.5, '#070c26', '#141c4a', '#2a2c5a', 1,    '#6a76a6', '#1c2448'],
    [24,   '#03040c', '#070d24', '#141f45', 1,    '#6a7aa8', '#1a2244']
  ].map(r => ({ h: r[0], top: hx(r[1]), mid: hx(r[2]), hor: hx(r[3]), st: r[4], lt: hx(r[5]), sh: hx(r[6]) }));
  const mix = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
  const rgba = (c, a) => 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a === undefined ? 1 : +a.toFixed(3)) + ')';
  function state(t) {
    t = clamp(t, 0, 24);
    let i = 0;
    while (i < KF.length - 2 && t >= KF[i + 1].h) i++;
    const a = KF[i], b = KF[i + 1];
    let u = (t - a.h) / (b.h - a.h); u = u * u * (3 - 2 * u);
    return { top: mix(a.top, b.top, u), mid: mix(a.mid, b.mid, u), hor: mix(a.hor, b.hor, u), st: a.st + (b.st - a.st) * u, lt: mix(a.lt, b.lt, u), sh: mix(a.sh, b.sh, u) };
  }
  function rng(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- Состояние ---------- */
  let st = validate(null), root = null, sc = null, sx = null, lays = [], offs = [0, 0, 0];
  let W = 0, H = 0, SR = 1, tNow = 12, raf = 0, last = 0, lastSky = 0, lastSig = null, stars = [], resizeT = 0;
  const LR = 0.5;
  const LAYERS = [
    { y0: .03, y1: .26, s0: .45, s1: .8,  n: 3, a: .38, sq: .2,  v: .35, p0: 10, p1: 14 },
    { y0: .10, y1: .52, s0: .16, s1: .3,  n: 6, a: .72, sq: .72, v: .6,  p0: 7,  p1: 10 },
    { y0: .14, y1: .62, s0: .38, s1: .7,  n: 3, a: .95, sq: .8,  v: 1,   p0: 9,  p1: 13 }
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
    /* текст без подложки: парит над стеклом */
    s += sel(['h1', 'h2', 'h3', 'h4']) + '{color:#fff!important;text-shadow:' + hsh + '!important}';
    s += sel(['p', 'li', 'label', 'em', 'strong', 'small', 'span:not(.stat):not(.badge)', 'footer', 'footer p']) + '{color:rgba(255,255,255,.93)!important;text-shadow:' + tsh + '!important}';
    s += sel(['.hint', '.card-text p', '.item-card p']) + '{color:rgba(255,255,255,.84)!important}';
    s += sel(['a']) + '{color:#d4eaff!important;text-shadow:0 1px 3px rgba(3,14,44,.6),0 0 14px rgba(160,210,255,.5)!important}';
    s += sel(['.stat']) + '{color:#c9fff0!important;text-shadow:0 1px 3px rgba(3,14,44,.55),0 0 12px rgba(120,255,220,.5)!important}';
    s += sel(['.badge']) + '{color:#fff!important;background:rgba(255,255,255,.16)!important;border-color:rgba(255,255,255,.3)!important}';
    s += sel(['footer']) + '{border-top-color:rgba(255,255,255,.14)!important}';
    s += sel(['hr']) + '{background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)!important;box-shadow:0 0 12px rgba(255,255,255,.25)!important}';
    s += sel(['img:not(footer img)']) + '{border-color:rgba(255,255,255,.3)!important;box-shadow:0 8px 24px rgba(3,14,44,.35)!important}';
    /* стеклянные карточки: рамка прозрачная, по краю только блик */
    const fill = 'linear-gradient(135deg,rgba(255,255,255,' + a1 + '),rgba(255,255,255,' + a2 + ')),linear-gradient(rgba(8,24,60,var(--sky-tint,.2)),rgba(8,24,60,var(--sky-tint,.2)))';
    s += sel(C) + '{position:relative!important;isolation:isolate!important;background:' + fill + '!important;border-color:transparent!important;-webkit-backdrop-filter:blur(' + blur + ') saturate(1.5)!important;backdrop-filter:blur(' + blur + ') saturate(1.5)!important;box-shadow:0 10px 34px rgba(3,14,44,.22)!important;overflow:hidden!important}';
    s += sel(['.main-sector-card', '.item-card'], ':hover') + '{border-color:transparent!important;box-shadow:0 14px 40px rgba(3,14,44,.3)!important}';
    s += sel(C, '::before') + '{content:""!important;position:absolute!important;left:0!important;right:0!important;top:0!important;bottom:0!important;height:auto!important;border-radius:inherit!important;pointer-events:none!important;z-index:-1!important;opacity:1!important;background:linear-gradient(115deg,rgba(255,255,255,.34) 0%,rgba(255,255,255,.10) 18%,rgba(255,255,255,0) 40%,rgba(255,255,255,0) 100%)!important}';
    s += sel(C, '::after') + '{content:""!important;position:absolute!important;left:0!important;right:0!important;top:0!important;bottom:0!important;border-radius:inherit!important;padding:1px!important;pointer-events:none!important;z-index:-1!important;background:linear-gradient(135deg,rgba(255,255,255,.7),rgba(255,255,255,.06) 35%,rgba(255,255,255,.02) 62%,rgba(255,255,255,.42))!important;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;-webkit-mask-composite:xor!important;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)!important;mask-composite:exclude!important}';
    /* поля и кнопки внутри карточек настроек */
    s += sel(['.ed-card input[type=text]', '.ed-card input[type=password]', '.ed-card input[type=number]', '.ed-card select', '.ed-card textarea']) + '{background:rgba(255,255,255,.12)!important;color:#fff!important;border-color:rgba(255,255,255,.22)!important}';
    s += sel(['.ed-card select option']) + '{background:#1a2038!important;color:#fff!important}';
    s += sel(['.ed-card .ed-btn', '.lang-btn']) + '{background:rgba(255,255,255,.14)!important;border-color:rgba(255,255,255,.3)!important;color:#fff!important}';
    s += sel(['.ed-card .ed-btn.on']) + '{background:rgba(255,255,255,.36)!important}';
    s += sel(['.ed-card .layer', '.ed-card .jr']) + '{border-color:rgba(255,255,255,.18)!important}';
    s += sel(['.ed-card input[type=range]']) + '{accent-color:#fff}';
    /* парение: едва заметное покачивание текста, только если движение не отключено в системе */
    s += '@keyframes a51fl{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,-3px,0)}}';
    s += '@media (prefers-reduced-motion:no-preference){' + sel(['h1', '.card-text', '.item-card h3', '.item-card p']) + '{animation:a51fl 5.5s ease-in-out infinite alternate}' + sel(['.items-grid>*:nth-child(2n) h3', '.items-grid>*:nth-child(2n) p', '.main-sector-card:nth-of-type(2n) .card-text']) + '{animation-duration:6.8s;animation-delay:-2.2s}}';
    return s;
  }
  function setCss() {
    let el = document.getElementById('a51-sky-css');
    if (!el) { el = document.createElement('style'); el.id = 'a51-sky-css'; (document.head || document.documentElement).appendChild(el); }
    el.textContent = css();
  }

  /* ---------- Рисуем небо ---------- */
  function ridge(base, amp, k, ph, col) {
    sx.beginPath(); sx.moveTo(0, H);
    for (let x = 0; x <= W + 6; x += 6) {
      const u = x / W;
      sx.lineTo(x, base - amp * (0.55 * Math.sin(u * k + ph) + 0.3 * Math.sin(u * k * 2.1 + ph * 1.7) + 0.15 * Math.sin(u * k * 4.7 + ph * 0.6)));
    }
    sx.lineTo(W, H); sx.closePath(); sx.fillStyle = col; sx.fill();
  }
  function drawSky(ts) {
    if (!sx) return;
    const s = state(tNow), hy = H * 0.8;
    sx.setTransform(SR, 0, 0, SR, 0, 0);
    sx.globalCompositeOperation = 'source-over';
    const g = sx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(s.top)); g.addColorStop(0.5, rgba(s.mid)); g.addColorStop(0.8, rgba(s.hor)); g.addColorStop(1, rgba(s.hor));
    sx.fillStyle = g; sx.fillRect(0, 0, W, H);
    /* звёзды */
    if (s.st > 0.02) {
      const sec = ts / 1000;
      for (let i = 0; i < stars.length; i++) {
        const q = stars[i], a = s.st * (reduce ? 0.8 : 0.55 + 0.45 * Math.sin(sec * q.sp + q.ph)) * Math.sqrt(Math.max(0, 1 - q.y / 0.8));
        if (a < 0.03) continue;
        sx.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
        sx.fillRect(q.x * W, q.y * H, q.r, q.r);
      }
    }
    /* солнце */
    const sp = (tNow - 5.5) / 14;
    if (sp > -0.05 && sp < 1.05) {
      const e = Math.sin(sp * Math.PI), x = W * (0.1 + 0.8 * clamp(sp, 0, 1)), y = hy - e * hy * 0.82;
      const col = mix([255, 170, 90], [255, 248, 225], clamp(e * 1.6, 0, 1)), gr = Math.max(W, H) * (0.55 - 0.15 * clamp(e, 0, 1));
      sx.globalCompositeOperation = 'screen';
      const gg = sx.createRadialGradient(x, y, 0, x, y, gr);
      gg.addColorStop(0, rgba(col, 0.6)); gg.addColorStop(0.12, rgba(col, 0.25)); gg.addColorStop(1, rgba(col, 0));
      sx.fillStyle = gg; sx.fillRect(0, 0, W, H);
      const r = Math.min(W, H) * 0.045, dg = sx.createRadialGradient(x, y, 0, x, y, r);
      dg.addColorStop(0, 'rgba(255,255,255,1)'); dg.addColorStop(0.7, rgba(col, 1)); dg.addColorStop(1, rgba(col, 0));
      sx.fillStyle = dg; sx.beginPath(); sx.arc(x, y, r, 0, 6.2832); sx.fill();
      sx.globalCompositeOperation = 'source-over';
    }
    /* луна */
    const q = (((tNow - 19) % 24) + 24) % 24 / 12;
    if (q < 1) {
      const e = Math.sin(q * Math.PI), x = W * (0.1 + 0.8 * q), y = hy - e * hy * 0.78, r = Math.min(W, H) * 0.05;
      const al = Math.pow(e, 0.35) * (0.3 + 0.7 * clamp(s.st * 1.5, 0, 1));
      sx.globalCompositeOperation = 'screen';
      const mg = sx.createRadialGradient(x, y, r * 0.5, x, y, r * 7);
      mg.addColorStop(0, 'rgba(190,210,255,' + (0.35 * al).toFixed(3) + ')'); mg.addColorStop(1, 'rgba(190,210,255,0)');
      sx.fillStyle = mg; sx.fillRect(0, 0, W, H);
      sx.globalCompositeOperation = 'source-over';
      sx.globalAlpha = al;
      const dg = sx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      dg.addColorStop(0, '#fffdf2'); dg.addColorStop(1, '#cfd3dc');
      sx.fillStyle = dg; sx.beginPath(); sx.arc(x, y, r, 0, 6.2832); sx.fill();
      sx.fillStyle = 'rgba(120,125,140,.16)';
      [[-.35, -.1, .22], [.25, .2, .3], [.1, -.4, .14], [-.2, .4, .16]].forEach(c => { sx.beginPath(); sx.arc(x + c[0] * r, y + c[1] * r, c[2] * r, 0, 6.2832); sx.fill(); });
      sx.globalAlpha = 1;
    }
    /* дальние и ближние холмы в дымке */
    ridge(hy, H * 0.035, 5, 0.6, rgba(mix(s.hor, s.top, 0.4)));
    ridge(hy + H * 0.04, H * 0.04, 3.4, 2.1, rgba(mix(s.hor, [8, 16, 30], 0.62)));
  }

  /* ---------- Рисуем облака ---------- */
  function genCloud(L, cw, rnd) {
    const n = L.p0 + Math.floor(rnd() * (L.p1 - L.p0 + 1)), ps = [], k = L.sq / 0.8;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, hp = Math.pow(Math.sin(u * Math.PI), 0.8);
      ps.push({ dx: (u - 0.5) * cw, dy: (-hp * cw * 0.06 * (0.4 + rnd()) + (rnd() - 0.5) * cw * 0.02) * k, r: cw * (0.07 + 0.13 * hp) * (0.8 + 0.45 * rnd()) });
    }
    const tops = 2 + Math.floor(rnd() * 2);
    for (let j = 0; j < tops; j++) ps.push({ dx: (rnd() - 0.5) * cw * 0.45, dy: -cw * (0.07 + rnd() * 0.07) * k, r: cw * (0.09 + 0.06 * rnd()) });
    return ps;
  }
  function paintCloud(ctx, x, y, ps, L, lt, sh) {
    const A = L.a;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, L.sq);
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i], cy = p.dy + p.r * 0.3, g = ctx.createRadialGradient(p.dx, cy, p.r * 0.1, p.dx, cy, p.r);
      g.addColorStop(0, rgba(sh, A)); g.addColorStop(0.6, rgba(sh, A * 0.7)); g.addColorStop(1, rgba(sh, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.dx, cy, p.r, 0, 6.2832); ctx.fill();
    }
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i], cx = p.dx - p.r * 0.18, cy = p.dy - p.r * 0.22, r = p.r * 0.88, g = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
      g.addColorStop(0, rgba(lt, A)); g.addColorStop(0.55, rgba(lt, A * 0.8)); g.addColorStop(1, rgba(lt, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.fill();
    }
    ctx.restore();
  }
  function sig(s) { return s.lt.concat(s.sh); }
  function buildClouds() {
    if (!root || !lays.length) return;
    const s = state(tNow), cw0 = Math.min(W, 820);
    lastSig = sig(s);
    LAYERS.forEach((L, i) => {
      const c = lays[i], ctx = c.ctx;
      c.cv.width = Math.max(2, Math.round(2 * W * LR)); c.cv.height = Math.max(2, Math.round(H * LR));
      c.cv.style.width = (2 * W) + 'px'; c.cv.style.height = H + 'px';
      ctx.setTransform(LR, 0, 0, LR, 0, 0); ctx.clearRect(0, 0, 2 * W, H);
      const rnd = rng(1337 + i * 101), n = Math.round(L.n * st.clouds * 2);
      for (let j = 0; j < n; j++) {
        const x = rnd() * W, y = H * (L.y0 + rnd() * (L.y1 - L.y0)), cw = cw0 * (L.s0 + rnd() * (L.s1 - L.s0)), ps = genCloud(L, cw, rnd);
        for (let k = -1; k <= 2; k++) paintCloud(ctx, x + k * W, y, ps, L, s.lt, s.sh);
      }
    });
  }

  /* ---------- Каркас на странице ---------- */
  function mount() {
    if (!document.body) return;
    W = window.innerWidth; H = window.innerHeight;
    SR = Math.min(1, 900 / Math.max(W, H));
    if (!root) {
      root = document.createElement('div'); root.id = 'a51-sky'; root.setAttribute('aria-hidden', 'true');
      root.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:-1;overflow:hidden;pointer-events:none';
      sc = document.createElement('canvas'); sc.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
      root.appendChild(sc); sx = sc.getContext('2d'); lays = [];
      for (let i = 0; i < LAYERS.length; i++) {
        const cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;left:0;top:0;will-change:transform';
        root.appendChild(cv); lays.push({ cv: cv, ctx: cv.getContext('2d') });
      }
      document.body.insertBefore(root, document.body.firstChild);
      const rs = rng(77); stars = [];
      for (let i = 0; i < 160; i++) stars.push({ x: rs(), y: rs() * 0.72, r: 0.8 + rs() * 1.3, ph: rs() * 6.28, sp: 1 + rs() * 2.5 });
    }
    sc.width = Math.max(2, Math.round(W * SR)); sc.height = Math.max(2, Math.round(H * SR));
    tNow = clock(); drawSky(performance.now()); buildClouds(); setTint();
  }
  function setTint() {
    const m = state(tNow).mid, l = (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255;
    document.documentElement.style.setProperty('--sky-tint', (0.10 + 0.24 * clamp(l / 0.6, 0, 1)).toFixed(2));
  }
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (ts - last) / 1000); last = ts;
    if (!reduce && W) {
      for (let i = 0; i < lays.length; i++) {
        offs[i] += (4 + 26 * st.wind) * LAYERS[i].v * dt;
        lays[i].cv.style.transform = 'translate3d(' + ((offs[i] % W) - W).toFixed(1) + 'px,0,0)';
      }
    }
    const twinkle = !reduce && state(tNow).st > 0.02;
    if (ts - lastSky > (twinkle ? 120 : 1000)) {
      lastSky = ts; tNow = clock(); drawSky(ts); setTint();
      const cur = sig(state(tNow));
      if (lastSig && cur.reduce((a, v, i) => a + Math.abs(v - lastSig[i]), 0) > 8) buildClouds();
    }
  }
  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
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
    if (root) { root.remove(); root = sc = sx = null; lays = []; lastSig = null; }
  }

  /* ---------- Публичный интерфейс ---------- */
  function stored() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function get() { return Object.assign({}, st); }
  function set(p) {
    const was = st.on;
    st = validate(Object.assign({}, st, p || {}));
    if (st.on && !was) enable();
    else if (!st.on && was) disable();
    else if (st.on) { setCss(); if (root) { tNow = clock(); drawSky(performance.now()); buildClouds(); setTint(); } }
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
