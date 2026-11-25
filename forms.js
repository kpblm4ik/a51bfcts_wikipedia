/* Подключи в index.html: <script src="forms.js" defer></script>
   Кнопки: <button data-form="job">Заполнить форму</button> / data-form="ad" */
const REPO = 'kpblm4ik/a51bfcts_wikipedia'; // репозиторий, куда падают заявки (Issues)
(() => {
  const css = `.fm-bg{position:fixed;inset:0;background:#000b;display:none;align-items:center;justify-content:center;z-index:9999;padding:16px}
  .fm-bg.on{display:flex}.fm{background:#1b1625;border:1px solid #6b4fd8;border-radius:20px;padding:20px;width:100%;max-width:420px;color:#fff;font-family:inherit}
  .fm h3{margin:0 0 12px}.fm input,.fm textarea{width:100%;box-sizing:border-box;margin:6px 0;padding:12px;border-radius:12px;border:1px solid #4a3a8a;background:#0e0b16;color:#fff;font:inherit}
  .fm button{width:100%;padding:13px;border:0;border-radius:999px;background:#9b5cff;color:#fff;font:inherit;margin-top:8px}
  .fm .x{background:none;color:#aaa}.fm p{margin:6px 0 0;color:#b9a6ff}
  .coop-row{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:10px;-webkit-overflow-scrolling:touch}
  .coop-row>*{flex:0 0 85%;scroll-snap-align:start}`;
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
  const F = {
    job: { t: 'Работа', f: [['name','Имя'],['contact','Telegram / Discord'],['role','Роль (редактор, датамайнер, переводчик)'],['about','О себе','area']] },
    ad:  { t: 'Реклама', f: [['name','Имя / компания'],['contact','Контакт для связи'],['budget','Бюджет (необязательно)'],['about','Что рекламируем','area']] }
  };
  const bg = document.createElement('div'); bg.className = 'fm-bg';
  document.body.appendChild(bg);
  function open(k) {
    const c = F[k];
    bg.innerHTML = `<form class="fm"><h3>${c.t}</h3>${c.f.map(([n,p,a]) =>
      a ? `<textarea name="${n}" rows="4" placeholder="${p}" required></textarea>` :
      `<input name="${n}" placeholder="${p}" ${n==='budget'?'':'required'}>`).join('')}
      <button>Отправить</button><button type="button" class="x">Закрыть</button><p></p></form>`;
    bg.classList.add('on');
    const form = bg.firstChild, msg = form.querySelector('p');
    form.querySelector('.x').onclick = () => bg.classList.remove('on');
    form.onsubmit = e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      const body = Object.entries(d).map(([k, v]) => `**${k}:** ${v}`).join('\n\n');
      const u = `https://github.com/${REPO}/issues/new?labels=${k}&title=${encodeURIComponent(c.t + ': ' + d.name)}&body=${encodeURIComponent(body)}`;
      window.open(u, '_blank', 'noopener');
      msg.textContent = 'Нажмите «Submit new issue» на GitHub, чтобы отправить заявку.';
    };
  }
  bg.onclick = e => e.target === bg && bg.classList.remove('on');
  document.addEventListener('click', e => { const b = e.target.closest('[data-form]'); if (b) { e.preventDefault(); open(b.dataset.form); } });
})();
