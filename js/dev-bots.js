/* Вкладка «Боты» в dev.html: список чужих парсеров + запуск workflow bot-test с прогрессом и логами.
   Новый парсер в список: одна строка в BOTS. Использует глобальные из dev.html: $, esc, gh, API, T. */
const BOTS = [
 ['microsoft/playwright', 'браузер + JS', 'Настоящий headless-браузер: ждёт появления полей, заполняет и жмёт как человек. Уже запускается кнопкой выше.', 'Работает ли ловушка по времени, когда бот жмёт сразу'],
 ['puppeteer/puppeteer', 'браузер + JS', 'Chrome под управлением скрипта, видит весь DOM, включая скрытые поля.', 'Honeypot: заполнит ли бот скрытое поле'],
 ['SeleniumHQ/selenium', 'браузер + JS', 'Классика автоматизации браузера, часто встречается у спам-ботов.', 'То же, что Puppeteer; известный почерк'],
 ['apify/crawlee', 'браузер + JS', 'Фреймворк краулеров на Playwright/Puppeteer: обходит все ссылки сайта.', 'Видит ли он work.html и ads.html, уходит ли в /tools, уважает ли noindex'],
 ['ultrafunkamsterdam/undetected-chromedriver', 'браузер + JS + маскировка', 'Selenium, маскирующийся под обычный Chrome. Самый непредсказуемый из списка.', 'Блокируется ли, когда бот не выдаёт себя как автомат'],
 ['berstend/puppeteer-extra', 'браузер + JS + маскировка', 'Puppeteer с плагином stealth, скрывающим признаки автоматизации.', 'То же: защита не должна опираться на признаки «это бот»'],
 ['scrapy/scrapy', 'HTTP без JS', 'Качает HTML и парсит без выполнения скриптов: форма рисуется JS, полей в HTML нет.', 'Должен не найти форму и не найти endpoint'],
 ['mechanicalsoup/MechanicalSoup', 'HTTP без JS', 'Автозаполнение форм из HTML, без браузера.', 'То же: JS-форма для него невидима'],
 ['gocolly/colly', 'HTTP без JS', 'Быстрый парсер на Go, массовый обход страниц.', 'Нагрузка и поведение при быстром обходе']
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let btRunId = 0;

function botsView() {
  return '<div class="item"><b>Запуск в облаке (GitHub Actions)</b><br><small>Playwright против сайта: режимы naive, smart, patient на work.html и ads.html. Нужен токен с правом Actions: Read and write.</small>' +
    '<input id="bt-target" value="https://kpblm4ik.github.io/a51bfcts_wikipedia/">' +
    '<button id="bt-run">Запустить Playwright</button>' +
    '<div class="bar"><i id="bt-bar"></i></div><div id="bt-status"><small>Загружаю последний запуск…</small></div><div id="bt-steps"></div><pre class="log" id="bt-log" hidden></pre></div>' +
    '<div class="item"><b>Тестируй только свой сайт.</b> Чужие парсеры из списка ниже запускай против своего адреса, в небольшом объёме. После прогона смотри вкладки «Работа» и «Реклама»: лишних заявок быть не должно.</div>' +
    BOTS.map(b => `<div class="item"><a href="https://github.com/${b[0]}" target="_blank" rel="noopener"><b>${esc(b[0])}</b></a><span class="tag">${esc(b[1])}</span><br>${esc(b[2])}<br><small>Проверяем: ${esc(b[3])}</small></div>`).join('');
}

async function botsInit() {
  $('#bt-run').onclick = btRun;
  try {
    const d = await gh('/actions/workflows/bot-test.yml/runs?per_page=1');
    const run = (d.workflow_runs || [])[0];
    if (run) btWatch(run.id); else $('#bt-status').innerHTML = '<small>Запусков ещё не было</small>';
  } catch (e) {
    $('#bt-status').innerHTML = '<small>Нет данных о запусках (' + esc(e) + '). Если workflow только что добавлен, нажми «Запустить».</small>';
  }
}

/* Запуск ищем по id (новее того, что было до кнопки), а не по времени: часы телефона могут спешить или отставать */
async function btRun() {
  const st = $('#bt-status'), btn = $('#bt-run');
  btn.disabled = true; st.textContent = 'Запускаю…';
  let before = 0;
  try { const d0 = await gh('/actions/workflows/bot-test.yml/runs?per_page=1'); before = ((d0.workflow_runs || [])[0] || {}).id || 0; } catch (e) {}
  try {
    const r = await fetch(API + '/actions/workflows/bot-test.yml/dispatches', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + T, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main', inputs: { target: $('#bt-target').value.trim() } })
    });
    if (r.status !== 204) {
      st.textContent = 'Не удалось запустить: HTTP ' + r.status + (r.status === 403 || r.status === 404 || r.status === 422 ? ' (нужны права Actions: Read and write у токена, и файл .github/workflows/bot-test.yml должен быть в main)' : '');
      btn.disabled = false; return;
    }
    st.textContent = 'Запуск принят (HTTP 204), жду появления в списке…';
    for (let i = 0; i < 30; i++) {
      await sleep(2500);
      let d; try { d = await gh('/actions/workflows/bot-test.yml/runs?per_page=5'); } catch (e) { continue; }
      const run = (d.workflow_runs || []).find(x => x.id > before);
      if (run) { btn.disabled = false; btWatch(run.id); return; }
    }
    st.textContent = 'Запуск принят GitHub, но в списке не появился за 75 с. Проверь вкладку Actions на GitHub (возможно, Actions выключены в настройках репозитория) или переоткрой вкладку «Боты».';
  } catch (e) { st.textContent = 'Ошибка: ' + e; }
  btn.disabled = false;
}

