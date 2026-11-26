// Полевой бот на Playwright. Код сайта не знает: ищет поля и кнопки по тегам, заполняет и жмёт.
// Реальные заявки не уходят: все POST и переходы на github.com перехватываются.
// Режимы: naive (все поля, включая скрытые, сразу), smart (только видимые, сразу),
// patient (только видимые, пауза 4 с, контроль: должно отправиться).
import { chromium } from 'playwright';

const BASE = (process.env.TARGET || 'https://kpblm4ik.github.io/a51bfcts_wikipedia/').trim().replace(/\/?$/, '/');
const MODES = (process.env.MODES || 'naive,smart,patient').split(',').map(s => s.trim()).filter(Boolean);
const PAGES = ['work.html', 'ads.html'];

const act = ({ onlyVisible }) => {
  const vis = (el) => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    if (r.width < 2 || r.height < 2) return false;
    if (r.right < 0 || r.bottom < 0 || r.left > innerWidth * 2) return false;
    if (el.getAttribute('aria-hidden') === 'true' || el.tabIndex === -1) return false;
    return true;
  };
  const guess = (el) => {
    const s = ((el.name || '') + ' ' + (el.id || '') + ' ' + (el.placeholder || '') + ' ' + (el.type || '')).toLowerCase();
    if (/mail/.test(s)) return 'bot@example.com';
    if (/url|site|web|link/.test(s)) return 'http://example.com';
    if (/tel|phone/.test(s)) return '+10000000000';
    return 'Automated test message';
  };
  const fields = [...document.querySelectorAll('input,textarea,select')].filter(e => !/^(hidden|submit|button|reset|image|file)$/.test(e.type));
  const filled = []; let skipped = 0;
  for (const el of fields) {
    if (onlyVisible && !vis(el)) { skipped++; continue; }
    if (el.tagName === 'SELECT') { el.selectedIndex = el.options.length - 1; }
    else if (el.type === 'checkbox' || el.type === 'radio') { el.checked = true; }
    else {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, guess(el));
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    filled.push(el);
  }
  let box = filled[0] ? filled[0].parentElement : document.body;
  while (box !== document.body && !filled.every(f => box.contains(f))) box = box.parentElement;
  const btns = [...box.querySelectorAll('button,input[type=submit],[role=button]')];
  btns.forEach(b => b.click());
  return { filled: filled.length, skipped, btns: btns.length };
};

async function runOne(browser, mode, page) {
  const ctx = await browser.newContext();
  const sent = [];
  await ctx.route('**/*', (route) => {
    const rq = route.request(), u = new URL(rq.url());
    if (rq.method() === 'POST') { sent.push('POST ' + rq.url()); return route.fulfill({ status: 200, body: '{}' }); }
    if (u.hostname === 'github.com') { sent.push('переход ' + rq.url().slice(0, 80)); return route.abort(); }
    return route.continue();
  });
  const pg = await ctx.newPage();
  try {
    await pg.goto(BASE + page, { waitUntil: 'load', timeout: 30000 });
    await pg.waitForFunction(() => document.querySelectorAll('input:not([type=hidden]),textarea,select').length >= 2, null, { timeout: 8000 });
  } catch (e) {
    console.log(`FAIL ${mode.toUpperCase()} ${page}: форма не найдена (${e.message.split('\n')[0]})`);
    await ctx.close(); return false;
  }
  if (mode === 'patient') await pg.waitForTimeout(4000);
  const r = await pg.evaluate(act, { onlyVisible: mode !== 'naive' });
  await pg.waitForTimeout(1500);
  const wasSent = sent.length > 0, pass = mode === 'patient' ? wasSent : !wasSent;
  console.log(`${pass ? 'OK  ' : 'FAIL'} ${mode.toUpperCase()} ${page}: ${wasSent ? 'ОТПРАВЛЕНО' : 'ЗАБЛОКИРОВАНО'} (полей заполнено: ${r.filled}, пропущено: ${r.skipped}, кнопок: ${r.btns})${wasSent ? ' -> ' + sent.join('; ') : ''}`);
  await ctx.close();
  return pass;
}

async function scan(page) {
  try {
    const h = await (await fetch(BASE + page)).text();
    const m = h.match(/FORMS_ENDPOINT\s*=\s*("([^"]*)"|null)/i), ep = m && m[2] ? m[2] : '';
    console.log(`HTTP ${page}: ` + (ep ? `endpoint ${ep} открыт для прямого POST (нужна проверка на сервере)` : 'endpoint не задан, прямой POST невозможен'));
  } catch (e) { console.log(`HTTP ${page}: ошибка ${e.message}`); }
}

const total = PAGES.length * MODES.length;
console.log(`Цель: ${BASE}\nРежимы: ${MODES.join(', ')}, всего тестов: ${total}`);
const browser = await chromium.launch();
let ok = 0, i = 0;
for (const p of PAGES) for (const m of MODES) {
  i++; console.log(`[${i}/${total}] ${m} ${p}`);
  if (await runOne(browser, m, p)) ok++;
}
await browser.close();
for (const p of PAGES) await scan(p);
console.log(`ИТОГ: ${ok} из ${total} тестов прошли`);
process.exit(ok === total ? 0 : 1);
