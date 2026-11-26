/* Вкладка «Боты» в dev.html: список парсеров + запуск выбранного бота через workflow bot-test с прогрессом, логами и вердиктом.
   Новый парсер в список: одна строка в BOTS (5-й элемент: имя бота в workflow bot-test.yml, options у input bot).
   Использует глобальные из dev.html: $, esc, gh, API, T. */
const BOTS = [
 ['microsoft/playwright', 'браузер + JS', 'Настоящий headless-браузер: ждёт появления полей, заполняет и жмёт как человек. Запускается выбором в списке выше.', 'Работает ли ловушка по времени, когда бот жмёт сразу', 'playwright'],
 ['puppeteer/puppeteer', 'браузер + JS', 'Chrome под управлением скрипта, видит весь DOM, включая скрытые поля.', 'Honeypot: заполнит ли бот скрытое поле', 'puppeteer'],
 ['SeleniumHQ/selenium', 'браузер + JS', 'Классика автоматизации браузера, часто встречается у спам-ботов.', 'То же, что Puppeteer; известный почерк', 'selenium'],
 ['apify/crawlee', 'браузер + JS', 'Фреймворк краулеров на Playwright/Puppeteer: обходит все ссылки сайта.', 'Видит ли он work.html и ads.html, уходит ли в /tools, уважает ли noindex', 'crawlee'],
 ['ultrafunkamsterdam/undetected-chromedriver', 'браузер + JS + маскировка', 'Selenium, маскирующийся под обычный Chrome. Самый непредсказуемый из списка.', 'Блокируется ли, когда бот не выдаёт себя как автомат', 'uc'],
 ['berstend/puppeteer-extra', 'браузер + JS + маскировка', 'Puppeteer с плагином stealth, скрывающим признаки автоматизации.', 'То же: защита не должна опираться на признаки «это бот»', 'puppeteer-extra'],
 ['scrapy/scrapy', 'HTTP без JS', 'Качает HTML и парсит без выполнения скриптов: форма рисуется JS, полей в HTML нет.', 'Должен не найти форму и не найти endpoint', 'scrapy'],
 ['mechanicalsoup/MechanicalSoup', 'HTTP без JS', 'Автозаполнение форм из HTML, без браузера.', 'То же: JS-форма для него невидима', 'mechanicalsoup'],
 ['gocolly/colly', 'HTTP без JS', 'Быстрый парсер на Go, массовый обход страниц.', 'Нагрузка и поведение при быстром обходе', 'colly']
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let btRunId = 0;

function botsView() {
  return '<div class="item"><b>Запуск в облаке (GitHub Actions)</b><br><small>Выбери бота и запусти против сайта. Браузерные боты проходят режимы naive, smart, patient на work.html и ads.html. HTTP-боты (scrapy, MechanicalSoup, colly) ищут форму в сыром HTML. Нужен токен с правом Actions: Read and write.</small>' +
    '<select id="bt-bot" style="width:100%;padding:13px;border-radius:12px;border:1px solid #4a3a8a;background:#0e0b16;color:#fff;font:inherit;margin:8px 0">' +
    BOTS.map(b => `<option value="${b[4]}">${esc(b[0])} · ${esc(b[1])}</option>`).join('') + '</select>' +
    '<input id="bt-target" value="https://kpblm4ik.github.io/a51bfcts_wikipedia/">' +
    '<button id="bt-run">Запустить бота</button>' +
    '<div class="bar"><i id="bt-bar"></i></div><div id="bt-status"><small>Загружаю последний запуск…</small></div><div id="bt-steps"></div><pre class="log" id="bt-log" hidden></pre><div id="bt-verdict"></div></div>' +
    '<div class="item"><b>Тестируй только свой сайт.</b> Всех ботов запускай против своего адреса, в небольшом объёме. После прогона смотри вкладки «Работа» и «Реклама»: лишних заявок быть не должно.</div>' +
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
  const bot = $('#bt-bot').value;
  btn.disabled = true; st.textContent = 'Запускаю ' + bot + '…';
  let before = 0;
  try { const d0 = await gh('/actions/workflows/bot-test.yml/runs?per_page=1'); before = ((d0.workflow_runs || [])[0] || {}).id || 0; } catch (e) {}
  try {
    const r = await fetch(API + '/actions/workflows/bot-test.yml/dispatches', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + T, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main', inputs: { target: $('#bt-target').value.trim(), bot: bot } })
    });
    if (r.status !== 204) {
      st.textContent = 'Не удалось запустить: HTTP ' + r.status + (r.status === 403 || r.status === 404 || r.status === 422 ? ' (нужны права Actions: Read and write у токена; файл .github/workflows/bot-test.yml должен быть в main и содержать бота «' + bot + '»)' : '');
      btn.disabled = false; return;
    }
    st.textContent = 'Запуск ' + bot + ' принят (HTTP 204), жду появления в списке…';
    let lastErr = '', seen = 0;
    for (let i = 0; i < 48; i++) {
      await sleep(2500);
      let d; try { d = await gh('/actions/workflows/bot-test.yml/runs?per_page=5'); } catch (e) { lastErr = 'HTTP ' + e; continue; }
      const list = d.workflow_runs || []; seen = list.length;
      const run = list.find(x => x.id > before);
      if (run) { btn.disabled = false; btWatch(run.id); return; }
    }
    st.textContent = 'Запуск принят GitHub, но в списке не появился за 2 мин (' + (lastErr ? 'ошибка чтения списка: ' + lastErr + ' — у токена нет права Actions: Read' : 'в списке запусков: ' + seen + ', новых нет') + '). Проверь вкладку Actions на GitHub.';
  } catch (e) { st.textContent = 'Ошибка: ' + e; }
  btn.disabled = false;
}

