/* Всплывание текста и плавное появление картинок при прокрутке (как на apple.com).
   Подключается в <head>. Без JS или при «уменьшить движение» всё просто видно. */
(function () {
  var d = document, h = d.documentElement;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches || !('IntersectionObserver' in window)) return;
  h.classList.add('js');

  // Что всплывает. Для новых блоков добавь сюда селектор или класс rv прямо в HTML.
  var SEL = '.rv,.eyebrow,.home h1,.lead,.hero-img,.bar,.home h2,.head .link,.tile .t,.rail,.ctrl,.person,' +
            '.main-sector-card,.item-card,.card-text,.wrapper > h1,.wrapper > h2,.wrapper > h3,.wrapper > p,.wrapper > hr';

  function start() {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; io.unobserve(el);
        el.classList.add('in');
        // после показа убираем служебные классы, чтобы не мешали hover-анимациям
        setTimeout(function () { el.classList.remove('rv', 'in'); el.style.transitionDelay = ''; }, 1400);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    var seen = [];
    [].forEach.call(d.querySelectorAll(SEL), function (el, i) {
      if (seen.indexOf(el) > -1) return; seen.push(el);
      var p = el.parentNode, k = p ? [].indexOf.call(p.children, el) : 0;
      el.classList.add('rv');
      el.style.setProperty('--d', (Math.min(k, 4) * 0.09) + 's');
      io.observe(el);
    });

    // ленивые картинки: плавно проявляются, когда загрузились
    [].forEach.call(d.querySelectorAll('img'), function (im) {
      if (im.complete && im.naturalWidth) return;
      im.classList.add('lz');
      var ok = function () { im.classList.add('ok'); };
      im.addEventListener('load', ok); im.addEventListener('error', ok);
    });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})();
