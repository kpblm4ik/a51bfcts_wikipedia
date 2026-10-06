<style>
  html, body { background-color: #0b090f !important; color: #e2daf0 !important; }
  .container-lg, main, .wrapper {
    background-color: #0b090f !important;
    box-shadow: 0 0 40px rgba(138, 43, 226, 0.4), 0 0 10px rgba(138, 43, 226, 0.2) !important;
    border-radius: 8px; padding: 20px;
  }
  a { color: #a066ff !important; text-shadow: 0 0 5px rgba(160, 102, 255, 0.3); }
  
  /* Скрываем все языки по умолчанию, кроме русского */
  [lang="en"], [lang="es"] { display: none; }
</style>

<!-- ================= РУССКИЙ ЯЗЫК ================= -->
<div lang="ru">
  <h1>Вики a51bfcts</h1>
  <p><em>Area 51 but find coils to survive</em></p>
  <p><img src="Screenshot_20261005_180602.jpg" alt=""></p>
  <h2>⚡ <a href="coils.md">Катушки</a></h2>
  <p><img src="Screenshot_20261005_180545.jpg" alt=""></p>
  <h2>🪄 <a href="wands.md">Палочки</a></h2>
  <p><img src="Screenshot_20261005_180528.jpg" alt=""></p>
  <h2>📦 <a href="other.md">Прочие предметы</a></h2>
</div>

<!-- ================= АНГЛИЙСКИЙ ЯЗЫК ================= -->
<div lang="en">
  <h1>Wiki a51bfcts</h1>
  <p><em>Area 51 but find coils to survive</em></p>
  <p><img src="Screenshot_20261005_180602.jpg" alt=""></p>
  <h2>⚡ <a href="coils.md">Coils</a></h2>
  <p><img src="Screenshot_20261005_180545.jpg" alt=""></p>
  <h2>🪄 <a href="wands.md">Wands</a></h2>
  <p><img src="Screenshot_20261005_180528.jpg" alt=""></p>
  <h2>📦 <a href="other.md">Other Items</a></h2>
</div>

<!-- ================= ИСПАНСКИЙ ЯЗЫК ================= -->
<div lang="es">
  <h1>Wiki a51bfcts</h1>
  <p><em>Area 51 but find coils to survive</em></p>
  <p><img src="Screenshot_20261005_180602.jpg" alt=""></p>
  <h2>⚡ <a href="coils.md">Bobinas</a></h2>
  <p><img src="Screenshot_20261005_180545.jpg" alt=""></p>
  <h2>🪄 <a href="wands.md">Varitas</a></h2>
  <p><img src="Screenshot_20261005_180528.jpg" alt=""></p>
  <h2>📦 <a href="other.md">Otros Objetos</a></h2>
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

<!-- КРОШЕЧНЫЙ СКРИПТ ПЕРЕВОДА -->
<script>
function changeLang(langCode) {
  // Находим все блоки с языками
  const languages = ['ru', 'en', 'es'];
  
  languages.forEach(lang => {
    // Находим все элементы текущего языка
    const elements = document.querySelectorAll(`[lang="${lang}"]`);
    elements.forEach(el => {
      if (lang === langCode) {
        el.style.display = 'block'; // Показываем выбранный язык
      } else {
        el.style.display = 'none'; // Скрываем остальные
      }
    });
  });
}
</script>
