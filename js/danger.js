/* Опасная зона: кодирование видео в ECM (Enhanced Compression Model, предшественник H.267).

   • Всегда красная и не подчиняется UI kit: элемент живёт в закрытом Shadow DOM, стили темы внутрь не проникают,
     наследуемые свойства сброшены (:host{all:initial}), CSS-переменные темы не используются, цвета зашиты в код.
   • Доступ: сначала проверка железа, потом токен владельца (сверяется по хэшу SHA-256 из data/danger-tokens.json).
     Важно: сайт статический, проверка идёт в браузере. Это предохранитель от случайного запуска, а не защита от
     человека, который разберётся в коде. Секретов здесь нет и быть не должно.
   • Настоящее кодирование делает внешний движок js/ecm/ecm-engine.js (сборка ECM в WebAssembly, контракт — в js/ecm/README.md).
     Пока его нет, кнопка «Начать» неактивна и зона честно пишет об этом.
   • Все ядра: тест процессора гоняет по воркеру на каждое ядро, а кодирование делится на независимые сегменты
     (по одному воркеру движка на сегмент). Потоки внутри самого движка (pthreads) работают только при изоляции страницы. */
(function () {
  'use strict';
  const CFG = Object.assign({ tokens: 'data/danger-tokens.json', engine: 'js/ecm/' }, window.DZ_CFG || {});

  /* Пороги проверки железа. Числа подбирайте под свои устройства: реальные значения видны в панели «Проверка железа». */
  const HW = {
    minCores: 4, okCores: 8,       // ядра процессора (navigator.hardwareConcurrency)
    minMem: 4, okMem: 8,           // ГБ, navigator.deviceMemory (только Chromium, больше 8 не показывает) или ваше значение
    benchMin: 40,                  // минимум для одного ядра, млн итераций в секунду
    parOk: 400,                    // сумма по всем ядрам для полного режима, млн итераций в секунду
    minBattery: 0.4,               // ниже этого заряда без зарядки не пускаем
    maxParts: 8,                   // не больше стольких параллельных сегментов (каждый держит свой экземпляр движка в памяти)
    tiers: {
      ok:      { w: 1280, h: 720, frames: 150, fps: 30 },
      limited: { w: 640,  h: 360, frames: 30,  fps: 15 }
    },
    maxBytes: 320e6                // потолок памяти под все исходные кадры
  };

  const safe = n => { try { return window[n]; } catch (e) { return null; } };
  const store = st => ({
    get: k => { try { return st.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { st.setItem(k, v); } catch (e) {} },
    del: k => { try { st.removeItem(k); } catch (e) {} }
  });
  const LS = store(safe('localStorage')), SS = store(safe('sessionStorage'));

  /* ---------- токены ---------- */
  const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
  const norm = s => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const expired = t => !!(t && t.expires && Date.now() > Date.parse(t.expires + 'T23:59:59'));
  async function loadTokens() {
    const r = await fetch(CFG.tokens, { cache: 'no-store' });
    if (!r.ok) throw new Error('Список токенов недоступен (' + r.status + ').');
    const j = await r.json();
    if (!j || typeof j.salt !== 'string' || !Array.isArray(j.tokens)) throw new Error('Неверный формат списка токенов.');
    return j;
  }
  async function checkToken(token) {
    if (!(window.crypto && crypto.subtle)) throw new Error('Нужна защищённая страница (HTTPS).');
    const j = await loadTokens(), hash = await sha(j.salt + ':' + norm(token));
    const t = j.tokens.find(x => x && x.hash === hash);
    if (!t) return null;
    if (expired(t)) return { expired: true };
    return { id: String(t.id || 'token').slice(0, 40), hash: hash };
  }
  async function restore() {
    const h = SS.get('dz.ok');
    if (!h) return null;
    try {
      const j = await loadTokens(), t = j.tokens.find(x => x && x.hash === h);
      if (t && !expired(t)) return { id: String(t.id || 'token').slice(0, 40) };
    } catch (e) {}
    SS.del('dz.ok');
    return null;
  }
  const FK = 'dz.fail';
  function failGet() { try { return JSON.parse(LS.get(FK) || 'null'); } catch (e) { return null; } }
  function lockLeft() {
    const f = failGet();
    if (!f || f.n < 5) return 0;
    const left = Math.ceil((f.t + 60000 - Date.now()) / 1000);
    if (left <= 0) { LS.del(FK); return 0; }
    return left;
  }
  function failAdd() { const f = failGet() || { n: 0, t: 0 }; f.n++; f.t = Date.now(); LS.set(FK, JSON.stringify(f)); }

  /* ---------- проверка железа ---------- */
  /* Тест процессора в воркере, ограничен по времени (500 мс). Возвращает млн итер./с одного воркера. */
  function benchOne() {
    return new Promise(res => {
      let w, url;
      try {
        const src = 'let it=0,x=0,a=1;const t0=performance.now();while(performance.now()-t0<500){for(let i=0;i<1e6;i++){x=(Math.imul(x,1664525)+1013904223)|0;a=a*1.0000001+(x&7)*1e-9;}it+=1e6;}postMessage({it:it,ms:performance.now()-t0,v:a+x});';
        url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
        w = new Worker(url);
      } catch (e) { res(null); return; }
      let fin = false;
      const done = v => { if (fin) return; fin = true; try { w.terminate(); URL.revokeObjectURL(url); } catch (e) {} res(v); };
      w.onmessage = e => done(e.data.it / e.data.ms / 1000);
      w.onerror = () => done(null);
      setTimeout(() => done(null), 4000);
    });
  }
  /* Сначала одно ядро, потом по воркеру на каждое ядро одновременно: видно, сколько ядер реально работает. */
  async function bench(cores) {
    const single = await benchOne();
    let par = null;
    const n = Math.min(Math.max(cores, 1), 16);
    if (single !== null && n > 1) {
      const r = await Promise.all(Array.from({ length: n }, benchOne));
      if (r.every(v => v !== null)) par = r.reduce((a, b) => a + b, 0);
    }
    return { single: single, par: par, n: n };
  }
  async function probe() {
    const n = navigator;
    const h = {
      cores: n.hardwareConcurrency || 0,
      memReported: typeof n.deviceMemory === 'number' ? n.deviceMemory : null,
      mobile: !!((n.userAgentData && n.userAgentData.mobile) || /Android|iPhone|iPad|iPod|Mobile/i.test(n.userAgent)),
      secure: !!window.isSecureContext,
      wasm: typeof WebAssembly === 'object',
      worker: typeof Worker === 'function',
      coi: !!window.crossOriginIsolated,
      gpu: !!n.gpu,
      bat: null,
      bench: null
    };
    try { if (n.getBattery) { const b = await n.getBattery(); h.bat = { level: b.level, charging: b.charging }; } } catch (e) {}
    h.bench = h.worker ? await bench(h.cores) : null;
    return h;
  }
  /* Учитываем то, что указал пользователь: ОЗУ (браузер не показывает больше 8 ГБ) и подтверждение зарядки. */
  function eff(h, ov) {
    const e = Object.assign({}, h);
    e.mem = ov.mem !== null ? ov.mem : h.memReported;
    e.memManual = ov.mem !== null;
    /* 100% и «на зарядке» ровно в таком виде отдают браузеры-заглушки и ПК без батареи: настоящим это считать нельзя */
    e.batFake = !!(h.bat && h.bat.level >= 0.999 && h.bat.charging);
    e.ack = !!ov.ack;
    return e;
  }
  function classify(h) {
    const why = [];
    if (!h.secure) why.push('нужен HTTPS');
    if (!h.wasm) why.push('нет WebAssembly');
    if (!h.worker) why.push('нет Web Workers');
    if (!h.cores) why.push('не удалось определить число ядер');
    else if (h.cores < HW.minCores) why.push('ядер ' + h.cores + ', нужно не меньше ' + HW.minCores);
    if (h.mem !== null && h.mem < HW.minMem) why.push('памяти ' + h.mem + ' ГБ, нужно не меньше ' + HW.minMem);
    if (h.worker) {
      if (!h.bench || h.bench.single === null) why.push('тест процессора не прошёл');
      else if (h.bench.single < HW.benchMin) why.push('процессор слишком медленный (' + h.bench.single.toFixed(0) + ' млн итер./с на ядро, нужно не меньше ' + HW.benchMin + ')');
    }
    if (h.bat && !h.batFake) {
      if (!h.bat.charging && (h.mobile || h.bat.level < HW.minBattery)) why.push(h.mobile ? 'телефон должен быть на зарядке' : 'батарея ' + Math.round(h.bat.level * 100) + '%, подключите зарядку');
    } else if (h.mobile && !h.ack) {
      why.push('браузер не сообщает настоящий заряд: подключите зарядку и поставьте галочку «Подтверждаю: телефон на зарядке»');
    }
    if (why.length) return { tier: 'blocked', why: why };
    const par = h.bench && h.bench.par !== null ? h.bench.par : (h.bench ? h.bench.single : 0);
    const strong = h.cores >= HW.okCores && (h.mem === null || h.mem >= HW.okMem) && par >= HW.parOk && !h.mobile;
    return { tier: strong ? 'ok' : 'limited', why: strong ? [] : ['среднее железо или мобильное устройство: лимиты снижены'] };
  }
  function describe(h) {
    const b = h.bench;
    const memTxt = h.memManual ? h.mem + ' ГБ (указано вами)' : (h.mem === null ? 'браузер не сообщает' : h.mem + ' ГБ (оценка браузера, больше 8 он не показывает)');
    let batTxt = 'браузер не сообщает';
    if (h.bat) batTxt = Math.round(h.bat.level * 100) + '%, ' + (h.bat.charging ? 'на зарядке' : 'без зарядки') + (h.batFake ? ' (похоже на заглушку: настоящий заряд страница узнать не может)' : '');
    return [
      'Ядер: ' + (h.cores || '?') + ' · Память: ' + memTxt + ' · Мобильное: ' + (h.mobile ? 'да' : 'нет'),
      'Тест процессора: ' + (!b || b.single === null ? 'нет данных' : '1 ядро ' + b.single.toFixed(0) + ' млн итер./с' + (b.par !== null ? ' · все ' + b.n + ' ядер ' + b.par.toFixed(0) + ' млн итер./с (×' + (b.par / b.single).toFixed(1) + ')' : '')) + ' (минимум на ядро ' + HW.benchMin + ', полный режим от ' + HW.parOk + ' по всем ядрам)',
      'Батарея: ' + batTxt,
      'WebAssembly: ' + (h.wasm ? 'да' : 'нет') + ' · HTTPS: ' + (h.secure ? 'да' : 'нет') + ' · WebGPU: ' + (h.gpu ? 'есть' : 'нет') + ' · изоляция страницы (потоки WASM): ' + (h.coi ? 'есть' : 'нет')
    ].join('\n');
  }

  /* ---------- видео → кадры I420 (8 бит, BT.709, ограниченный диапазон) ---------- */
  function waitEv(el, ev, ms) {
    return new Promise((res, rej) => {
      const t = setTimeout(() => { el.removeEventListener(ev, ok); rej(new Error('Видео не отвечает.')); }, ms);
      const ok = () => { clearTimeout(t); res(); };
      el.addEventListener(ev, ok, { once: true });
    });
  }
  async function readMeta(file) {
    const url = URL.createObjectURL(file), v = document.createElement('video');
    v.preload = 'metadata'; v.muted = true; v.src = url;
    try {
      if (v.readyState < 1) await waitEv(v, 'loadedmetadata', 10000);
      if (!v.videoWidth || !isFinite(v.duration) || v.duration <= 0) throw new Error('неподдерживаемый формат или повреждённый файл');
      return { w: v.videoWidth, h: v.videoHeight, dur: v.duration };
    } finally { URL.revokeObjectURL(url); v.removeAttribute('src'); v.load(); }
  }
  function i420(d, w, h) {
    const n = w * h, buf = new ArrayBuffer(n * 3 / 2), Y = new Uint8Array(buf, 0, n), U = new Uint8Array(buf, n, n / 4), V = new Uint8Array(buf, n + n / 4, n / 4), w2 = w >> 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      Y[y * w + x] = 16 + 0.18259 * d[i] + 0.61423 * d[i + 1] + 0.06201 * d[i + 2] + 0.5 | 0;
    }
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
      let r = 0, g = 0, b = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const i = ((y + dy) * w + x + dx) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      r /= 4; g /= 4; b /= 4;
      const o = (y >> 1) * w2 + (x >> 1);
      U[o] = 128 - 0.10064 * r - 0.33857 * g + 0.43922 * b + 0.5 | 0;
      V[o] = 128 + 0.43922 * r - 0.39894 * g - 0.04028 * b + 0.5 | 0;
    }
    return buf;
  }
  async function grab(file, o, onp, job) {
    const url = URL.createObjectURL(file), v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    const c = document.createElement('canvas'); c.width = o.w; c.height = o.h;
    const x = c.getContext('2d', { willReadFrequently: true }), out = [];
    try {
      if (v.readyState < 2) await waitEv(v, 'loadeddata', 15000);
      const dur = v.duration;
      for (let i = 0; i < o.frames; i++) {
        if (job.stop) throw new Error(job.reason || 'Остановлено.');
        const t = Math.min(Math.max(0, dur - 0.05), i / o.fps);
        if (Math.abs(v.currentTime - t) > 0.0005) { v.currentTime = t; await waitEv(v, 'seeked', 8000); }
        x.drawImage(v, 0, 0, o.w, o.h);
        out.push(i420(x.getImageData(0, 0, o.w, o.h).data, o.w, o.h));
        onp((i + 1) / o.frames, i + 1);
        if (i % 4 === 3) await new Promise(r => setTimeout(r, 0));
      }
    } finally { URL.revokeObjectURL(url); v.removeAttribute('src'); v.load(); }
    return out;
  }

  /* ---------- движок ECM (внешний Web Worker, контракт в js/ecm/README.md) ---------- */
  async function engineAvailable() {
    try { const r = await fetch(CFG.engine + 'ecm-engine.js', { method: 'HEAD', cache: 'no-store' }); return r.ok; } catch (e) { return false; }
  }
  /* Кадры делятся на независимые сегменты, на каждый сегмент свой воркер: так загружаются все выбранные ядра
     и без изоляции страницы. Готовые потоки склеиваются по порядку (в начале каждого сегмента точка произвольного доступа). */
  function encode(frames, o, onp, job) {
    const parts = Math.max(1, Math.min(o.threads, HW.maxParts, Math.floor(frames.length / 2) || 1));
    const per = Math.ceil(frames.length / parts), groups = [];
    for (let i = 0; i < frames.length; i += per) groups.push(frames.slice(i, i + per));
    const prog = groups.map(() => ({ d: 0, t: 1 })), outs = new Array(groups.length);
    job.workers = [];
    const report = () => onp(prog.reduce((a, p) => a + p.d, 0), prog.reduce((a, p) => a + p.t, 0));
    const killAll = () => job.workers.forEach(w => { try { w.terminate(); } catch (e) {} });
    return Promise.all(groups.map((g, k) => new Promise((res, rej) => {
      const w = new Worker(CFG.engine + 'ecm-engine.js');
      job.workers.push(w);
      w.onmessage = e => {
        const m = e.data || {};
        if (m.type === 'progress') { prog[k] = { d: m.done, t: m.total }; report(); }
        else if (m.type === 'done') { w.terminate(); outs[k] = new Uint8Array(m.data); res(); }
        else if (m.type === 'error') { w.terminate(); rej(new Error(m.message || 'ошибка движка')); }
      };
      w.onerror = e => { w.terminate(); rej(new Error(e.message || 'сбой движка')); };
      w.postMessage({ cmd: 'encode', width: o.w, height: o.h, fps: o.fps, qp: o.qp, config: o.config, threads: Math.max(1, Math.floor(o.threads / groups.length)), segment: k, segments: groups.length, frames: g }, g);
    }))).then(() => {
      const total = outs.reduce((a, b) => a + b.length, 0), out = new Uint8Array(total);
      let p = 0; outs.forEach(b => { out.set(b, p); p += b.length; });
      return { data: out, parts: groups.length };
    }).catch(e => { killAll(); throw e; });
  }

  /* ---------- внешний вид: все цвета зашиты, переменные темы не используются ---------- */
  const CSS = `
    :host{all:initial;display:block;margin:18px 0}
    *{box-sizing:border-box}
    [hidden]{display:none!important}
    .dz{font:14px/1.5 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#ffe3e3;background:#1a0606;border:2px solid #ff1f1f;border-radius:14px;padding:14px;box-shadow:0 0 24px rgba(255,31,31,.45),inset 0 0 30px rgba(255,0,0,.12);text-shadow:none;letter-spacing:normal;text-align:left}
    h3{margin:0 0 8px;font-size:20px;font-weight:800;letter-spacing:.06em;color:#ff4545;text-transform:uppercase;text-shadow:0 0 10px rgba(255,31,31,.6)}
    b{color:#ffb3b3}
    .warn{background:rgba(255,31,31,.1);border:1px solid rgba(255,31,31,.55);border-radius:10px;padding:10px;margin:10px 0;color:#ffd0d0}
    .sec{border-top:1px solid rgba(255,31,31,.4);margin-top:12px;padding-top:10px}
    .st{margin:6px 0;color:#ffb3b3}
    .st.bad{color:#ff5c5c;font-weight:700}
    .hint{font-size:12px;color:#d98a8a;margin:6px 0}
    button{background:#7a0000;color:#fff;border:1px solid #ff4545;border-radius:8px;padding:8px 12px;font:inherit;cursor:pointer}
    button:hover:not(:disabled){background:#a00000}
    button:disabled{opacity:.45;cursor:default}
    button.go{background:#c40000;font-weight:700}
    input,select{background:#0e0303;color:#ffe3e3;border:1px solid #b02020;border-radius:8px;padding:7px 9px;font:inherit;max-width:100%}
    input[type=range]{padding:0;accent-color:#ff2a2a}
    input[type=checkbox]{width:18px;height:18px;padding:0;accent-color:#ff2a2a}
    input[type=file]{max-width:100%}
    label{display:flex;gap:6px;align-items:center;flex-wrap:wrap;color:#ffbcbc;font-size:13px}
    .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
    pre{white-space:pre-wrap;word-break:break-word;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;color:#ffb3b3;margin:6px 0}
    .bar{height:10px;border-radius:6px;background:#2a0808;border:1px solid #7a1515;overflow:hidden;margin:8px 0}
    .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ff1f1f,#ff7a7a)}
    a{color:#ff8a8a}
  `;
  const HTML = `
    <h3>⚠ Опасная зона</h3>
    <div class='warn'><b>Кодирование видео в ECM.</b> ECM (Enhanced Compression Model) — исследовательская модель JVET, предшественник H.267. Она в десятки раз тяжелее обычных кодеков: нагружает процессор и память до предела, устройство может сильно нагреться или зависнуть. Доступ только по токену и после проверки железа.</div>
    <div class='sec'>
      <b>Проверка железа</b>
      <div id='hwst' class='st'>Проверяю…</div>
      <pre id='hwinfo'></pre>
      <div class='row'>
        <label>ОЗУ, ГБ <select id='memsel'></select></label>
        <label>Ядер в работе <select id='thr'></select></label>
      </div>
      <div class='row' id='chgrow' hidden><label><input type='checkbox' id='chg'> Подтверждаю: телефон на зарядке</label></div>
      <p class='hint'>Браузер не сообщает больше 8 ГБ памяти, а некоторые браузеры на телефонах подставляют 100% заряда и «на зарядке». Если оценка неверна, укажите значения сами: за них отвечаете вы.</p>
      <div class='row'><button id='hwre'>🔄 Перепроверить</button></div>
    </div>
    <div class='sec' id='sTok' hidden>
      <b>Токен доступа</b>
      <div class='row'><input id='tok' type='password' autocomplete='off' placeholder='DZ-XXXX-XXXX-XXXX-XXXX' style='flex:1 1 220px'><button id='unlock'>🔓 Открыть</button></div>
      <div id='tokst' class='st'></div>
      <p class='hint'>Токен выдаёт владелец сайта. Он нигде не сохраняется: после проверки запоминается только факт доступа на время этой вкладки. Проверка идёт в браузере и защищает от случайного запуска, а не от того, кто разберётся в коде страницы.</p>
    </div>
    <div class='sec' id='sEnc' hidden>
      <b>Кодирование в ECM</b>
      <div id='who' class='st'></div>
      <div id='eng' class='st'></div>
      <div id='par' class='hint'></div>
      <div class='row'><label>Видео <input id='file' type='file' accept='video/*'></label></div>
      <div id='fst' class='st'></div>
      <div class='row'>
        <label>Размер <select id='res' disabled></select></label>
        <label>Кадров/с <select id='fps'></select></label>
        <label>Конфиг <select id='cfg'><option value='ra'>Random Access</option><option value='ld'>Low Delay</option><option value='ai'>All Intra</option></select></label>
      </div>
      <div class='row'><label style='flex:1 1 220px'>Кадров <input id='nfr' type='range' min='1' max='30' value='1' style='flex:1'> <span id='nfrv'>1</span></label></div>
      <div class='row'><label style='flex:1 1 220px'>QP (чем больше, тем сильнее сжатие) <input id='qp' type='range' min='20' max='45' value='32' style='flex:1'> <span id='qpv'>32</span></label></div>
      <div class='row'><button id='go' class='go' disabled>▶ Начать</button><button id='stop' disabled>⏹ Стоп</button></div>
      <div class='bar'><i id='pb'></i></div>
      <div id='jst' class='st'></div>
      <div class='row'><a id='dl' hidden>⬇️ Скачать результат</a></div>
      <p class='hint'>На выходе поток ECM: браузеры и обычные плееры его не воспроизводят. Декодировать его можно декодером из референсного ПО ECM. Кадры берутся из видео на странице и никуда не отправляются. Звук не кодируется.</p>
    </div>
  `;

  class DangerZone extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const r = this.attachShadow({ mode: 'closed' });
      r.innerHTML = '<style>' + CSS + '</style><div class="dz">' + HTML + '</div>';
      init(r);
    }
  }

  function init(r) {
    const q = s => r.querySelector(s);
    let hw = null, tier = 'blocked', engineOk = false, job = null, file = null, meta = null, access = null, ack = false, view = null;
    const memLS = LS.get('dz.mem'), thrLS = LS.get('dz.thr');
    const ov = { mem: memLS && isFinite(+memLS) && +memLS > 0 ? +memLS : null, get ack() { return ack; } };
    const T = () => HW.tiers[tier];
    const say = (el, t, bad) => { el.textContent = t; el.className = 'st' + (bad ? ' bad' : ''); };
    const updGo = () => { q('#go').disabled = !(engineOk && file && meta && !job); };
    const maxThr = () => Math.max(1, Math.min((hw && hw.cores) || 1, 16));

    /* списки ОЗУ и ядер */
    q('#memsel').innerHTML = '<option value="">Авто (по данным браузера)</option>' + [4, 6, 8, 12, 16, 24, 32, 64].map(g => '<option value="' + g + '">' + g + ' ГБ</option>').join('');
    q('#memsel').value = ov.mem !== null && [4, 6, 8, 12, 16, 24, 32, 64].indexOf(ov.mem) >= 0 ? String(ov.mem) : '';
    function fillThr() {
      const n = maxThr(), want = thrLS && +thrLS >= 1 && +thrLS <= n ? +thrLS : n;
      q('#thr').innerHTML = Array.from({ length: n }, (_, i) => '<option value="' + (i + 1) + '">' + (i + 1) + (i + 1 === n ? ' (все)' : '') + '</option>').join('');
      q('#thr').value = String(want);
    }

    async function runCheck() {
      q('#hwre').disabled = true; q('#sTok').hidden = true; q('#sEnc').hidden = true;
      say(q('#hwst'), 'Проверяю железо (до 2 с)…');
      hw = await probe();
      q('#chgrow').hidden = !hw.mobile;
      fillThr();
      await show();
      q('#hwre').disabled = false;
    }
    /* пересчёт без повторного теста: после смены ОЗУ или галочки зарядки */
    async function show() {
      if (!hw) return;
      view = eff(hw, ov);
      const c = classify(view);
      tier = c.tier;
      q('#hwinfo').textContent = describe(view);
      if (tier === 'blocked') {
        say(q('#hwst'), '⛔ Доступ закрыт: ' + c.why.join('; ') + '.', true);
        q('#sTok').hidden = true; q('#sEnc').hidden = true;
        return;
      }
      say(q('#hwst'), tier === 'ok' ? '✔ Железо подходит.' : '⚠ Режим щадящий: ' + c.why.join('; ') + '.');
      if (!access) { const s = await restore(); if (s) access = s; }
      if (access) { q('#sTok').hidden = true; openEnc(access.id); } else q('#sTok').hidden = false;
    }

    async function unlock() {
      const left = lockLeft();
      if (left > 0) return say(q('#tokst'), 'Слишком много попыток. Подождите ' + left + ' с.', true);
      const v = q('#tok').value;
      if (!norm(v)) return say(q('#tokst'), 'Введите токен.', true);
      q('#unlock').disabled = true;
      try {
        const res = await checkToken(v);
        if (res && res.hash) { SS.set('dz.ok', res.hash); q('#tok').value = ''; LS.del(FK); q('#sTok').hidden = true; access = { id: res.id }; openEnc(res.id); }
        else { failAdd(); say(q('#tokst'), res && res.expired ? 'Срок действия токена истёк.' : 'Токен не подходит.', true); }
      } catch (e) { say(q('#tokst'), String(e.message || e), true); }
      q('#unlock').disabled = false;
    }

    function parInfo() {
      const n = +q('#thr').value || 1, iso = !!window.crossOriginIsolated;
      q('#par').textContent = 'Ядер в работе: ' + n + '. Кодирование делится на независимые сегменты, на каждый свой воркер (до ' + HW.maxParts + '), так что нагружаются все выбранные ядра. ' +
        (iso ? 'Страница изолирована: движок с pthreads сможет использовать потоки внутри сегмента.' : 'Изоляция страницы выключена: потоки внутри движка недоступны, параллелизм идёт только за счёт сегментов (включить изоляцию можно ниже).');
    }
    function openEnc(id) {
      const t = T();
      q('#sEnc').hidden = false;
      say(q('#who'), 'Доступ: ' + id + '. Режим «' + (tier === 'ok' ? 'полный' : 'щадящий') + '»: до ' + t.w + '×' + t.h + ', ' + t.frames + ' кадров, ' + t.fps + ' к/с.');
      q('#fps').innerHTML = [t.fps, Math.round(t.fps * 2 / 3), Math.round(t.fps / 2)].map(f => '<option value="' + f + '">' + f + '</option>').join('');
      parInfo();
      engineCheck();
    }
    async function engineCheck() {
      engineOk = await engineAvailable();
      say(q('#eng'), engineOk ? 'Движок ECM найден.' : 'Движок ECM не установлен: файла ' + CFG.engine + 'ecm-engine.js нет. Кодирование недоступно, пока не добавлена сборка ECM для WebAssembly (см. js/ecm/README.md).', !engineOk);
      updGo();
    }
    function dimsFor(scale) {
      const t = T(), f = Math.min(t.w / meta.w, t.h / meta.h, 1) * scale;
      return [Math.max(16, Math.floor(meta.w * f / 2) * 2), Math.max(16, Math.floor(meta.h * f / 2) * 2)];
    }
    function updFrames() {
      if (!meta) return;
      const fps = +q('#fps').value, mx = Math.max(1, Math.min(T().frames, Math.floor(meta.dur * fps)));
      q('#nfr').max = mx; if (+q('#nfr').value > mx || +q('#nfr').value < 1) q('#nfr').value = Math.min(mx, 30);
      q('#nfrv').textContent = q('#nfr').value;
    }
    async function onFile(e) {
      file = e.target.files[0] || null; meta = null; updGo();
      q('#res').disabled = true; q('#res').innerHTML = '';
      if (!file) return say(q('#fst'), '');
      try { meta = await readMeta(file); } catch (err) { file = null; return say(q('#fst'), 'Не удалось прочитать видео: ' + (err.message || err), true); }
      say(q('#fst'), 'Видео: ' + meta.w + '×' + meta.h + ', ' + meta.dur.toFixed(1) + ' с.');
      q('#res').innerHTML = [1, 0.75, 0.5].map(s => { const d = dimsFor(s); return '<option value="' + d[0] + 'x' + d[1] + '">' + d[0] + '×' + d[1] + '</option>'; }).join('');
      q('#res').disabled = false; updFrames(); updGo();
    }

    function progress(p, text) { q('#pb').style.width = Math.round(Math.max(0, Math.min(1, p)) * 100) + '%'; if (text) say(q('#jst'), text); }
    function stopJob(reason) { if (!job) return; job.stop = true; job.reason = reason; (job.workers || []).forEach(w => { try { w.terminate(); } catch (e) {} }); }
    async function guard() {
      try { if (navigator.getBattery) { const b = await navigator.getBattery(); if (!b.charging && b.level < 0.2) stopJob('Батарея ниже 20%: остановлено, чтобы не посадить устройство.'); } } catch (e) {}
    }
    async function start() {
      if (job || !file || !meta || !engineOk) return;
      const t = T(), d = q('#res').value.split('x').map(Number);
      /* число параллельных сегментов ограничено ещё и памятью: каждый воркер держит свой экземпляр движка */
      const memCap = view && view.mem !== null ? Math.max(1, Math.floor(view.mem / 1.5)) : 2;
      const o = { w: d[0], h: d[1], fps: +q('#fps').value, frames: +q('#nfr').value, qp: +q('#qp').value, config: q('#cfg').value, threads: Math.max(1, Math.min(+q('#thr').value || 1, memCap)) };
      if (!(o.w >= 16 && o.h >= 16) || o.w > t.w || o.h > t.h || o.frames < 1 || o.frames > t.frames || o.fps > t.fps || o.w * o.h * 1.5 * o.frames > HW.maxBytes) return say(q('#jst'), 'Параметры выходят за лимиты вашего устройства.', true);
      job = { stop: false, reason: '', workers: [] };
      q('#dl').hidden = true; q('#stop').disabled = false; updGo(); progress(0, 'Извлекаю кадры…');
      const timer = setInterval(guard, 3000);
      try {
        const frames = await grab(file, o, (p, i) => progress(p * 0.25, 'Извлекаю кадры: ' + i + ' из ' + o.frames), job);
        if (job.stop) throw new Error(job.reason || 'Остановлено.');
        progress(0.25, 'Кодирую в ECM…');
        const res = await encode(frames, o, (done, total) => progress(0.25 + 0.75 * (done / Math.max(1, total)), 'Кодирую в ECM: ' + done + ' из ' + total), job);
        const url = URL.createObjectURL(new Blob([res.data], { type: 'application/octet-stream' })), a = q('#dl');
        a.href = url; a.download = 'video.ecm.bin'; a.hidden = false;
        progress(1, 'Готово: ' + (res.data.length / 1024).toFixed(1) + ' КБ, сегментов: ' + res.parts + '.');
      } catch (e) {
        say(q('#jst'), job && job.stop ? (job.reason || 'Остановлено.') : 'Ошибка: ' + (e.message || e), true);
      } finally { clearInterval(timer); job = null; q('#stop').disabled = true; updGo(); }
    }

    q('#hwre').onclick = runCheck;
    q('#memsel').onchange = e => { ov.mem = e.target.value ? +e.target.value : null; if (ov.mem === null) LS.del('dz.mem'); else LS.set('dz.mem', String(ov.mem)); show(); };
    q('#thr').onchange = e => { LS.set('dz.thr', e.target.value); parInfo(); };
    q('#chg').onchange = e => { ack = e.target.checked; show(); };
    q('#unlock').onclick = unlock;
    q('#tok').addEventListener('keydown', e => { if (e.key === 'Enter') unlock(); });
    q('#file').onchange = onFile;
    q('#fps').onchange = updFrames;
    q('#nfr').oninput = () => { q('#nfrv').textContent = q('#nfr').value; };
    q('#qp').oninput = () => { q('#qpv').textContent = q('#qp').value; };
    q('#go').onclick = start;
    q('#stop').onclick = () => stopJob('Остановлено вами.');
    runCheck();
  }

  if (!customElements.get('danger-zone')) customElements.define('danger-zone', DangerZone);
})();
