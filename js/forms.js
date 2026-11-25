/* Формы «Работа» и «Реклама» на главной.
   Если в _config.yml задан forms_endpoint (Formspree и подобные, принимают JSON), заявка уходит туда.
   Иначе открывается готовый GitHub Issue с заголовком [Работа]/[Реклама] (публичный, нужен аккаунт GitHub). */
(function () {
  'use strict';
  var OWNER = 'kpblm4ik', REPO = 'a51bfcts_wikipedia', EP = window.A51_FORMS_ENDPOINT || '';
  var FORMS = {
    work: { tag: 'Работа', title: 'Хочу в команду', f: [
      ['name', 'Имя или ник', 'text', 1], ['contact', 'Контакт (Telegram / Discord)', 'text', 1],
      ['role', 'Роль', ['Редактор страниц', 'Датамайнер', 'Переводчик', 'Разработчик', 'Другое'], 1],
      ['about', 'О себе', 'textarea', 1], ['links', 'Ссылки на работы', 'text', 0]] },
    ads: { tag: 'Реклама', title: 'Реклама на сайте', f: [
      ['name', 'Компания или имя', 'text', 1], ['contact', 'Контакт (Telegram / e-mail)', 'text', 1],
      ['format', 'Формат', ['Баннер', 'Пост / интеграция', 'Спонсорство', 'Другое'], 1],
      ['budget', 'Бюджет и сроки', 'text', 0], ['about', 'Что рекламируем', 'textarea', 1]] }
  };
  var back = null;
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function close() { if (back) { back.remove(); back = null; } document.body.classList.remove('dv-open'); }

  function open(kind) {
    var F = FORMS[kind]; if (!F) return; close();
    back = el('div', 'dv-back'); var box = el('div', 'dv-box'), h = el('div', 'dv-h');
    h.appendChild(el('h3', '', F.title)); var x = el('button', 'dv-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Закрыть'); x.onclick = close; h.appendChild(x);
    box.appendChild(h);
    var inputs = {};
    F.f.forEach(function (d) {
      var w = el('div', 'dv-f'); w.appendChild(el('label', '', d[1] + (d[3] ? ' *' : '')));
      var i;
      if (Array.isArray(d[2])) { i = el('select'); d[2].forEach(function (o) { i.appendChild(el('option', '', o)); }); }
      else if (d[2] === 'textarea') { i = el('textarea'); i.rows = 4; }
      else { i = el('input'); i.type = 'text'; }
      i.maxLength = 600; w.appendChild(i); box.appendChild(w); inputs[d[0]] = i;
    });
    var hp = el('input', 'dv-hp'); hp.tabIndex = -1; hp.autocomplete = 'off'; hp.setAttribute('aria-hidden', 'true'); box.appendChild(hp);
    box.appendChild(el('p', 'dv-note', EP ? 'Заявку увидят только разработчики.' : 'Заявка откроется как GitHub Issue и будет публичной: не пиши личные данные, достаточно ника в Telegram.'));
    var m = el('p', 'dv-msg'), go = el('button', 'dv-btn', 'Отправить'); go.type = 'button';
    go.onclick = function () {
      if (hp.value) return;
      var data = {}, lines = [], bad = false;
      F.f.forEach(function (d) {
        var v = inputs[d[0]].value.trim(); data[d[0]] = v;
        if (d[3] && !v) bad = true; if (v) lines.push('**' + d[1] + ':** ' + v);
      });
      if (bad) { m.className = 'dv-msg err'; m.textContent = 'Заполни обязательные поля (*).'; return; }
      var title = '[' + F.tag + '] ' + data.name.slice(0, 60);
      if (EP) {
        go.disabled = true; m.className = 'dv-msg'; m.textContent = 'Отправляю…';
        data.type = F.tag;
        fetch(EP, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); m.className = 'dv-msg ok'; m.textContent = 'Спасибо! Заявка отправлена.'; })
          .catch(function (e) { go.disabled = false; m.className = 'dv-msg err'; m.textContent = 'Не удалось отправить: ' + e.message; });
      } else {
        var url = 'https://github.com/' + OWNER + '/' + REPO + '/issues/new?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(lines.join('\n\n').slice(0, 3500));
        window.open(url, '_blank', 'noopener');
        m.className = 'dv-msg ok'; m.textContent = 'Открылась страница GitHub: нажми «Submit new issue».';
      }
    };
    box.appendChild(go); box.appendChild(m);
    back.appendChild(box);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    document.body.appendChild(back); document.body.classList.add('dv-open');
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-form]');
    if (b) { e.preventDefault(); open(b.getAttribute('data-form')); }
  });
})();
