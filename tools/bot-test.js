/* Имитация бота для теста форм (work.html, ads.html). Реальных заявок не шлёт: window.open и fetch подменяются заглушками.

   КАК ЗАПУСТИТЬ В ACODE:
   1) Вариант А: временно добавь в конец work.html строку
        <script src="{{ '/tools/bot-test.js' | relative_url }}"></script>
      и открой страницу в предпросмотре Acode (либо на сайте после пуша). Внизу появятся 3 кнопки.
   2) Вариант Б: вставь весь этот файл в консоль (Eruda в предпросмотре Acode) на открытой странице с формой.

   КНОПКИ (после каждого теста перезагрузи страницу):
   BOT      — заполняет всё включая скрытое поле и жмёт сразу. Ожидается: ЗАБЛОКИРОВАНО (honeypot)
   FAST     — не трогает скрытое поле, но жмёт мгновенно. Ожидается: ЗАБЛОКИРОВАНО (ловушка по времени)
   HUMAN    — заполняет видимые поля, ждёт 3.5 с и жмёт. Ожидается: ОТПРАВЛЕНО */
(function () {
  'use strict';
  if (window.__a51bt) return; window.__a51bt = 1;
  var out = document.createElement('div');
  out.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;background:#111;color:#fff;font:14px monospace;padding:10px;border-radius:14px;border:1px solid #888';
  var msg = document.createElement('div'); msg.textContent = 'Тест бота: выбери режим'; out.appendChild(msg);
  function say(t, ok) { msg.textContent = t; msg.style.color = ok === undefined ? '#fff' : ok ? '#5cf2c8' : '#ff6b6b'; }

  function run(mode) {
    var root = document.getElementById('apply-form');
    if (!root || !root.querySelector('.ap-btn')) { say('Нет формы: открой work.html или ads.html', false); return; }
    var calls = 0, oOpen = window.open, oFetch = window.fetch;
    window.open = function () { calls++; return null; };
    window.fetch = function () { calls++; return Promise.resolve({ ok: true, status: 200 }); };
    root.querySelectorAll('input,textarea,select').forEach(function (e) {
      if (e.classList.contains('ap-hp')) { if (mode === 'bot') e.value = 'http://spam.example'; return; }
      if (e.tagName === 'SELECT') e.selectedIndex = 0; else e.value = 'Test ' + mode;
    });
    say('Тест ' + mode.toUpperCase() + (mode === 'human' ? ': жду 3.5 с…' : '…'));
    setTimeout(function () {
      root.querySelector('.ap-btn').click();
      setTimeout(function () {
        window.open = oOpen; window.fetch = oFetch;
        var sent = calls > 0, pass = mode === 'human' ? sent : !sent;
        say((pass ? 'OK' : 'FAIL') + ' [' + mode.toUpperCase() + ']: ' + (sent ? 'ОТПРАВЛЕНО' : 'ЗАБЛОКИРОВАНО') + '. Перезагрузи страницу для нового теста', pass);
      }, 400);
    }, mode === 'human' ? 3500 : 0);
  }

  [['BOT', 'bot'], ['FAST', 'fast'], ['HUMAN', 'human']].forEach(function (b) {
    var x = document.createElement('button'); x.textContent = b[0]; x.type = 'button';
    x.style.cssText = 'margin:8px 6px 0 0;padding:8px 16px;border-radius:99px;border:1px solid #a066ff;background:#222;color:#fff;font:14px monospace';
    x.onclick = function () { run(b[1]); };
    out.appendChild(x);
  });
  document.body.appendChild(out);
})();
