/* Новости: карусель со слайдами, точками-прогрессом и паузой (как на apple.com) */
(function () {
  var rail = document.getElementById('rail'); if (!rail) return;
  var slides = [].slice.call(rail.children), dots = document.getElementById('dots'), pp = document.getElementById('pp'),
      cur = 0, playing = !matchMedia('(prefers-reduced-motion:reduce)').matches, ds = [];
  slides.forEach(function (_, i) {
    var b = document.createElement('button'); b.className = 'dot'; b.setAttribute('aria-label', 'Слайд ' + (i + 1));
    b.innerHTML = '<i></i>'; b.onclick = function () { go(i); }; dots.appendChild(b); ds.push(b);
  });
  function go(i) {
    i = (i + slides.length) % slides.length;
    var s = slides[i];
    rail.scrollTo({ left: s.offsetLeft - (rail.clientWidth - s.clientWidth) / 2, behavior: 'smooth' });
  }
  function mark(i) {
    cur = i;
    ds.forEach(function (b, k) { b.classList.remove('on', 'run'); void b.offsetWidth; if (k === i) { b.classList.add('on'); if (playing) b.classList.add('run'); } });
  }
  ds.forEach(function (b) { b.firstChild.addEventListener('animationend', function () { if (playing) go(cur + 1); }); });
  var t; rail.addEventListener('scroll', function () {
    clearTimeout(t); t = setTimeout(function () {
      var mid = rail.scrollLeft + rail.clientWidth / 2, best = 0, bd = 1e9;
      slides.forEach(function (s, k) { var dd = Math.abs(s.offsetLeft + s.clientWidth / 2 - mid); if (dd < bd) { bd = dd; best = k; } });
      if (best !== cur) mark(best);
    }, 80);
  }, { passive: true });
  pp.onclick = function () { playing = !playing; pp.classList.toggle('paused', !playing); pp.setAttribute('aria-label', playing ? 'Пауза' : 'Воспроизвести'); mark(cur); };
  pp.classList.toggle('paused', !playing);
  mark(0);
})();
