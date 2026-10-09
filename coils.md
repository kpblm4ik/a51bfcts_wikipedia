<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Катушки - Вики a51bfcts</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <div class="main-wrapper">
    
    <!-- ================= РУССКИЙ ЯЗЫК ================= -->
    <div lang="ru">
      <h1 style="font-family: 'Rubik Mono One', sans-serif; font-size: 22px; text-shadow: 0 0 10px #a066ff; text-align: center;">⚡ Раздел: Катушки (Coils)</h1>
      <p style="text-align: center;">Добро пожаловать в архив катушек! Нажмите на карточку предмета, чтобы открыть подробный гайд.</p>
      
      <div class="items-grid">
        <!-- КАРТОЧКА 1: Катушка призыва (Кликабельная ссылка) -->
        <a href="summoncoil.html" class="item-card">
          <img src="Screenshot_20261005_180602.jpg" alt="Summon Coil">
          <h3>Катушка призыва</h3>
          <p>🏃 Скорость: 60</p>
          <p>🦘 Прыжок: 16</p>
          <p style="font-size:11px; color:#a066ff; margin-top:5px;">🔮 Подробнее...</p>
        </a>

        <!-- КАРТОЧКА 2: Пиксельный кликер -->
        <div class="item-card">
          <img src="Screenshot_20261005_180545.jpg" alt="Pixel Clicker">
          <h3>Пиксельный кликер</h3>
          <p>🏃 Скорость: ??</p>
          <p>🦘 Прыжок: ??</p>
        </div>
      </div>
    </div>

    <!-- ================= ENGLISH ================= -->
    <div lang="en">
      <h1 style="font-family: 'Rubik Mono One', sans-serif; font-size: 22px; text-align: center;">⚡ Section: Coils</h1>
      <p style="text-align: center;">Click on an item card to open a detailed guide.</p>
      
      <div class="items-grid">
        <a href="summoncoil.html" class="item-card">
          <img src="Screenshot_20261005_180602.jpg" alt="Summon Coil">
          <h3>Summon Coil</h3>
          <p>🏃 Speed: 60</p>
          <p>🦘 Jump: 16</p>
        </div>
        <div class="item-card">
          <img src="Screenshot_20261005_180545.jpg" alt="Pixel Clicker">
          <h3>Pixel Clicker</h3>
        </div>
      </div>
    </div>

    <!-- ================= ESPAÑOL ================= -->
    <div lang="es">
      <h1 style="font-family: 'Rubik Mono One', sans-serif; font-size: 22px; text-align: center;">⚡ Sección: Bobinas</h1>
      
      <div class="items-grid">
        <a href="summoncoil.html" class="item-card">
          <img src="Screenshot_20261005_180602.jpg" alt="Summon Coil">
          <h3>Bobina de Invocación</h3>
        </a>
      </div>
    </div>

    <br>
    <hr>
    
    <!-- КНОПКИ ПЕРЕКЛЮЧЕНИЯ ЯЗЫКОВ -->
    <p align="center" style="font-size: 18px;">
      <span style="cursor:pointer;" onclick="changeLang('ru')">🇷🇺 RU</span> | 
      <span style="cursor:pointer;" onclick="changeLang('en')">🇬🇧 EN</span> | 
      <span style="cursor:pointer;" onclick="changeLang('es')">🇪🇸 ES</span>
    </p>
    <p align="center"><a href="index.html">🔙 На Главную / Back to Main</a></p>
  </div>

  <script>
  function changeLang(langCode) {
    const languages = ['ru', 'en', 'es'];
    languages.forEach(lang => {
      const elements = document.querySelectorAll(`[lang="${lang}"]`);
      elements.forEach(el => {
        if (lang === langCode) el.style.setProperty('display', 'block', 'important');
        else el.style.setProperty('display', 'none', 'important');
      });
    });
    localStorage.setItem('wiki_language', langCode);
  }
  document.addEventListener("DOMContentLoaded", function() {
    const savedLang = localStorage.getItem('wiki_language') || 'ru';
    changeLang(savedLang);
  });
  </script>
</body>
</html>
