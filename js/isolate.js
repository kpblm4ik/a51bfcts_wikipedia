/* Изоляция страницы (cross-origin isolation) для ECM и потоков WebAssembly.
   GitHub Pages не умеет отдавать заголовки COOP/COEP, поэтому их добавляет сервис-воркер coi-sw.js.
   Пока включена галочка «Изолировать страницу», любая страница сайта перекидывает на страницу экспериментов:
   так изоляция не ломает вёрстку остальных страниц и не вызывает глюков устройства.
   Аварийный выход: добавьте ?isolate=off к адресу любой страницы сайта. */
(function () {
  'use strict';
  const cs = document.currentScript;
  const BASE = new URL('../', cs ? cs.src : location.href).href;   // корень сайта, например https://kpblm4ik.github.io/a51bfcts_wikipedia/
  const EXP = BASE + 'experimental.html', SWURL = BASE + 'coi-sw.js', KEY = 'dz.isolate';
  const store = st => ({
    get: k => { try { return st.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { st.setItem(k, v); } catch (e) {} },
    del: k => { try { st.removeItem(k); } catch (e) {} }
  });
  let LS, SS;
  try { LS = store(localStorage); SS = store(sessionStorage); } catch (e) { LS = store({ getItem() { return null; }, setItem() {}, removeItem() {} }); SS = LS; }
  const onExp = /\/experimental(\.html)?\/?$/.test(location.pathname);
  const unreg = () => (navigator.serviceWorker && navigator.serviceWorker.getRegistrations)
    ? navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.filter(r => r.scope === BASE).map(r => r.unregister()))).catch(() => {})
    : Promise.resolve();

  /* аварийный выход */
  if (/[?&]isolate=off\b/.test(location.search)) { LS.del(KEY); SS.del('dz.iso.try'); unreg(); return; }
  /* галочка стоит: все страницы, кроме страницы экспериментов, перекидываем на неё */
  if (LS.get(KEY) === '1' && !onExp) { location.replace(EXP); return; }
  if (!onExp) return;

  /* ---------- блок на странице экспериментов (закрытый Shadow DOM, цвета зашиты, тема не влияет) ---------- */
  const CSS = `
    :host{all:initial;display:block;margin:18px 0}
    *{box-sizing:border-box}
    .dz{font:14px/1.5 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#ffe3e3;background:#1a0606;border:2px solid #ff1f1f;border-radius:14px;padding:14px;box-shadow:0 0 24px rgba(255,31,31,.45),inset 0 0 30px rgba(255,0,0,.12);text-shadow:none;letter-spacing:normal;text-align:left}
    h3{margin:0 0 8px;font-size:20px;font-weight:800;letter-spacing:.06em;color:#ff4545;text-transform:uppercase;text-shadow:0 0 10px rgba(255,31,31,.6)}
    b{color:#ffb3b3}
    .warn{background:rgba(255,31,31,.1);border:1px solid rgba(255,31,31,.55);border-radius:10px;padding:10px;margin:10px 0;color:#ffd0d0}
    .st{margin:6px 0;color:#ffb3b3}
    .st.bad{color:#ff5c5c;font-weight:700}
    .st.ok{color:#ffd0d0}
    .hint{font-size:12px;color:#d98a8a;margin:6px 0}
    label{display:flex;gap:8px;align-items:center;color:#ffbcbc;font-size:15px}
    input[type=checkbox]{width:20px;height:20px;accent-color:#ff2a2a}
    pre{white-space:pre-wrap;word-break:break-word;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;color:#ffb3b3;margin:6px 0}
    code{color:#fff;word-break:break-all}
  `;
  const HTML = `
    <h3>⚠ Изолировать страницу</h3>
    <div class='warn'>Изоляция нужна, чтобы ECM мог запускаться корректно: она открывает странице потоки WebAssembly (SharedArrayBuffer). Пока галочка стоит, <b>любая страница сайта перекидывает на эту страницу</b>, чтобы изоляция не сломала вёрстку и не вызвала глюки устройства. Снимите галочку, чтобы вернуться к обычному сайту.</div>
    <label><input type='checkbox' id='iso'> Изолировать страницу</label>
    <div id='ist' class='st'></div>
    <pre id='iinfo'></pre>
    <p class='hint'>Как это работает: на GitHub Pages нельзя задать заголовки сервера, поэтому сайт ставит сервис-воркер coi-sw.js, который добавляет заголовки <code>Cross-Origin-Opener-Policy: same-origin</code> и <code>Cross-Origin-Embedder-Policy: credentialless</code>. После включения страница один раз перезагрузится. Работает в браузерах на Chromium (Яндекс, Chrome, Edge). Если что-то зависло, откройте любую страницу сайта с <code>?isolate=off</code> в конце адреса: галочка снимется.</p>
  `;
  class IsoZone extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const r = this.attachShadow({ mode: 'closed' });
      r.innerHTML = '<style>' + CSS + '</style><div class="dz">' + HTML + '</div>';
      init(r);
    }
  }
  function init(r) {
    const q = s => r.querySelector(s), cb = q('#iso');
    const say = (t, cls) => { const e = q('#ist'); e.textContent = t; e.className = 'st' + (cls ? ' ' + cls : ''); };
    const sw = 'serviceWorker' in navigator && window.isSecureContext;
    const iso = () => !!window.crossOriginIsolated;
    function info() {
      q('#iinfo').textContent = 'Изоляция сейчас (crossOriginIsolated): ' + (iso() ? 'да' : 'нет') +
        '\nСервис-воркеры и HTTPS: ' + (sw ? 'да' : 'нет') +
        ' · Потоки WASM (SharedArrayBuffer): ' + (typeof SharedArrayBuffer === 'function' ? 'доступны' : 'недоступны');
    }
    async function turnOn() {
      if (!sw) { cb.checked = false; say('Нужны сервис-воркеры и HTTPS: в этом браузере изоляция недоступна.', 'bad'); return; }
      cb.disabled = true; say('Устанавливаю сервис-воркер…');
      try {
        await navigator.serviceWorker.register(SWURL, { scope: BASE });
        await navigator.serviceWorker.ready;
        LS.set(KEY, '1'); SS.set('dz.iso.try', '1');
        say('Перезагружаю страницу…');
        location.reload();
      } catch (e) { cb.checked = false; cb.disabled = false; say('Не удалось установить сервис-воркер: ' + (e.message || e), 'bad'); }
    }
    async function turnOff() {
      cb.disabled = true; say('Выключаю изоляцию…');
      LS.del(KEY); SS.del('dz.iso.try');
      await unreg();
      location.reload();
    }
    cb.onchange = () => { if (cb.checked) turnOn(); else turnOff(); };
    cb.checked = LS.get(KEY) === '1';
    info();
    if (!cb.checked) { say(iso() ? 'Страница уже изолирована самим сервером. Галочка не нужна.' : 'Изоляция выключена.'); return; }
    if (iso()) { say('✔ Страница изолирована. Другие страницы сайта перекидывают сюда, пока галочка стоит.', 'ok'); return; }
    /* галочка стоит, а изоляции нет: один раз за сессию пробуем переустановить воркер */
    if (!SS.get('dz.iso.try') && sw) {
      SS.set('dz.iso.try', '1'); say('Переустанавливаю сервис-воркер…');
      navigator.serviceWorker.register(SWURL, { scope: BASE }).then(() => navigator.serviceWorker.ready).then(() => location.reload()).catch(e => say('Не удалось: ' + (e.message || e), 'bad'));
      return;
    }
    say('⚠ Галочка стоит, но браузер не включил изоляцию (старый браузер или блокировка сервис-воркеров). Снимите галочку или проверьте браузер на Chromium.', 'bad');
  }
  if (!customElements.get('isolate-zone')) customElements.define('isolate-zone', IsoZone);
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.createElement('isolate-zone'), dz = document.querySelector('danger-zone');
    if (dz) dz.insertAdjacentElement('afterend', el); else (document.querySelector('.wrapper') || document.body).appendChild(el);
  });
})();
