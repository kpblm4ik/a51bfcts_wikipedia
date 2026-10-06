<style>
  /* Общие настройки экрана */
  html, body {
    background-color: #050407 !important; /* Внешний глубокий космос вокруг сайта */
    color: #e2daf0 !important;
  }

  /* ГЛАВНЫЙ ЧЁРНЫЙ СЛОЙ: теперь картинка живёт здесь! */
  .container-lg, main, .wrapper {
    position: relative;
    background-color: #0b090f !important; /* Базовый угольно-черный цвет */
    box-shadow: 0 0 40px rgba(138, 43, 226, 0.4), 0 0 10px rgba(138, 43, 226, 0.2) !important; /* Наша фиолетовая аура */
    border-radius: 8px;
    padding: 20px;
    z-index: 1;
    overflow: hidden; /* Чтобы края увеличенной картинки не вылезали за рамку */
  }

  /* Накладываем затемнённый фон прямо ВНУТРЬ чёрного слоя под текст */
  .container-lg::before, main::before, .wrapper::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url('Screenshot_20261006_110338.jpg') !important; /* Файл обложки */
    background-size: cover !important; /* Увеличиваем и растягиваем её */
    background-position: center !important;
    filter: brightness(0.60) contrast(1.4) !important; /* Идеальное 32% затемнение */
    z-index: -1; /* Прячем строго ПОД текст и картинки */
    opacity: 0.9;
  }

  /* Фиолетовые светящиеся ссылки */
  a {
    color: #a066ff !important;
    text-shadow: 0 0 5px rgba(160, 102, 255, 0.3);
  }
  
  /* Скрываем другие языки по умолчанию */
  [lang="en"], [lang="es"] { display: none; }
</style>

<!-- ================= РУССКИЙ ЯЗЫК ================= -->
<div lang="ru">
  <h1>Вики a51bfcts</h1>
  <p><em>Area 51 but find coils to survive</em></p>
  <p><img src="Screenshot_20261005_180602.jpg" alt=""></p>
  <h2>⚡ <a href="coils.html">Катушки</a></h2>
  <p><img src="Screenshot_20261005_180545.jpg" alt=""></p>
  <h2>🪄 <a href="wands.html">Палочки</a></h2>
  <p><img src="Screenshot_20261005_180528.jpg" alt=""></p>
  <h2>📦 <a href="other.html">Прочие предметы</a></h2>
</div>

<!-- ================= АНГЛИЙСКИЙ ЯЗЫК ================= -->
<div lang="en">
  <h1>Wiki a51bfcts</h1>
  <p><em>Area 51 but find coils to survive</em></p>
  <p><img src="Screenshot_20261005_180602.jpg" alt=""></p>
  <h2>⚡ <a href="coils.html">Coils</a></h2>
  <p><img src="Screenshot_20261005_180545.jpg" alt=""></p>
  <h2>🪄 <a href="wands.html">Wands</a></h2>
  <p><img src="Screenshot_20261005_180528.jpg" alt=""></p>
  <h2>📦 <a href="other.html">Other Items</a></h2>
</div>

<!-- ================= ИСПАНСКИЙ ЯЗЫК ================= -->
<div lang="es">
  <h1>Wiki a51bfcts</h1>
  <p><em>Area 51 but find coils to survive</em></p>
  <p><img src="Screenshot_20261005_180602.jpg" alt=""></p>
  <h2>⚡ <a href="coils.html">Bobinas</a></h2>
  <p><img src="Screenshot_20261005_180545.jpg" alt=""></p>
  <h2>🪄 <a href="wands.html">Varitas</a></h2>
  <p><img src="Screenshot_20261005_180528.jpg" alt=""></p>
  <h2>📦 <a href="other.html">Otros Objetos</a></h2>
</div>

<br>
<hr>

<!-- КНОПКИ ПЕРЕКЛЮЧЕНИЯ ЯЗЫКОВ -->
<p align="center" style="font-size: 20px;">
  <span style="cursor:pointer;" onclick="changeLang('ru')">🇷🇺 RU</span> | 
  <span style="cursor:pointer;" onclick="changeLang('en')">🇬🇧 EN</span> | 
  <span style="cursor:pointer;" onclick="changeLang('es')">🇪🇸 ES</span>
</p>

<p align="center">
  <em>Kpblm4ik</em><br>
  <em>boonie144</em><br>
  <em>2026 ©</em><br>
  <small>Защищено лицензией CC BY-NC-ND 4.0</small>
</p>

<!-- СКРИПТ ПЕРЕВОДА С ХРАНИЛИЩЕМ ПАМЯТИ -->
<script>
function changeLang(langCode) {
  const languages = ['ru', 'en', 'es'];
  languages.forEach(lang => {
    const elements = document.querySelectorAll(`[lang="${lang}"]`);
    elements.forEach(el => {
      if (lang === langCode) {
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
    });
  });
  localStorage.setItem('wiki_language', langCode);
}

document.addEventListener("DOMContentLoaded", function() {
  const savedLang = localStorage.getItem('wiki_language') || 'ru';
  changeLang(savedLang);
});
</script>