function btClean(t) {
  return t.replace(/\x1b\[[0-9;]*m/g, '').split('\n').map(l => l.replace(/^\S+Z /, '')).filter(l => l.trim() && !l.startsWith('##[')).slice(-300).join('\n');
}

async function btWatch(id) {
  btRunId = id;
  const mine = id;
  async function tick() {
    if (btRunId !== mine || !$('#bt-bar')) return;
    let run, job;
    try {
      run = await gh('/actions/runs/' + id);
      job = ((await gh('/actions/runs/' + id + '/jobs')).jobs || [])[0];
    } catch (e) { $('#bt-status').textContent = 'Ошибка запроса: ' + e; setTimeout(tick, 6000); return; }
    const steps = job ? job.steps : [];
    const done = steps.filter(s => s.status === 'completed').length;
    const finished = run.status === 'completed';
    const pct = finished ? 100 : steps.length ? Math.round(done / steps.length * 100) : 5;
    $('#bt-bar').style.width = pct + '%';
    $('#bt-bar').style.background = finished ? (run.conclusion === 'success' ? '#5cf2c8' : '#ff7a8a') : '';
    const label = finished ? (run.conclusion === 'success' ? 'Готово: все тесты прошли' : run.conclusion === 'failure' ? 'Готово: есть провалы (бот прошёл защиту или что-то сломалось)' : 'Завершено: ' + run.conclusion) : run.status === 'queued' ? 'В очереди…' : 'Выполняется…';
    $('#bt-status').innerHTML = `<b>${label}</b> ${pct}% · <small>запуск #${run.run_number}, ${new Date(run.created_at).toLocaleString('ru')} · <a href="${run.html_url}" target="_blank" rel="noopener">открыть на GitHub</a></small>`;
    $('#bt-steps').innerHTML = steps.map(s => {
      const ic = s.status === 'completed' ? (s.conclusion === 'success' ? '✅' : s.conclusion === 'skipped' ? '⏭' : '❌') : s.status === 'in_progress' ? '⏳' : '·';
      return `<div><small>${ic} ${esc(s.name)}</small></div>`;
    }).join('');
    if (finished && job) {
      const L = $('#bt-log');
      try {
        const r = await fetch(API + '/actions/jobs/' + job.id + '/logs', { headers: { Authorization: 'Bearer ' + T, Accept: 'application/vnd.github+json' } });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        L.textContent = btClean(await r.text()); L.hidden = false; L.scrollTop = L.scrollHeight;
      } catch (e) {
        L.textContent = 'Логи не удалось загрузить в браузер (' + e.message + '). Открой запуск на GitHub по ссылке выше.'; L.hidden = false;
      }
    }
    if (!finished) setTimeout(tick, 4000);
  }
  $('#bt-log').hidden = true;
  tick();
}