function btClean(t) {
  return t.replace(/\x1b\[[0-9;]*m/g, '').split('\n').map(l => l.replace(/^\S+Z /, '')).filter(l => l.trim() && !l.startsWith('##[')).slice(-300).join('\n');
}

/* Вердикт по логу: какую защиту бот пробил, какую нет.
   NAIVE = все поля сразу (скрытое поле), SMART = видимые поля сразу (ловушка по времени), PATIENT = контроль, должен отправиться. */
function btVerdict(t) {
  const g = { NAIVE: [], SMART: [], PATIENT: [] }, http = [], ep = [];
  let tools = null, err = 0;
  t.split('\n').forEach(l => {
    let m = l.match(/^(OK|FAIL)\s+(NAIVE|SMART|PATIENT)\s+(\S+?):\s*(.*)$/);
    if (m) { if (/ОТПРАВЛЕНО|ЗАБЛОКИРОВАНО/.test(m[4])) g[m[2]].push([m[3], /ОТПРАВЛЕНО/.test(m[4])]); else err++; return; }
    m = l.match(/^(OK|FAIL)\s+(SCRAPY|MECHANICALSOUP|COLLY)\s+(\S+?):\s*(.*)$/);
    if (m) { http.push([m[3], m[1] === 'FAIL']); return; }
    m = l.match(/^HTTP (\S+?): (.*)$/);
    if (m) { ep.push([m[1], !/не задан/.test(m[2])]); return; }
    if (/ВНИМАНИЕ: краулер зашёл/.test(l)) tools = true;
    else if (/краулер не заходил/.test(l)) tools = false;
  });
  const rows = [], pages = a => a.map(x => x[0]).join(', ');
  const trap = (arr, title, hold, broke) => {
    if (!arr.length) return;
    const bad = arr.filter(x => x[1]);
    rows.push(bad.length ? [false, title, broke + ' (' + pages(bad) + ')'] : [true, title, hold]);
  };
  trap(g.NAIVE, 'Скрытое поле (honeypot)', 'бот не пробил: заявка заблокирована', 'бот пробил: заявка ушла');
  trap(g.SMART, 'Ловушка по времени (бот жмёт сразу)', 'бот не пробил: заявка заблокирована', 'бот пробил: заявка ушла');
  if (http.length) {
    const seen = http.filter(x => x[1]);
    rows.push(seen.length ? [false, 'Форма скрыта от HTML-бота', 'бот увидел форму в HTML (' + pages(seen) + ')'] : [true, 'Форма скрыта от HTML-бота', 'бот формы не нашёл']);
  }
  if (tools !== null) rows.push(tools ? [false, 'Служебные страницы /tools', 'краулер зашёл в них'] : [true, 'Служебные страницы /tools', 'краулер не заходил']);
  if (ep.length) {
    const open = ep.filter(x => x[1]);
    rows.push(open.length ? [false, 'Прямой POST на endpoint', 'endpoint открыт (' + pages(open) + '), нужна проверка на сервере'] : [true, 'Прямой POST на endpoint', 'endpoint не задан, отправить минуя форму нельзя']);
  }
  const broke = rows.filter(r => r[0] === false).length, total = rows.length;
  if (g.PATIENT.length) {
    const blocked = g.PATIENT.filter(x => !x[1]);
    rows.push(blocked.length ? [null, 'Контроль: терпеливый бот', 'защита заблокировала и его, возможно режет живых людей (' + pages(blocked) + ')'] : [true, 'Контроль: терпеливый бот', 'заявка прошла, как у живого человека']);
  }
  if (err) rows.push([null, 'Ошибки теста', 'проверок не выполнено: ' + err + ' (форма не найдена или сбой бота), смотри лог']);
  if (!rows.length) return '<small>Не удалось разобрать лог для вердикта</small>';
  const head = broke ? '<span style="color:#ff7a8a">Бот пробил защиту: ' + broke + ' из ' + total + '</span>' : '<span style="color:#5cf2c8">Бот защиту не пробил (' + total + ' из ' + total + ' выдержали)</span>';
  const ic = r => r[0] === true ? '✅' : r[0] === false ? '❌' : '⚠️';
  return '<div style="margin-top:12px"><b style="color:inherit">' + head + '</b><br><small>✅ защита выдержала · ❌ бот пробил</small>' +
    rows.map(r => `<div style="margin-top:8px">${ic(r)} <b>${esc(r[1])}</b><br><small>${esc(r[2])}</small></div>`).join('') + '</div>';
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
      const L = $('#bt-log'), V = $('#bt-verdict');
      try {
        const r = await fetch(API + '/actions/jobs/' + job.id + '/logs', { cache: 'no-store', headers: { Authorization: 'Bearer ' + T, Accept: 'application/vnd.github+json' } });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const txt = btClean(await r.text());
        L.textContent = txt; L.hidden = false; L.scrollTop = L.scrollHeight;
        if (V) V.innerHTML = btVerdict(txt);
      } catch (e) {
        L.textContent = 'Логи не удалось загрузить в браузер (' + e.message + '). Открой запуск на GitHub по ссылке выше.'; L.hidden = false;
        if (V) V.innerHTML = '<small>Вердикт недоступен без логов</small>';
      }
    }
    if (!finished) setTimeout(tick, 4000);
  }
  $('#bt-log').hidden = true;
  const V0 = $('#bt-verdict'); if (V0) V0.innerHTML = '';
  tick();
}
