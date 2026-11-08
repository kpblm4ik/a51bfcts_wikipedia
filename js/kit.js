/* UI kit сайта: тема = JSON с жёстким списком полей. Тема действует как «обои»:
   она красит только .wrapper (содержимое страниц) и фон. Виджет, баннер и всё внутри
   .ed-card (редакторы, настройки, страница тем) остаются нетронутыми. */
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

  /* CSS строится только из проверенных значений и касается лишь .wrapper и фона */
  function css(k) {
    const c = k.colors, A = rgb(c.accent), B = rgb(c.accent2), g = k.glow, r = k.radius;
    const W = 'html body .wrapper', X = ':not(.ed-card *)';
    const gl = n => (n * g).toFixed(1) + 'px', sh = n => (n * g).toFixed(2);
    const ff = k.font !== 'default' ? 'font-family:' + FONTS[k.font] + '!important;' : '';
    let s = ':root,html body{background-color:' + dark(c.page) + '!important}';
    s += W + '{background-color:' + c.page + '!important;color:' + c.text + '!important;border-radius:' + Math.min(r, 24) + 'px!important;box-shadow:0 0 ' + gl(40) + ' rgba(' + A + ',' + sh(0.8) + '),0 0 ' + gl(10) + ' rgba(' + A + ',' + sh(0.4) + ')!important}';
    s += W + ' a' + X + '{color:' + c.accent + '!important;text-shadow:0 0 ' + gl(5) + ' rgba(' + A + ',' + sh(0.6) + ')}';
    s += ['h1', 'h2', 'h3', 'h4'].map(t => W + ' ' + t + X).join(',') + '{color:' + c.text + '!important;' + ff + 'text-shadow:0 0 ' + gl(14) + ' rgba(' + A + ',' + sh(1) + ')!important}';
    s += W + ' p' + X + ',' + W + ' li' + X + '{color:' + c.text + '!important;' + ff + '}';
    s += [' .card-text p', ' .item-card p', ' h1+p em'].map(t => W + t + X).join(',') + '{color:' + c.textSoft + '!important}';
    const card = W + ' .main-sector-card' + X + ',' + W + ' .item-card' + X;
    s += card + '{background:linear-gradient(160deg,' + c.panelHi + ',' + c.panel + ')!important;border-color:rgba(' + A + ',.4)!important;border-radius:' + r + 'px!important;box-shadow:0 8px 26px rgba(0,0,0,.55),0 0 ' + gl(18) + ' rgba(' + A + ',' + sh(0.25) + ')!important}';
    s += W + ' .main-sector-card' + X + ':hover,' + W + ' .item-card' + X + ':hover{border-color:' + c.accent + '!important}';
    s += W + ' img:not(footer img)' + X + '{border-color:rgba(' + A + ',.7)!important;border-radius:' + Math.min(r, 18) + 'px!important;box-shadow:0 0 ' + gl(14) + ' rgba(' + A + ',' + sh(0.38) + '),0 6px 14px rgba(0,0,0,.6)!important}';
    s += W + ' hr{background:linear-gradient(90deg,transparent,' + c.accent + ',transparent)!important;box-shadow:0 0 ' + gl(10) + ' ' + c.accent + '!important}';
    s += W + ' .stat' + X + '{color:' + c.accent2 + '!important;text-shadow:0 0 6px rgba(' + B + ',.35)!important}';
    s += W + ' footer{border-top-color:rgba(' + A + ',.2)!important}';
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

  /* Ссылка на страницу тем из экспериментальных функций */
  document.addEventListener('DOMContentLoaded', () => {
    if (/experimental(\.html)?$/.test(location.pathname)) {
      const h = document.querySelector('.wrapper h1');
      if (h) { const p = document.createElement('p'); p.className = 'hint'; p.innerHTML = '<a href="kit.html">🎨 Темы и UI kit</a>'; h.after(p); }
    }
  });

  return { DEF: DEF, PRESETS: PRESETS, FONTS: FONTS, FONT_LABELS: FONT_LABELS, MAXWP: MAXWP, validate: validate, apply: apply, remove: remove, stored: stored, save: save, reset: reset, clone: clone };
})();
