/* Автоконтраст: если цвет текста почти совпадает с цветом фона под ним, текст сам становится
   белым или тёмным (что читаемее). Работает на всех страницах и после смены темы (kit.js).
   Фоны-картинки и градиенты не трогаем: цвет под ними неизвестен. */
(function () {
  var SEL = '.wrapper *,.home *,footer *', MIN = 3.2, timer;
  function parse(c) {
    var m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    var p = m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat);
    if (p.length < 3 || p.some(isNaN)) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function lum(c) {
    var v = [c.r, c.g, c.b].map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function bgOf(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      var b = parse(cs.backgroundColor);
      if (b && b.a >= 0.6) return b;
    }
    return parse(getComputedStyle(document.body).backgroundColor);
  }
  function hasText(el) {
    for (var i = 0; i < el.childNodes.length; i++) { var n = el.childNodes[i]; if (n.nodeType === 3 && n.nodeValue.trim()) return true; }
    return false;
  }
  function run() {
    var list = document.querySelectorAll(SEL), n = Math.min(list.length, 2500);
    for (var i = 0; i < n; i++) {
      var el = list[i];
      if (el.getAttribute('data-ac')) { el.style.removeProperty('color'); el.removeAttribute('data-ac'); }
    }
    for (i = 0; i < n; i++) {
      el = list[i];
      if (!hasText(el)) continue;
      var fg = parse(getComputedStyle(el).color), bg = bgOf(el);
      if (!fg || !bg || fg.a < 0.3) continue;
      if (ratio(fg, bg) >= MIN) continue;
      var white = { r: 255, g: 255, b: 255 }, black = { r: 17, g: 17, b: 17 };
      el.style.setProperty('color', ratio(white, bg) >= ratio(black, bg) ? '#ffffff' : '#111111', 'important');
      el.setAttribute('data-ac', '1');
    }
  }
  function later() { clearTimeout(timer); timer = setTimeout(run, 120); }
  function start() {
    run(); setTimeout(run, 600); setTimeout(run, 2000);
    window.addEventListener('load', later);
    new MutationObserver(later).observe(document.head, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', later);
  }
  window.A51Contrast = { run: run };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
