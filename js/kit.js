/* UI kit сайта: тема = JSON с жёстким списком полей. Тема меняет только ЦВЕТА, скругления,
   шрифт и обои: раскладку, видимость и работу кнопок и виджета она изменить не может.
   Если цвета нечитаемы, сайт сам подбирает читаемый вариант (в сохранённом JSON ничего не меняется). */
window.KIT = (function () {
  const KEY = 'a51.kit', MAXWP = 260000;
  const FONTS = {
    default: 'sans-serif',
    rounded: '"Trebuchet MS","Segoe UI",system-ui,sans-serif',
    serif: 'Georgia,"Times New Roman",serif',
    mono: 'ui-monospace,Menlo,Consolas,monospace',
    display: '"Rajdhani","Trebuchet MS",system-ui,sans-serif'
  };
  const FONT_LABELS = { default: 'Обычный', rounded: 'Округлый', serif: 'С засечками', mono: 'Моноширинный', display: 'Заголовочный (Rajdhani)' };
  const COLORS = ['accent', 'accent2', 'text', 'textSoft', 'panel', 'panelHi', 'page'];
  const KEYS = ['schema', 'name', 'colors', 'glow', 'radius', 'font', 'wallpaper', 'dim'];
  const DEF = {
    schema: 'a51-theme-1', name: 'Фиолетовый неон',
    colors: { accent: '#a066ff', accent2: '#5cf2c8', text: '#e2daf0', textSoft: '#bcaada', panel: '#14101c', panelHi: '#201830', page: '#0b090f' },
    glow: 0.5, radius: 14, font: 'default', wallpaper: '', dim: 0.24
  };
  const mk = (name, colors, glow, radius, font) => ({ schema: 'a51-theme-1', name: name, colors: colors, glow: glow, radius: radius, font: font, wallpaper: '', dim: 0.24 });
  const PRESETS = {
    'Фиолетовый неон': DEF,
    'Розовая пастель': mk('Розовая пастель', { accent: '#ff7ac6', accent2: '#7af0d6', text: '#fff5fa', textSoft: '#f3cfe3', panel: '#2a1424', panelHi: '#3d1b34', page: '#1a0d17' }, 0.6, 18, 'rounded'),
    'Аниме-пастель': mk('Аниме-пастель', { accent: '#8ab4ff', accent2: '#ffb3d9', text: '#f4f7ff', textSoft: '#cfd9f5', panel: '#1a2038', panelHi: '#26305a', page: '#10152b' }, 0.5, 20, 'rounded'),
    'Лисья': mk('Лисья', { accent: '#ff9a3c', accent2: '#ffd27a', text: '#fff4e6', textSoft: '#e8c9a8', panel: '#2b1a0e', panelHi: '#3d2512', page: '#190e07' }, 0.4, 12, 'serif')
  };
  const clone = o => JSON.parse(JSON.stringify(o));
  const hex = v => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v.trim())) ? v.trim().toLowerCase() : null;
  const num = (v, a, b) => (v !== '' && v !== null && typeof v !== 'object' && isFinite(+v)) ? Math.min(b, Math.max(a, +v)) : null;
  const rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)).join(',');
  const dark = h => '#' + [1, 3, 5].map(i => Math.round(parseInt(h.substr(i, 2), 16) * 0.45).toString(16).padStart(2, '0')).join('');
  const lum = h => { const v = [1, 3, 5].map(i => { const x = parseInt(h.substr(i, 2), 16) / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  /* если цвет плохо читается на фонах, берём белый или почти чёрный */
  const ensure = (fg, bgs, min) => bgs.every(b => ratio(fg, b) >= min) ? fg : (bgs.every(b => ratio('#ffffff', b) >= min) ? '#ffffff' : '#111111');

  /* Проверка: берём только известные поля с допустимыми значениями, остальное отбрасываем */
  function validate(raw) {
    const k = clone(DEF), err = [];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { kit: k, errors: ['Тема должна быть JSON-объектом.'] };
    Object.keys(raw).forEach(x => { if (KEYS.indexOf(x) < 0) err.push('Неизвестное поле «' + String(x).slice(0, 30) + '» пропущено.'); });
    if (raw.schema !== undefined && raw.schema !== 'a51-theme-1') err.push('Неизвестная версия схемы, читаю как a51-theme-1.');
    if (typeof raw.name === 'string') k.name = raw.name.replace(/[^\p{L}\p{N} _.\-]/gu, '').slice(0, 40) || k.name;
    if (raw.colors && typeof raw.colors === 'object' && !Array.isArray(raw.colors)) {
      COLORS.forEach(c => { if (c in raw.colors) { const h = hex(raw.colors[c]); if (h) k.colors[c] = h; else err.push('Цвет «' + c + '»: нужен формат #rrggbb.'); } });
      Object.keys(raw.colors).forEach(c => { if (COLORS.indexOf(c) < 0) err.push('Неизвестный цвет «' + String(c).slice(0, 30) + '» пропущен.'); });
    } else if (raw.colors !== undefined) err.push('Поле «colors» должно быть объектом.');
    [['glow', 0, 1], ['radius', 0, 24], ['dim', 0.05, 1]].forEach(q => {
      if (raw[q[0]] !== undefined) { const n = num(raw[q[0]], q[1], q[2]); if (n === null) err.push('Поле «' + q[0] + '»: нужно число.'); else k[q[0]] = n; }
    });
    if (raw.font !== undefined) { if (typeof raw.font === 'string' && FONTS[raw.font]) k.font = raw.font; else err.push('Шрифт: один из ' + Object.keys(FONTS).join(', ') + '.'); }
    if (raw.wallpaper !== undefined && raw.wallpaper !== '') {
      const w = raw.wallpaper;
      if (typeof w === 'string' && w.length <= MAXWP && /^data:image\/(png|jpeg|webp|avif|gif);base64,[A-Za-z0-9+\/=]+$/.test(w)) k.wallpaper = w;
      else err.push('Обои: нужна встроенная картинка (data:image/…;base64) до ~190 КБ. Внешние ссылки запрещены.');
    }
    return { kit: k, errors: err };
  }

  /* CSS строится только из проверенных значений и трогает лишь цвета, скругления, шрифт и обои */
  function css(k) {
    const c = k.colors, A = rgb(c.accent), B = rgb(c.accent2), g = k.glow, r = k.radius;
    const W = 'html body .wrapper', X = ':not(.ed-card *)', E = W + ' .ed-card', G = 'html body ';
    const gl = n => (n * g).toFixed(1) + 'px', sh = n => (n * g).toFixed(2);
    const D = dark(c.page), bgs = [c.page, c.panel, c.panelHi];
    const T = ensure(c.text, bgs, 4.5), TS = ensure(c.textSoft, bgs, 3.5), AC = ensure(c.accent, bgs, 3), AW = ensure(c.accent, [D], 3);
    const ff = k.font !== 'default' ? 'font-family:' + FONTS[k.font] + '!important;' : '';
    let s = ':root{--neon:' + AC + ';--neon-soft:rgba(' + A + ',.35);--neon-line:rgba(' + A + ',.25);--ink:' + T + ';--ink-soft:' + TS + ';--panel:' + c.panel + ';--panel-hi:' + c.panelHi + ';--accent:' + c.accent2 + '}';
    s += ':root,html body{background-color:' + D + '!important}';
    /* содержимое страниц */
    s += W + '{background-color:' + c.page + '!important;color:' + T + '!important;border-radius:' + Math.min(r, 24) + 'px!important;box-shadow:0 0 ' + gl(40) + ' rgba(' + A + ',' + sh(0.8) + '),0 0 ' + gl(10) + ' rgba(' + A + ',' + sh(0.4) + ')!important}';
    s += W + ' a' + X + '{color:' + AC + '!important;text-shadow:0 0 ' + gl(5) + ' rgba(' + A + ',' + sh(0.6) + ')}';
    s += ['h1', 'h2', 'h3', 'h4'].map(t => W + ' ' + t + X).join(',') + '{color:' + T + '!important;' + ff + 'text-shadow:0 0 ' + gl(14) + ' rgba(' + A + ',' + sh(1) + ')!important}';
    s += W + ' p' + X + ',' + W + ' li' + X + '{color:' + T + '!important;' + ff + '}';
    s += [' .card-text p', ' .item-card p', ' h1+p em'].map(t => W + t + X).join(',') + '{color:' + TS + '!important}';
    const card = W + ' .main-sector-card' + X + ',' + W + ' .item-card' + X;
    s += card + '{background:linear-gradient(160deg,' + c.panelHi + ',' + c.panel + ')!important;border-color:rgba(' + A + ',.4)!important;border-radius:' + r + 'px!important;box-shadow:0 8px 26px rgba(0,0,0,.55),0 0 ' + gl(18) + ' rgba(' + A + ',' + sh(0.25) + ')!important}';
    s += W + ' .main-sector-card' + X + ':hover,' + W + ' .item-card' + X + ':hover{border-color:' + AC + '!important}';
    s += W + ' img:not(footer img)' + X + '{border-color:rgba(' + A + ',.7)!important;border-radius:' + Math.min(r, 18) + 'px!important;box-shadow:0 0 ' + gl(14) + ' rgba(' + A + ',' + sh(0.38) + '),0 6px 14px rgba(0,0,0,.6)!important}';
    s += W + ' hr{background:linear-gradient(90deg,transparent,' + c.accent + ',transparent)!important;box-shadow:0 0 ' + gl(10) + ' ' + c.accent + '!important}';
    s += W + ' .stat' + X + '{color:' + c.accent2 + '!important;text-shadow:0 0 6px rgba(' + B + ',.35)!important}';
    s += W + ' .badge' + X + '{color:' + T + '!important;background:rgba(' + A + ',.18)!important;border-color:rgba(' + A + ',.5)!important}';
    s += W + ' footer{border-top-color:rgba(' + A + ',.2)!important}';
    s += W + ' #svgContainer text{fill:' + TS + '!important}';
    /* кнопки «На Главную» и переключатель языков */
    s += W + ' .lang-btn' + X + '{background:rgba(' + A + ',.1)!important;border-color:rgba(' + A + ',.4)!important;color:' + T + '!important;border-radius:' + Math.min(r, 14) + 'px!important}';
    s += W + ' .lang-btn' + X + ':hover{background:rgba(' + A + ',.3)!important;border-color:' + AC + '!important;box-shadow:0 0 ' + gl(10) + ' rgba(' + A + ',.45)!important}';
    /* карточки настроек и редакторов */
    s += E + '{background:linear-gradient(160deg,' + c.panelHi + ',' + c.panel + ')!important;border-color:rgba(' + A + ',.3)!important;border-radius:' + r + 'px!important;color:' + T + '!important}';
    s += E + ' h3{color:' + T + '!important;text-shadow:0 0 ' + gl(8) + ' rgba(' + A + ',.6)!important}';
    s += E + ' label,' + E + ' .hint,' + E + ' .tx{color:' + TS + '!important}';
    s += ['input[type=text]', 'input[type=password]', 'input[type=number]', 'select', 'textarea'].map(t => E + ' ' + t).join(',') + '{background:' + dark(c.panel) + '!important;color:' + T + '!important;border-color:rgba(' + A + ',.4)!important}';
    s += E + ' .ed-btn{background:rgba(' + A + ',.12)!important;border-color:rgba(' + A + ',.45)!important;color:' + T + '!important}';
    s += E + ' .ed-btn.on{background:rgba(' + A + ',.45)!important}';
    s += E + ' .layer,' + E + ' .jr{border-color:rgba(' + A + ',.25)!important}';
    s += E + ' .layer.sel{border-color:' + AC + '!important;background:rgba(' + A + ',.18)!important}';
    s += E + ' .jr a{color:' + AC + '!important}';
    /* виджет с кнопками: только цвета */
    s += G + '#widget-trigger-btn{background:' + D + '!important;border-color:' + AW + '!important;color:' + AW + '!important;box-shadow:0 0 ' + gl(12) + ' rgba(' + A + ',.4)!important}';
    s += G + '#widget-trigger-btn.active{background:' + AW + '!important;color:' + D + '!important;box-shadow:0 0 ' + gl(20) + ' ' + AW + '!important}';
    s += G + '#neo-panel-widget{background:rgba(' + rgb(c.page) + ',.95)!important;border-color:rgba(' + A + ',.6)!important;box-shadow:0 0 ' + gl(20) + ' rgba(' + A + ',.3)!important}';
    s += G + '#neo-panel-widget .widget-status{color:' + TS + '!important}';
    const wb = ['#widget-zoom-btn', '#widget-search-btn', '#widget-experimental-btn'].map(i => G + i).join(',');
    s += wb + '{background:' + D + '!important;border-color:' + AW + '!important;color:' + AW + '!important;box-shadow:0 0 ' + gl(8) + ' rgba(' + A + ',.2)!important}';
    s += ['#widget-zoom-btn.active', '#widget-search-btn.active'].map(i => G + i).join(',') + '{background:' + AW + '!important;color:' + D + '!important}';
    s += ['#widget-search-btn:hover', '#widget-experimental-btn:hover'].map(i => G + i).join(',') + '{background:rgba(' + A + ',.2)!important}';
    s += G + 'body.text-zoom-mode .wrapper .zoomed-active{text-shadow:0 0 ' + gl(20) + ' ' + c.accent + '!important}';
    if (k.wallpaper) s += 'html body::before{background-image:url("' + k.wallpaper + '")!important;filter:brightness(' + k.dim + ') contrast(1.1) saturate(1.1)!important}';
    return s;
  }

  function apply(k) {
    let st = document.getElementById('a51-kit');
    if (!st) { st = document.createElement('style'); st.id = 'a51-kit'; (document.head || document.documentElement).appendChild(st); }
    st.textContent = css(k);
  }
  function remove() { const st = document.getElementById('a51-kit'); if (st) st.remove(); }
  function stored() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function save(k) { try { localStorage.setItem(KEY, JSON.stringify(k)); return true; } catch (e) { return false; } }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} remove(); }

  /* Загрузка при открытии любой страницы; ?theme=off отключает тему */
  if (!/[?&](theme|kit)=off\b/.test(location.search)) { const raw = stored(); if (raw) apply(validate(raw).kit); }

  return { DEF: DEF, PRESETS: PRESETS, FONTS: FONTS, FONT_LABELS: FONT_LABELS, MAXWP: MAXWP, validate: validate, apply: apply, remove: remove, stored: stored, save: save, reset: reset, clone: clone };
})();
