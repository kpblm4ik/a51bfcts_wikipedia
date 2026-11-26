// Боты на Chrome: puppeteer, puppeteer-extra (stealth), crawlee. Выбор через env BOT.
// Реальные заявки не уходят: github.com заблокирован на уровне DNS Chrome, отправки ловит хук из act.js.
// Режимы: naive (все поля, включая скрытые), smart (только видимые), patient (видимые + пауза 4 с, контроль: должно отправиться).
import fs from 'node:fs';

const BOT = process.env.BOT || 'puppeteer';
const BASE = (process.env.TARGET || 'https://kpblm4ik.github.io/a51bfcts_wikipedia/').trim().replace(/\/?$/, '/');
const MODES = (process.env.MODES || 'naive,smart,patient').split(',').map(s => s.trim()).filter(Boolean);
const PAGES = ['work.html', 'ads.html'];
const ACT = fs.readFileSync(new URL('./act.js', import.meta.url), 'utf8');
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--host-resolver-rules=MAP github.com 0.0.0.0'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function formTest(pg, mode, name) {
  try {
    await pg.waitForFunction(() => document.querySelectorAll('input:not([type=hidden]),textarea,select').length >= 2, { timeout: 8000 });
  } catch (e) {
    console.log(`FAIL ${mode.toUpperCase()} ${name}: форма не найдена`);
    return false;
  }
  if (mode === 'patient') await sleep(4000);
  const start = pg.url();
  let popups = 0;
  const br = pg.browser();
  const on = t => { if (t.type() === 'page') popups++; };
  br.on('targetcreated', on);
  const r = await pg.evaluate(`${ACT}\n;window.__act(${mode !== 'naive'})`);
  await sleep(1500);
  br.off('targetcreated', on);
  const sent = [];
  try { sent.push(...(await pg.evaluate('window.__sent||[]'))); } catch (e) { sent.push('страница ушла (контекст потерян)'); }
  if (pg.url() !== start) sent.push('переход ' + pg.url().slice(0, 80));
  if (popups) sent.push('новое окно');
  const wasSent = sent.length > 0, pass = mode === 'patient' ? wasSent : !wasSent;
  console.log(`${pass ? 'OK  ' : 'FAIL'} ${mode.toUpperCase()} ${name}: ${wasSent ? 'ОТПРАВЛЕНО' : 'ЗАБЛОКИРОВАНО'} (полей заполнено: ${r.filled}, пропущено: ${r.skipped}, кнопок: ${r.btns})${wasSent ? ' -> ' + sent.join('; ') : ''}`);
  return pass;
}

async function scan(page) {
  try {
    const h = await (await fetch(BASE + page)).text();
    const m = h.match(/FORMS_ENDPOINT\s*=\s*("([^"]*)"|null)/i), ep = m && m[2] ? m[2] : '';
    console.log(`HTTP ${page}: ` + (ep ? `endpoint ${ep} открыт для прямого POST (нужна проверка на сервере)` : 'endpoint не задан, прямой POST невозможен'));
  } catch (e) { console.log(`HTTP ${page}: ошибка ${e.message}`); }
}

async function runBrowser() {
  let puppeteer;
  if (BOT === 'puppeteer-extra') {
    const pe = (await import('puppeteer-extra')).default;
    const st = (await import('puppeteer-extra-plugin-stealth')).default;
    pe.use(st());
    puppeteer = pe;
  } else {
    puppeteer = (await import('puppeteer')).default;
  }
  const total = PAGES.length * MODES.length;
  console.log(`Бот: ${BOT}\nЦель: ${BASE}\nРежимы: ${MODES.join(', ')}, всего тестов: ${total}`);
  const browser = await puppeteer.launch({ headless: true, args: ARGS });
  let ok = 0, i = 0;
  for (const p of PAGES) for (const m of MODES) {
    i++; console.log(`[${i}/${total}] ${m} ${p}`);
    const pg = await browser.newPage();
    let pass = false;
    try {
      await pg.goto(BASE + p, { waitUntil: 'load', timeout: 30000 });
      pass = await formTest(pg, m, p);
    } catch (e) { console.log(`FAIL ${m.toUpperCase()} ${p}: ${e.message.split('\n')[0]}`); }
    if (pass) ok++;
    await pg.close().catch(() => {});
  }
  await browser.close();
  for (const p of PAGES) await scan(p);
  return [ok, total];
}

async function runCrawlee() {
  const { PuppeteerCrawler } = await import('crawlee');
  console.log(`Бот: crawlee\nЦель: ${BASE}\nОбход всего сайта, на work.html и ads.html форма заполняется в режиме smart`);
  const visited = [];
  let ok = 0, total = 0;
  const crawler = new PuppeteerCrawler({
    maxRequestsPerCrawl: 40,
    maxConcurrency: 1,
    launchContext: { launchOptions: { headless: true, args: ARGS } },
    requestHandler: async ({ page, request, enqueueLinks }) => {
      const u = new URL(request.loadedUrl || request.url);
      visited.push(u.pathname);
      try { await enqueueLinks({ globs: [BASE + '**'] }); } catch (e) {}
      const name = u.pathname.split('/').pop();
      if (PAGES.includes(name)) {
        total++;
        if (await formTest(page, 'smart', name)) ok++;
      }
    },
    failedRequestHandler: async ({ request }) => { console.log('Не удалось загрузить: ' + request.url); }
  });
  await crawler.run([BASE]);
  const uniq = [...new Set(visited)];
  console.log(`Краулер посетил страниц: ${uniq.length}`);
  console.log(uniq.map(x => '  ' + x).join('\n'));
  const tools = uniq.filter(x => /\/tools\//.test(x));
  console.log(tools.length ? `ВНИМАНИЕ: краулер зашёл в служебные страницы: ${tools.join(', ')}` : 'В служебные страницы /tools краулер не заходил');
  for (const p of PAGES) if (!uniq.some(x => x.endsWith('/' + p))) console.log(`Краулер не нашёл ${p} по ссылкам`);
  for (const p of PAGES) await scan(p);
  return [ok, total];
}

const [ok, total] = BOT === 'crawlee' ? await runCrawlee() : await runBrowser();
console.log(`ИТОГ: ${ok} из ${total} тестов прошли`);
process.exit(ok === total ? 0 : 1);
