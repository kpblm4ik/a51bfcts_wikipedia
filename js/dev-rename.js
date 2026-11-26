/* Вкладка «Файлы» в dev.html: переименование страниц и их файлов с правкой всех ссылок по репозиторию. Один коммит. */
(function (W) {
  const BR = 'main', SECS = ['coils', 'wands', 'other', 'mobs', 'places'];
  const TXT = /\.(md|html|json|xml|js|css|yml|yaml|svg|txt)$/i, SKIP = /^(_site|node_modules|\.git)\//;
  const TRN = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
  const translit = t => t.toLowerCase().split('').map(c => TRN[c] !== undefined ? TRN[c] : c).join('').replace(/[^a-z0-9]+/g, '');
  const q = s => document.querySelector(s), X = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const E = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const b64d = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
  const J = async (p, o) => {
    const r = await fetch('https://api.github.com/repos/' + REPO + p, Object.assign({ cache: 'no-store' }, o, { headers: Object.assign({ Authorization: 'Bearer ' + T, Accept: 'application/vnd.github+json' }, o && o.body ? { 'Content-Type': 'application/json' } : {}) }));
    if (!r.ok) { let m = ''; try { m = (await r.json()).message; } catch (e) {} throw new Error('GitHub ' + r.status + (m ? ': ' + m : '')); }
    return r.json();
  };
  const ST = { tree: null, files: {}, pages: [], pl: null, pairs: [] };
  const msg = h => { q('#rnMsg').innerHTML = h; };
  const bad = e => msg('<span style="color:#ff7a8a">' + E(e.message || e) + '</span>');

  W.renView = () => `<div class="item"><b>Переименование страниц и файлов</b><br><small>Меняет адрес страницы, её картинки (имя, имя-b…) и обложку и сам правит все ссылки на них по всему репозиторию. Один коммит.</small>
<p><button id="rnScan">🔍 Найти страницы</button></p><div id="rnMsg"></div><div id="rnList" style="max-height:55vh;overflow:auto"></div>
<p id="rnAct" hidden><label><input type="checkbox" id="rnRedir" checked style="width:auto;margin:0 8px 0 0">оставить редирект со старого адреса</label></p>
<p><button id="rnPlan" hidden>👁 Показать изменения</button> <button id="rnGo" hidden>✅ Применить</button></p><pre class="log" id="rnLog" hidden></pre></div>`;

  async function suggest(title) {
    try {
      const j = await (await fetch('https://api.mymemory.translated.net/get?langpair=ru|en&q=' + encodeURIComponent(title))).json();
      const t = (j.responseData && j.responseData.translatedText) || '';
      if (/MYMEMORY|QUERY LENGTH/i.test(t)) return '';
      return t.toLowerCase().replace(/\b(of|the|a|an)\b/g, '').replace(/[^a-z0-9]+/g, '');
    } catch (e) { return ''; }
  }

  async function scan() {
    msg('Читаю репозиторий…'); q('#rnLog').hidden = true;
    const ref = await J('/git/ref/heads/' + BR); ST.head = ref.object.sha;
    const cm = await J('/git/commits/' + ST.head); ST.base = cm.tree.sha;
    const tr = await J('/git/trees/' + ST.base + '?recursive=1');
    if (tr.truncated) throw new Error('Репозиторий слишком большой для обхода.');
    ST.tree = {}; tr.tree.filter(x => x.type === 'blob').forEach(x => ST.tree[x.path] = x);
    const tp = Object.keys(ST.tree).filter(p => TXT.test(p) && !SKIP.test(p) && ST.tree[p].size < 400000);
    ST.files = {}; let i = 0, n = 0;
    await Promise.all(Array.from({ length: 8 }, async () => { while (i < tp.length) { const p = tp[i++]; ST.files[p] = b64d((await J('/git/blobs/' + ST.tree[p].sha)).content); msg('Читаю файлы: ' + (++n) + '/' + tp.length); } }));
    ST.pages = Object.keys(ST.tree).map(p => p.match(/^docs\/([^/]+)\.md$/)).filter(m => m && !SECS.includes(m[1])).map(m => {
      const t = (ST.files[m[0]] || '').match(/^# (.+)$/m), title = t ? t[1].trim() : '';
      const cand = /[а-яё]/i.test(title) && (translit(title) === m[1].toLowerCase() || /(aya|oya|ushk|ovaya|zh|sch|yy)/.test(m[1]));
      return { slug: m[1], title, cand };
    }).sort((a, b) => b.cand - a.cand || a.slug.localeCompare(b.slug));
    q('#rnList').innerHTML = ST.pages.map((p, i) => `<div class="item" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input type="checkbox" data-c="${i}" ${p.cand ? 'checked' : ''} style="width:auto;margin:0"><span style="flex:1 1 130px"><b>${E(p.slug)}</b>${p.cand ? ' <span class="tag">транслит</span>' : ''}<br><small>${E(p.title)}</small></span><input data-n="${i}" placeholder="новое имя" style="flex:1 1 130px;margin:0"></div>`).join('') || '<p>Страниц нет</p>';
    q('#rnPlan').hidden = false; q('#rnAct').hidden = false; q('#rnGo').hidden = true;
    msg('Страниц: ' + ST.pages.length + '. Подбираю английские имена для транслита…');
    for (const [i, p] of ST.pages.entries()) { if (!p.cand) continue; const s = await suggest(p.title), el = q('[data-n="' + i + '"]'); if (el && !el.value && s && s !== p.slug) el.value = s; await new Promise(r => setTimeout(r, 300)); }
    msg('Готово. Проверь имена (можно править руками), отметь нужные страницы и нажми «Показать изменения».');
  }

  function plan(pairs) {
    const errs = [], moves = [], F = Object.assign({}, ST.files), cnt = {};
    const used = new Set(pairs.map(p => p[1].toLowerCase()));
    if (used.size < pairs.length) errs.push('Есть одинаковые новые имена.');
    for (const [o, n] of pairs) {
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,60}$/.test(n)) errs.push('«' + n + '»: только латиница, цифры, - и _.');
      else if (ST.tree['docs/' + n + '.md'] || SECS.includes(n)) errs.push('«' + n + '» уже занято страницей.');
      const re = new RegExp('^(.*\\/)?' + X(o) + '((?:-[b-e])?)\\.([A-Za-z0-9]+)$');
      for (const p of Object.keys(ST.tree)) {
        if (SKIP.test(p)) continue; const m = p.match(re); if (!m) continue;
        const to = (m[1] || '') + n + m[2] + '.' + m[3];
        if (ST.tree[to]) errs.push('файл ' + to + ' уже существует.');
        moves.push({ from: p, to });
      }
    }
    for (const [o, n] of pairs) {
      const re = new RegExp('(?<![A-Za-z0-9_-])' + X(o) + '(?=(?:-[b-e])?\\.(?:html|md|avif|webp|png|jpe?g|svg|gif)(?![A-Za-z0-9_])|(?![A-Za-z0-9_-]))', 'g');
      for (const p in F) { let c = 0; const t = F[p].replace(re, () => (c++, n)); if (c) { F[p] = t; cnt[p] = (cnt[p] || 0) + c; } }
    }
    return { errs, moves, F, cnt };
  }

  async function blob(text) { return (await J('/git/blobs', { method: 'POST', body: JSON.stringify({ content: text, encoding: 'utf-8' }) })).sha; }
  async function apply() {
    const pl = ST.pl, pairs = ST.pairs, redir = q('#rnRedir').checked, entries = [], moved = new Set(pl.moves.map(m => m.from));
    if ((await J('/git/ref/heads/' + BR)).object.sha !== ST.head) throw new Error('В репозитории появился новый коммит. Нажми «Найти страницы» заново.');
    for (const m of pl.moves) {
      const e = ST.tree[m.from]; entries.push({ path: m.from, mode: e.mode, type: 'blob', sha: null });
      entries.push({ path: m.to, mode: e.mode, type: 'blob', sha: m.from in pl.F ? await blob(pl.F[m.from]) : e.sha });
    }
    for (const p in pl.cnt) if (!moved.has(p)) entries.push({ path: p, mode: ST.tree[p].mode, type: 'blob', sha: await blob(pl.F[p]) });
    if (redir) for (const [o, n] of pairs) {
      if (ST.tree[o + '.html']) continue;
      entries.push({ path: o + '.html', mode: '100644', type: 'blob', sha: await blob('<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=' + n + '.html"><link rel="canonical" href="' + n + '.html"><a href="' + n + '.html">' + n + '</a>\n') });
    }
    const t = await J('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: ST.base, tree: entries }) });
    const c = await J('/git/commits', { method: 'POST', body: JSON.stringify({ message: 'Переименование: ' + pairs.map(p => p[0] + ' → ' + p[1]).join(', '), tree: t.sha, parents: [ST.head] }) });
    await J('/git/refs/heads/' + BR, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
    return c;
  }

  W.renInit = () => {
    q('#rnScan').onclick = () => scan().catch(bad);
    q('#rnPlan').onclick = () => {
      const pairs = []; ST.pages.forEach((p, i) => { const n = q('[data-n="' + i + '"]').value.trim(); if (q('[data-c="' + i + '"]').checked && n && n !== p.slug) pairs.push([p.slug, n]); });
      if (!pairs.length) return msg('Отметь страницы и впиши новые имена.');
      const pl = plan(pairs), L = q('#rnLog'); ST.pl = pl; ST.pairs = pairs; L.hidden = false;
      L.textContent = pairs.map(p => p[0] + ' → ' + p[1]).join('\n') + '\n\nФайлы переедут (' + pl.moves.length + '):\n' + pl.moves.map(m => '  ' + m.from + ' → ' + m.to).join('\n') +
        '\n\nСсылки обновятся в ' + Object.keys(pl.cnt).length + ' файлах:\n' + Object.keys(pl.cnt).map(p => '  ' + p + ' (' + pl.cnt[p] + ')').join('\n') +
        (pl.errs.length ? '\n\n❌ Нельзя применить:\n' + pl.errs.map(e => '  ' + e).join('\n') : '');
      q('#rnGo').hidden = !!pl.errs.length;
    };
    q('#rnGo').onclick = async () => {
      const b = q('#rnGo'); b.disabled = true;
      try { const c = await apply(); q('#rnLog').textContent += '\n\n✅ Готово: ' + c.html_url + '\nСайт обновится через 1–2 минуты. Старые ссылки ведут на новые через редирект.'; b.hidden = true; ST.tree = null; q('#rnList').innerHTML = ''; q('#rnPlan').hidden = true; msg('Нажми «Найти страницы», чтобы обновить список.'); }
      catch (e) { bad(e); }
      b.disabled = false;
    };
  };
})(window);
