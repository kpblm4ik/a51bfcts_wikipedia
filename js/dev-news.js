/* Вкладка «Новости» в dev.html: автор пишет статью, ставит одно фото в шапку, дата проставляется сама в момент публикации. */
(function (W) {
  const BR = 'main', SITE = 'https://kpblm4ik.github.io/a51bfcts_wikipedia/';
  const TRN = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
  const slugify = t => t.toLowerCase().split('').map(c => TRN[c] !== undefined ? TRN[c] : c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  const q = s => document.querySelector(s);
  const E = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const b64d = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
  const J = async (p, o) => {
    const r = await fetch('https://api.github.com/repos/' + REPO + p, Object.assign({ cache: 'no-store' }, o, { headers: Object.assign({ Authorization: 'Bearer ' + T, Accept: 'application/vnd.github+json' }, o && o.body ? { 'Content-Type': 'application/json' } : {}) }));
    if (!r.ok) { let m = ''; try { m = (await r.json()).message; } catch (e) {} throw new Error('GitHub ' + r.status + (m ? ': ' + m : '')); }
    return r.json();
  };
  const L = (cls, m) => { const l = q('#nwL'); l.hidden = false; l.insertAdjacentHTML('beforeend', '<div style="color:' + (cls === 'err' ? '#ff7a8a' : '#8dffb0') + '">' + E(m) + '</div>'); };
  const TA = 'width:100%;padding:13px;border-radius:12px;border:1px solid #4a3a8a;background:#0e0b16;color:#fff;font:inherit;margin:8px 0;min-height:220px';
  let photo = null;

  W.newsView = () => `<div class="item"><b>Новая статья</b>
<input id="nwT" placeholder="Заголовок" maxlength="120" autocomplete="off">
<input id="nwA" placeholder="Автор" maxlength="60" autocomplete="off">
<p><small>Фото в шапку газеты (одно). Заголовок ляжет поверх него.</small><br><input type="file" id="nwF" accept="image/*"></p><div id="nwP"></div>
<textarea id="nwB" placeholder="Текст статьи. Можно Markdown: **жирный**, *курсив*, ## подзаголовок, - список" style="${TA}"></textarea>
<p><small>Дата поставится сама в момент публикации.</small></p>
<button id="nwGo">📰 Опубликовать</button><div id="nwL" hidden style="margin-top:10px;font-size:13px;word-break:break-word"></div></div>
<div class="item"><b>Опубликованные</b><div id="nwList">Загрузка…</div></div>`;

  async function pack(f) {
    const bmp = await createImageBitmap(f), k = Math.min(1, 1600 / bmp.width), c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const tb = (t, qq) => new Promise(r => c.toBlob(r, t, qq));
    let b = await tb('image/avif', 0.6), ext = 'avif';
    if (!b || b.type !== 'image/avif') { b = await tb('image/webp', 0.82); ext = 'webp'; }
    const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(b); });
    return { ext, b64, url: URL.createObjectURL(b), size: b.size };
  }

  async function commit(files, message) {
    const ref = await J('/git/ref/heads/' + BR), base = (await J('/git/commits/' + ref.object.sha)).tree.sha, tree = [];
    for (const f of files) {
      if (f.del) { tree.push({ path: f.path, mode: '100644', type: 'blob', sha: null }); continue; }
      const b = await J('/git/blobs', { method: 'POST', body: JSON.stringify(f.b64 ? { content: f.b64, encoding: 'base64' } : { content: f.text, encoding: 'utf-8' }) });
      tree.push({ path: f.path, mode: '100644', type: 'blob', sha: b.sha });
    }
    const t = await J('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base, tree }) });
    const c = await J('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: t.sha, parents: [ref.object.sha] }) });
    await J('/git/refs/heads/' + BR, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
    return c;
  }

  const qt = s => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  async function publish() {
    const title = q('#nwT').value.replace(/\s+/g, ' ').trim(), body = q('#nwB').value.trim(), author = q('#nwA').value.replace(/\s+/g, ' ').trim();
    if (!title || !body || !photo) throw new Error('Нужны заголовок, фото и текст.');
    let ex = []; try { ex = await J('/contents/news?ref=' + BR); } catch (e) {}
    const names = new Set(ex.map(x => x.name)); let base = slugify(title) || 'news', slug = base, i = 2;
    while (names.has(slug + '.md')) slug = base + '-' + i++;
    const now = new Date(), pub = now.toISOString().replace(/\.\d+Z$/, 'Z');
    const ru = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s?г\.$/, '');
    const imgFinal = 'news-' + slug + '.avif', imgUp = 'news-' + slug + '.' + photo.ext;
    const plain = body.replace(/[#*_>`\[\]-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 150);
    const md = ['---', 'layout: article', 'title: ' + qt(title), 'permalink: /news/' + slug + '.html', 'pub: "' + pub + '"', 'date_ru: "' + ru + '"', 'img: ' + imgFinal, author ? 'author: ' + qt(author) : null, 'split: false', 'description: ' + qt(plain), '---', '', body, ''].filter(x => x !== null).join('\n');
    const c = await commit([{ path: 'news/' + slug + '.md', text: md }, { path: 'images/' + imgUp, b64: photo.b64 }], 'Новость: ' + title);
    L('ok', 'Опубликовано (' + ru + '). Сайт обновится через 1–2 минуты: ' + SITE + 'news/' + slug + '.html');
    if (imgUp !== imgFinal) L('ok', 'Фото зальётся как ' + photo.ext + ', сервер переведёт его в AVIF примерно за минуту.');
    L('ok', c.html_url);
  }

  async function list() {
    const box = q('#nwList'); if (!box) return;
    try {
      let ex = []; try { ex = await J('/contents/news?ref=' + BR); } catch (e) {}
      const items = [];
      for (const f of ex.filter(x => /\.md$/.test(x.name))) {
        const t = b64d((await J('/contents/news/' + f.name + '?ref=' + BR)).content), g = k => { const m = t.match(new RegExp('^' + k + ':\\s*"?(.*?)"?\\s*$', 'm')); return m ? m[1] : ''; };
        items.push({ name: f.name, title: g('title').replace(/\\"/g, '"'), pub: g('pub'), ru: g('date_ru'), img: g('img') });
      }
      items.sort((a, b) => b.pub.localeCompare(a.pub));
      box.innerHTML = items.map((n, i) => `<p><small>${E(n.ru)}</small><br>${E(n.title)}<br><button data-del="${i}" style="padding:6px 12px;margin-top:4px">🗑 Удалить</button></p>`).join('') || 'Пока пусто.';
      box.onclick = async e => {
        const i = e.target.dataset.del; if (i === undefined) return; const n = items[+i];
        if (!confirm('Удалить новость «' + n.title + '»?')) return;
        try {
          const files = [{ path: 'news/' + n.name, del: true }];
          if (n.img) { try { await J('/contents/images/' + n.img + '?ref=' + BR); files.push({ path: 'images/' + n.img, del: true }); } catch (er) {} }
          await commit(files, 'Удалена новость: ' + n.title); list();
        } catch (er) { L('err', er.message); }
      };
    } catch (e) { box.textContent = 'Ошибка: ' + e.message; }
  }

  W.newsInit = () => {
    q('#nwF').onchange = async e => {
      const f = e.target.files[0]; if (!f) return; q('#nwP').textContent = 'Обрабатываю…';
      try { photo = await pack(f); q('#nwP').innerHTML = '<img src="' + photo.url + '" style="max-width:100%;border-radius:12px"><br><small>' + (photo.size / 1024).toFixed(0) + ' КБ, ' + photo.ext + '</small>'; }
      catch (er) { photo = null; q('#nwP').textContent = 'Не получилось обработать фото: ' + er.message; }
    };
    q('#nwGo').onclick = async () => {
      const b = q('#nwGo'); b.disabled = true; q('#nwL').innerHTML = '';
      try { await publish(); photo = null; q('#nwT').value = q('#nwB').value = ''; q('#nwP').innerHTML = ''; q('#nwF').value = ''; list(); }
      catch (e) { L('err', e.message); }
      b.disabled = false;
    };
    q('#nwA').value = localStorage.getItem('nw-author') || ''; q('#nwA').oninput = e => localStorage.setItem('nw-author', e.target.value);
    list();
  };
})(window);
