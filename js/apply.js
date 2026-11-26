/* Страницы «Работа» (work.html) и «Реклама» (ads.html): форма прямо на странице.
   Если в _config.yml задан forms_endpoint, заявка уходит туда (JSON). Иначе открывается готовый GitHub Issue.
   Защита от ботов: honeypot (невидимое поле website) + ловушка по времени (быстрее 2.5 с с момента загрузки).
   Боту показывается «успех», но ничего не отправляется. Тест: tools/bot-test.js */
(function () {
  'use strict';
  var OWNER = 'kpblm4ik', REPO = 'a51bfcts_wikipedia', EP = window.A51_FORMS_ENDPOINT || '';
  var MIN_MS = 2500, T0 = Date.now();
  var FORMS = {
    work: { tag: 'Работа', f: [
      ['name', 'Имя или ник', 'text', 1], ['contact', 'Контакт (Telegram / Discord)', 'text', 1],
      ['role', 'Роль', ['Редактор страниц', 'Датамайнер', 'Переводчик', 'Разработчик', 'Другое'], 1],
      ['about', 'О себе', 'textarea', 1], ['links', 'Ссылки на работы', 'text', 0]] },
    ads: { tag: 'Реклама', f: [
      ['name', 'Компания или имя', 'text', 1], ['contact', 'Контакт (Telegram / e-mail)', 'text', 1],
      ['format', 'Формат', ['Баннер', 'Пост / интеграция', 'Спонсорство', 'Другое'], 1],
      ['budget', 'Бюджет и сроки', 'text', 0], ['about', 'Что рекламируем', 'textarea', 1]] }
  };
  var css = document.createElement('style');
  css.textContent = '.ap-form{max-width:640px;margin:24px auto}.ap-f{margin:0 0 14px}.ap-f label{display:block;font-size:14px;margin:0 0 6px;opacity:.8}' +
    '.ap-f input,.ap-f select,.ap-f textarea{width:100%;box-sizing:border-box;padding:12px 14px;font:inherit;color:inherit;background:transparent;border:1px solid rgba(128,128,128,.45);border-radius:12px}' +
    '.ap-hp{position:absolute!important;left:-9999px!important;top:auto!important;width:1px!important;height:1px!important;opacity:0!important;overflow:hidden!important;pointer-events:none!important}' +
    '.ap-btn{font:inherit;font-weight:600;padding:12px 24px;border-radius:980px;border:0;cursor:pointer;background:#0071e3;color:#fff}.ap-btn:disabled{opacity:.5}' +
    '.ap-note{font-size:13px;opacity:.7;margin:8px 0 16px}.ap-msg{margin:12px 0 0;font-size:15px}.ap-msg.err{color:#d93025}.ap-msg.ok{color:#1e8e3e}';
  document.head.appendChild(css);
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }

  var root = document.getElementById('apply-form'); if (!root) return;
  var F = FORMS[root.getAttribute('data-form')]; if (!F) return;
  var box = el('div', 'ap-form'), inputs = {};
  F.f.forEach(function (d) {
    var w = el('div', 'ap-f'); w.appendChild(el('label', '', d[1] + (d[3] ? ' *' : '')));
    var i;
    if (Array.isArray(d[2])) { i = el('select'); d[2].forEach(function (o) { i.appendChild(el('option', '', o)); }); }
    else if (d[2] === 'textarea') { i = el('textarea'); i.rows = 5; }
    else { i = el('input'); i.type = 'text'; }
    i.maxLength = 600; w.appendChild(i); box.appendChild(w); inputs[d[0]] = i;
  });
  /* honeypot: человек не видит поле, бот заполняет его */
  var hp = el('input', 'ap-hp'); hp.type = 'text'; hp.name = 'website'; hp.id = 'ap-website'; hp.tabIndex = -1; hp.autocomplete = 'off'; hp.setAttribute('aria-hidden', 'true'); box.appendChild(hp);
  box.appendChild(el('p', 'ap-note', EP ? 'Заявку увидят только разработчики.' : 'Заявка откроется как GitHub Issue и будет публичной: не пиши личные данные, достаточно ника в Telegram.'));
  var m = el('p', 'ap-msg'), go = el('button', 'ap-btn', 'Отправить'); go.type = 'button';
  go.onclick = function () {
    if (hp.value || Date.now() - T0 < MIN_MS) { /* бот: делаем вид успеха, ничего не отправляем */
      go.disabled = true; m.className = 'ap-msg ok'; m.textContent = 'Спасибо! Заявка отправлена.'; return;
    }
    var data = {}, lines = [], bad = false;
    F.f.forEach(function (d) {
      var v = inputs[d[0]].value.trim(); data[d[0]] = v;
      if (d[3] && !v) bad = true; if (v) lines.push('**' + d[1] + ':** ' + v);
    });
    if (bad) { m.className = 'ap-msg err'; m.textContent = 'Заполни обязательные поля (*).'; return; }
    var title = '[' + F.tag + '] ' + data.name.slice(0, 60);
    if (EP) {
      go.disabled = true; m.className = 'ap-msg'; m.textContent = 'Отправляю…';
      data.type = F.tag;
      fetch(EP, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); m.className = 'ap-msg ok'; m.textContent = 'Спасибо! Заявка отправлена.'; })
        .catch(function (e) { go.disabled = false; m.className = 'ap-msg err'; m.textContent = 'Не удалось отправить: ' + e.message; });
    } else {
      var url = 'https://github.com/' + OWNER + '/' + REPO + '/issues/new?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(lines.join('\n\n').slice(0, 3500));
      window.open(url, '_blank', 'noopener');
      m.className = 'ap-msg ok'; m.textContent = 'Открылась страница GitHub: нажми «Submit new issue».';
    }
  };
  box.appendChild(go); box.appendChild(m); root.appendChild(box);
})();
