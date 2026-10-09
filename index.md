<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Вики a51bfcts</title>
  <!-- Напрямую подключаем наш единый файл стилей -->
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <!-- 🔥 ЭКРАН ЗАСТАВКИ -->
  <div id="intro-screen">
    <div class="intro-coil"></div>
    <div class="intro-text">AREA 51 BUT FIND COILS TO SURVIVE</div>
  </div>

  <!-- ГЛАВНЫЙ КОНТЕЙНЕР КОНТЕНТА -->
  <div class="main-wrapper">
    
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
    
  </div>

  <!-- СКРИПТ ПЕРЕВОДА И АВТОУДАЛЕНИЯ ИНТРО -->
  <script>
  function changeLang(langCode) {
    const languages = ['ru', 'en', 'es'];
    languages.forEach(lang => {
      const elements = document.querySelectorAll(`[lang="${lang}"]`);
      elements.forEach(el => {
        if (lang === langCode) el.style.display = 'block';
        else el.style.display = 'none';
      });
    });
    localStorage.setItem('wiki_language', langCode);
  }

  document.addEventListener("DOMContentLoaded", function() {
    const savedLang = localStorage.getItem('wiki_language') || 'ru';
    changeLang(savedLang);

    setTimeout(() => {
      const intro = document.getElementById('intro-screen');
      if (intro) intro.remove();
    }, 3000);
  });
  </script>

</body>
</html>
