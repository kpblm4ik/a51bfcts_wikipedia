/* Встраиваемый режим редактора обложек: editor.html?embed=1 внутри new-page.html.
   Подключается ПОСЛЕ основного скрипта editor.html и использует его глобальные G, EDITORS, activeTab, openCover. */
(function () {
  if (!/[?&]embed=1/.test(location.search) || window.parent === window || window.__embedInit) return;
  window.__embedInit = 1;
  var root = document.documentElement;
  root.classList.add('embed');

  var st = document.createElement('style');
  st.textContent =
    'html.embed,html.embed body{padding:0!important;min-height:0!important;background:transparent!important}' +
    'html.embed body::before{display:none!important}' +
    'html.embed .wrapper{max-width:none!important;padding:0!important;box-shadow:none!important;background:transparent!important}' +
    'html.embed .wrapper>h1,html.embed .wrapper>p,html.embed footer,html.embed .embed-hide{display:none!important}' +
    'html.embed body>:not(.wrapper):not(script){display:none!important}';
  document.head.appendChild(st);

  /* в встроенном виде не нужны блоки «Открыть готовую» и «Залить в репозиторий»: этим занимается new-page */
  ['ldName', 'up'].forEach(function (id) {
    var el = G(id), card = el && el.closest('.ed-card');
    if (card) card.classList.add('embed-hide');
  });

  var origin = location.origin;
  function reply(msg) { parent.postMessage(msg, origin); }

  addEventListener('message', function (e) {
    if (e.origin !== origin || e.source !== parent) return;
    var d = e.data || {};
    try {
      if (d.t === 'get') {
        var ed = EDITORS[activeTab], wait = ed.ready ? ed.ready() : '';
        if (wait) throw new Error(wait);
        reply({ t: 'svg', id: d.id, svg: ed.build(), kind: activeTab });
      } else if (d.t === 'open') {
        reply({ t: 'opened', id: d.id, kind: openCover(String(d.svg || ''), '') });
      }
    } catch (err) {
      reply({ t: 'error', id: d.id, msg: String(err && err.message || err) });
    }
  });

  var last = 0;
  function sendH() {
    var h = Math.ceil(root.getBoundingClientRect().height);
    if (h !== last) { last = h; reply({ t: 'height', h: h }); }
  }
  new ResizeObserver(sendH).observe(root);
  reply({ t: 'ready' });
  sendH();
})();
