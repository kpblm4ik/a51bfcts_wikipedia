/* Панель «Для разработчиков» (кнопка >_ в виджете). Грузится по клику.
   Проверка: GitHub-токен должен иметь право записи в этот репозиторий. Токен хранится
   только в sessionStorage (до закрытия вкладки) и уходит только на api.github.com. */
(function () {
  'use strict';
  var OWNER = 'kpblm4ik', REPO = 'a51bfcts_wikipedia', API = 'https://api.github.com', SK = 'a51.dev';
  var BASE = ((document.currentScript && document.currentScript.src) || '').replace(/js\/dev\.js.*$/, '');
  var back = null;

  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function getTok() { try { return sessionStorage.getItem(SK) || ''; } catch (e) { return ''; } }
  function setTok(v) { try { v ? sessionStorage.setItem(SK, v) : sessionStorage.removeItem(SK); } catch (e) {} }
  function ghT(token, path, o) {
    o = o || {};
    var h = { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + token };
    if (o.body) h['Content-Type'] = 'application/json';
    return fetch(API + path, { method: o.method || 'GET', headers: h, body: o.body ? JSON.stringify(o.body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.message || ('HTTP ' + r.status)); return j; }); });
  }
  function gh(path, o) { return ghT(getTok(), path, o); }
  function close() { if (back) { back.remove(); back = null; } document.body.classList.remove('dv-open'); }
  function shell(title) {
    close();
    back = el('div', 'dv-back'); var box = el('div', 'dv-box'), h = el('div', 'dv-h');
    h.appendChild(el('h3', '', title)); var x = el('button', 'dv-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Закрыть'); x.onclick = close; h.appendChild(x);
    box.appendChild(h); back.appendChild(box);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    document.body.appendChild(back); document.body.classList.add('dv-open');
    return box;
  }
  function field(box, label, type, ph) {
    var w = el('div', 'dv-f'); w.appendChild(el('label', '', label));
    var i = type === 'textarea' ? el('textarea') : el('input'); if (type !== 'textarea') i.type = type || 'text';
    if (ph) i.placeholder = ph; i.autocomplete = 'off'; w.appendChild(i); box.appendChild(w); return i;
  }
  function btn(text, fn, cls) { var b = el('button', 'dv-btn' + (cls ? ' ' + cls : ''), text); b.type = 'button'; b.onclick = fn; return b; }
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
  function ago(d) { try { return new Date(d).toLocaleString('ru-RU'); } catch (e) { return d; } }

  /* ---------- Вход ---------- */
  function auth(msg) {
    var b = shell('Для разработчиков');
    b.appendChild(el('p', 'dv-note', 'Введи GitHub-токен (fine-grained: этот репозиторий, Contents — Read and write, Issues — Read, Actions — Read). Он хранится только до закрытия вкладки.'));
    var i = field(b, 'Токен', 'password', 'github_pat_…');
    var m = el('p', 'dv-msg', msg || ''); 
    var go = btn('Войти', function () {
      var t = i.value.trim(); if (!t) return;
      go.disabled = true; m.className = 'dv-msg'; m.textContent = 'Проверяю…';
      ghT(t, '/repos/' + OWNER + '/' + REPO).then(function (j) {
        if (!j.permissions || !j.permissions.push) throw new Error('У токена нет права записи в этот репозиторий.');
        setTok(t); menu('page');
      }).catch(function (e) { go.disabled = false; m.className = 'dv-msg err'; m.textContent = 'Не подошёл: ' + e.message; });
    });
    i.addEventListener('keydown', function (e) { if (e.key === 'Enter') go.click(); });
    b.appendChild(go); b.appendChild(m); i.focus();
  }

  /* ---------- Меню (без повторного ввода токена) ---------- */
  function menu(tab) {
    var b = shell('Для разработчиков'), bar = el('div', 'dv-tabs'), body = el('div', 'dv-body');
    [['page', 'Создать страницу'], ['logs', 'Логи'], ['work', 'Работа'], ['ads', 'Реклама']].forEach(function (t) {
      var x = el('button', 'dv-tab' + (t[0] === tab ? ' on' : ''), t[1]); x.type = 'button';
      x.onclick = function () { menu(t[0]); }; bar.appendChild(x);
    });
    var out = el('button', 'dv-tab', 'Выйти'); out.type = 'button'; out.onclick = function () { setTok(''); close(); }; bar.appendChild(out);
    b.appendChild(bar); b.appendChild(body);
    if (tab === 'page') pageTab(body); else if (tab === 'logs') logsTab(body); else appsTab(body, tab);
  }
  function fail(body, e) {
    body.appendChild(el('p', 'dv-msg err', 'Ошибка: ' + e.message));
    if (/bad credentials|requires authentication/i.test(e.message)) { setTok(''); body.appendChild(btn('Войти заново', function () { auth(); })); }
  }

  function pageTab(body) {
    var t = field(body, 'Заголовок', 'text', 'Например: Новая катушка'),
        s = field(body, 'Адрес (латиница, цифры, дефис)', 'text', 'new-coil'),
        d = field(body, 'Описание для поиска', 'text', 'Коротко о странице'),
        c = field(body, 'Текст (Markdown/HTML)', 'textarea', '# Заголовок\n\nТекст страницы…');
    c.rows = 8; var m = el('p', 'dv-msg');
    var go = btn('Создать страницу', function () {
      var slug = s.value.trim().toLowerCase();
      m.className = 'dv-msg';
      if (!t.value.trim() || !c.value.trim()) { m.className = 'dv-msg err'; m.textContent = 'Нужны заголовок и текст.'; return; }
      if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(slug)) { m.className = 'dv-msg err'; m.textContent = 'Адрес: только a–z, 0–9 и дефис.'; return; }
      go.disabled = true; m.textContent = 'Проверяю адрес…';
      var path = '/repos/' + OWNER + '/' + REPO + '/contents/docs/' + slug + '.md';
      gh(path).then(function () { throw new Error('Страница с таким адресом уже есть.'); }, function (e) {
        if (e.message !== 'Not Found') throw e;
      }).then(function () {
        var fm = '---\nlayout: default\ntitle: ' + JSON.stringify(t.value.trim()) + '\ndescription: ' + JSON.stringify(d.value.trim()) + '\n---\n\n' + c.value + '\n';
        return gh(path, { method: 'PUT', body: { message: 'Новая страница: ' + t.value.trim(), content: b64(fm) } });
      }).then(function () {
        m.className = 'dv-msg ok'; m.textContent = 'Готово. Страница появится после сборки (1–2 минуты): ';
        var a = el('a', '', BASE + slug + '.html'); a.href = BASE + slug + '.html'; a.target = '_blank'; a.rel = 'noopener'; m.appendChild(a); go.disabled = false;
      }).catch(function (e) { go.disabled = false; m.className = 'dv-msg err'; m.textContent = 'Ошибка: ' + e.message; });
    });
    body.appendChild(go); body.appendChild(m);
  }

  function logsTab(body) {
    body.appendChild(el('p', 'dv-note', 'Загружаю…'));
    var base = '/repos/' + OWNER + '/' + REPO;
    Promise.all([gh(base + '/commits?per_page=15'), gh(base + '/actions/runs?per_page=8').catch(function () { return null; })]).then(function (r) {
      body.textContent = '';
      if (r[1] && r[1].workflow_runs) {
        body.appendChild(el('h4', '', 'Сборки сайта'));
        var ul = el('ul', 'dv-list');
        r[1].workflow_runs.forEach(function (w) {
          var st = w.conclusion || w.status, li = el('li'), b = el('b', 'dv-st ' + (st === 'success' ? 'ok' : (st === 'failure' ? 'err' : '')), st);
          li.appendChild(b); li.appendChild(document.createTextNode(' ' + (w.display_title || w.name) + ' · ' + ago(w.created_at))); ul.appendChild(li);
        });
        body.appendChild(ul);
      }
      body.appendChild(el('h4', '', 'Изменения в репо'));
      var cl = el('ul', 'dv-list');
      r[0].forEach(function (c) { cl.appendChild(el('li', '', c.commit.message.split('\n')[0] + ' · ' + c.commit.author.name + ' · ' + ago(c.commit.author.date))); });
      body.appendChild(cl);
    }).catch(function (e) { body.textContent = ''; fail(body, e); });
  }

  /* Заявки приходят как GitHub Issues с заголовком [Работа] или [Реклама] */
  function appsTab(body, kind) {
    var tag = kind === 'work' ? '[Работа]' : '[Реклама]';
    body.appendChild(el('p', 'dv-note', 'Загружаю…'));
    var q = 'repo:' + OWNER + '/' + REPO + ' is:issue in:title ' + tag.slice(1, -1);
    gh('/search/issues?per_page=40&sort=created&order=desc&q=' + encodeURIComponent(q)).then(function (r) {
      body.textContent = '';
      var items = (r.items || []).filter(function (i) { return i.title.indexOf(tag) === 0; });
      body.appendChild(el('h4', '', (kind === 'work' ? 'Заявки на работу: ' : 'Заявки от рекламодателей: ') + items.length));
      if (!items.length) body.appendChild(el('p', 'dv-note', 'Пока пусто.'));
      items.forEach(function (i) {
        var d = el('details', 'dv-app'), s = el('summary', '', i.title.slice(tag.length).trim() + ' · ' + ago(i.created_at));
        d.appendChild(s); d.appendChild(el('pre', '', i.body || '')); 
        var a = el('a', '', 'Открыть на GitHub'); a.href = i.html_url; a.target = '_blank'; a.rel = 'noopener'; d.appendChild(a);
        body.appendChild(d);
      });
    }).catch(function (e) { body.textContent = ''; fail(body, e); });
  }

  window.A51Dev = { open: function () { getTok() ? menu('page') : auth(); } };
})();
