/* Сервис-воркер изоляции страницы. Добавляет к ответам заголовки COOP/COEP, которые GitHub Pages
   сам отдать не может. Включается и выключается галочкой «Изолировать страницу» (js/isolate.js).
   Область действия: папка сайта. Ничего не кэширует и не меняет содержимое ответов. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.cache === 'only-if-cached' && r.mode !== 'same-origin') return;
  /* COEP credentialless: запросы no-cors к чужим сайтам идут без куки */
  const req = r.mode === 'no-cors' ? new Request(r, { credentials: 'omit' }) : r;
  e.respondWith(
    fetch(req).then(res => {
      if (res.status === 0) return res;
      const h = new Headers(res.headers);
      h.set('Cross-Origin-Embedder-Policy', 'credentialless');
      h.set('Cross-Origin-Opener-Policy', 'same-origin');
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
    }).catch(() => Response.error())
  );
});
