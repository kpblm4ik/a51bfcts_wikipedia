/* Автоисправление текста в редакторе страниц. Подключается из dev.html (вкладка «Создать страницу»).
   Локальные правила: пробелы, знаки препинания, заглавная в начале предложения, кавычки «ёлочки», повтор слов.
   Орфография и запятые: бесплатный LanguageTool (только кириллица, имена и теги/ссылки/пути не трогаются).
   Всё отменяется кнопкой «Отменить». */
(function () {
  if (window.__ac) return; window.__ac = 1;
  const D = document, $ = s => D.querySelector(s);
  const SEL = 'textarea.mdta,#title,input[data-f="desc"],input[data-s][data-k="h"]';
  const LSK = 'ac-on', IGN = 'ac-ign';
  const ld = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (e) { return d; } };
  const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  /* что не трогаем: шапка ---, теги, (ссылки), `код`, адреса, имена файлов, &сущности; */
  const PROT = /(^---\n[\s\S]*?\n---\n?)|(<[^>]+>)|(\]\([^)]*\))|(`[^`\n]*`)|(https?:\/\/\S+)|([\w.\/-]+\.(?:html|md|avif|webp|png|jpe?g|svg|gif|json|js|css)(?!\w))|(&#?\w+;)/g;
  function split(s) {
    const r = []; let i = 0, m; PROT.lastIndex = 0;
    while ((m = PROT.exec(s))) { if (m.index > i) r.push({ t: s.slice(i, m.index), p: 0 }); r.push({ t: m[0], p: 1 }); i = m.index + m[0].length; }
    if (i < s.length) r.push({ t: s.slice(i), p: 0 });
    return r;
  }
  const fixPlain = t => t
    .replace(/(\S) {2,}(?=\S)/g, '$1 ')
    .replace(/[ \t]+(?=\n)/g, '')
    .replace(/([\p{L}\d)»]) +([,;!?]|\.(?![\p{L}\d.])|:(?=\s|$))/gu, '$1$2')
    .replace(/([,;!?])(?=\p{L})/gu, '$1 ')
    .replace(/([а-яё])\.(?=[А-ЯЁ])/g, '$1. ')
    .replace(/(?<![\p{L}\d])([а-яё]+) \1(?![\p{L}\d-])/giu, '$1')
    .replace(/(\p{L}{3,}[.!?…]) +([а-яё])/gu, (m, a, b) => a + ' ' + b.toUpperCase())
    .replace(/"([^"\n]*[а-яё][^"\n]*)"/gi, '«$1»');

  async function lt(parts) {
    const text = parts.map(p => p.t).join('');
    if (text.length > 15000 || !/[а-яё]{3}/i.test(text)) return { text, ch: [] };
    const r = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ language: 'ru-RU', data: JSON.stringify({ annotation: parts.map(p => p.p ? { markup: p.t } : { text: p.t }) }) })
    });
    if (!r.ok) throw new Error('LanguageTool ' + r.status);
    const j = await r.json(), ign = ld(IGN, []), prot = [], segs = []; let fo = 0, po = 0;
    parts.forEach(p => { if (p.p) prot.push([fo, fo + p.t.length]); else { segs.push([po, fo, p.t.length]); po += p.t.length; } fo += p.t.length; });
    const toFull = (x, end) => { for (const [p, f, l] of segs) if (end ? (x > p && x <= p + l) : (x >= p && x < p + l)) return f + x - p; return -1; };
    const plain = parts.filter(p => !p.p).map(p => p.t).join(''), ms = [];
    for (const m of j.matches || []) {
      const rep = m.replacements[0] && m.replacements[0].value; if (!rep) continue;
      const c = m.context, want = c.text.substr(c.offset, c.length);
      let a = m.offset, b = a + m.length;
      if (text.slice(a, b) !== want) {                       // смещения без учёта разметки: пересчитываем
        if (plain.slice(m.offset, m.offset + m.length) !== want) continue;
        a = toFull(m.offset, 0); b = toFull(m.offset + m.length, 1);
        if (a < 0 || b < 0 || text.slice(a, b) !== want) continue;
      }
      const orig = text.slice(a, b);
      if (prot.some(([s, e]) => a < e && b > s)) continue;
      const id = (m.rule.category.id + ' ' + m.rule.id).toUpperCase(), nz = s => s.replace(/[,\s]/g, '');
      let ok = false;
      if (m.rule.issueType === 'misspelling') {
        const sentStart = /(^|[.!?…:]\s*|\n\s*)$/.test(text.slice(0, a));
        ok = /^[а-яё-]+$/i.test(orig) && /^[а-яё-]+$/i.test(rep) && !ign.includes(orig.toLowerCase()) && !(/^[А-ЯЁ]/.test(orig) && !sentStart);
      } else if (/PUNCT|COMMA/.test(id)) ok = nz(orig) === nz(rep);
      else if (/CASING/.test(id)) ok = orig.toLowerCase() === rep.toLowerCase();
      if (ok) ms.push({ a, b, orig, rep });
    }
    ms.sort((x, y) => x.a - y.a);
    const kept = []; ms.forEach(m => { if (!kept.length || m.a >= kept[kept.length - 1].b) kept.push(m); });
    let out = text; kept.slice().reverse().forEach(m => { out = out.slice(0, m.a) + m.rep + out.slice(m.b); });
    return { text: out, ch: kept.map(m => [m.orig, m.rep]) };
  }

  const last = new WeakMap(); let batch = [], lastCh = [], ltErr = '';
  async function fix(el, manual) {
    const v = el.value; if (!v.trim() || (!manual && last.get(el) === v)) return null;
    const parts = split(v).map(p => p.p ? p : { t: fixPlain(p.t), p: 0 });
    if (parts[0] && !parts[0].p) parts[0].t = parts[0].t.replace(/^(\s*)([а-яё])/, (m, a, b) => a + b.toUpperCase());
    let text = parts.map(p => p.t).join(''), ch = [];
    try { const r = await lt(parts); text = r.text; ch = r.ch; last.set(el, text); }
    catch (e) { ltErr = e.message; }
    if (el.value !== v) return null;                          // пока проверяли, текст поменяли
    if (text === v) return null;
    batch.push([el, v]); el.value = text; el.dispatchEvent(new Event('input', { bubbles: true }));
    return ch;
  }

  const tb = $('#tb'); if (!tb) return;
  tb.insertAdjacentHTML('beforeend', '<button class="ed-btn" id="acNow">✨ Исправить ошибки</button><button class="ed-btn" id="acUndo" hidden>↩ Отменить</button><label><input type="checkbox" id="acOn"> автоисправление при выходе из поля</label><span id="acMsg" class="hint" style="flex-basis:100%"></span>');
  const on = $('#acOn'); on.checked = ld(LSK, true); on.onchange = () => sv(LSK, on.checked);
  function report(n) {
    const e = D.createElement('div'); e.textContent = lastCh.slice(0, 8).map(c => c[0] + ' → ' + c[1]).join('; ');
    $('#acMsg').innerHTML = (n ? '<span class="ok">✓ Исправлено полей: ' + n + '.</span> ' : 'Ошибок не найдено. ') +
      (ltErr ? '<span class="warn">Орфография не проверена (' + ltErr.replace(/[<&]/g, '') + '), поправлены только пробелы и знаки.</span> ' : '') + e.innerHTML;
    $('#acUndo').hidden = !n;
  }
  $('#acNow').onclick = async () => {
    batch = []; lastCh = []; ltErr = ''; $('#acMsg').textContent = 'Проверяю…'; let n = 0;
    for (const el of D.querySelectorAll(SEL)) { if (!el.offsetParent) continue; const r = await fix(el, 1); if (r) { n++; lastCh.push(...r); } }
    report(n);
  };
  $('#acUndo').onclick = () => {
    const ign = ld(IGN, []); lastCh.forEach(c => { if (/^[а-яё-]+$/i.test(c[0])) ign.push(c[0].toLowerCase()); }); sv(IGN, ign);
    batch.forEach(([el, v]) => { el.value = v; last.delete(el); el.dispatchEvent(new Event('input', { bubbles: true })); });
    batch = []; lastCh = []; $('#acUndo').hidden = true; $('#acMsg').textContent = 'Отменено. Слова, которые я «исправил» зря, больше трогать не буду.';
  };
  D.addEventListener('focusout', async e => {
    if (!on.checked || !e.target.matches || !e.target.matches(SEL)) return;
    batch = []; lastCh = []; ltErr = '';
    const r = await fix(e.target); if (r) { lastCh = r; report(1); }
  });
})();
