(function () {
  window.__sent = window.__sent || [];
  if (!window.__hooked) {
    window.__hooked = true;
    var rec = function (s) { window.__sent.push(s); };
    var of = window.fetch;
    window.fetch = function (u, o) {
      var m = ((o && o.method) || 'GET').toUpperCase();
      if (m !== 'GET' && m !== 'HEAD') { rec('fetch ' + m + ' ' + u); return Promise.resolve(new Response('{}', { status: 200 })); }
      return of.apply(this, arguments);
    };
    var xo = XMLHttpRequest.prototype.open, xs = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (m, u) { this.__m = String(m).toUpperCase(); this.__u = u; return xo.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function () {
      if (this.__m && this.__m !== 'GET') { rec('xhr ' + this.__m + ' ' + this.__u); return; }
      return xs.apply(this, arguments);
    };
    navigator.sendBeacon = function (u) { rec('beacon ' + u); return true; };
    window.open = function (u) { rec('open ' + String(u).slice(0, 80)); return null; };
  }
  window.__act = function (onlyVisible) {
    var vis = function (el) {
      var cs = getComputedStyle(el), r = el.getBoundingClientRect();
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
      if (r.width < 2 || r.height < 2) return false;
      if (r.right < 0 || r.bottom < 0 || r.left > innerWidth * 2) return false;
      if (el.getAttribute('aria-hidden') === 'true' || el.tabIndex === -1) return false;
      return true;
    };
    var guess = function (el) {
      var s = ((el.name || '') + ' ' + (el.id || '') + ' ' + (el.placeholder || '') + ' ' + (el.type || '')).toLowerCase();
      if (/mail/.test(s)) return 'bot@example.com';
      if (/url|site|web|link/.test(s)) return 'http://example.com';
      if (/tel|phone/.test(s)) return '+10000000000';
      return 'Automated test message';
    };
    var fields = Array.prototype.slice.call(document.querySelectorAll('input,textarea,select')).filter(function (e) { return !/^(hidden|submit|button|reset|image|file)$/.test(e.type); });
    var filled = [], skipped = 0;
    fields.forEach(function (el) {
      if (onlyVisible && !vis(el)) { skipped++; return; }
      if (el.tagName === 'SELECT') { el.selectedIndex = el.options.length - 1; }
      else if (el.type === 'checkbox' || el.type === 'radio') { el.checked = true; }
      else {
        var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, guess(el));
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      filled.push(el);
    });
    var box = filled[0] ? filled[0].parentElement : document.body;
    while (box !== document.body && !filled.every(function (f) { return box.contains(f); })) box = box.parentElement;
    var btns = Array.prototype.slice.call(box.querySelectorAll('button,input[type=submit],[role=button]'));
    btns.forEach(function (b) { b.click(); });
    return { filled: filled.length, skipped: skipped, btns: btns.length };
  };
})();
