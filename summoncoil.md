<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Катушка призыва - Вики a51bfcts</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <div class="main-wrapper">
    
    <!-- ================= РУССКИЙ ЯЗЫК ================= -->
    <div lang="ru">
      <h1 style="font-family: 'Rubik Mono One', sans-serif; font-size: 22px; color: #fff; text-shadow: 0 0 10px #a066ff; text-align: center;">🏗️ Катушка призыва</h1>
      
      <div class="photo-row">
        <div class="photo-col"><img src="Screenshot_20261006_083912.jpg" alt=""></div>
        <div class="photo-col"><img src="Screenshot_20261006_083941.jpg" alt=""></div>
      </div>

      <div class="wiki-infobox">
        <div class="infobox-title">Катушка призыва</div>
        <div class="infobox-grid">
          <div class="infobox-cell label">Сложность получения</div>
          <div class="infobox-value infobox-cell"><span class="difficulty-easy">Легко</span></div>
        </div>
        <div class="infobox-grid">
          <div class="infobox-cell label">🏅 Получение</div>
          <div class="infobox-value infobox-cell" style="color: #a066ff; font-weight: bold;">Значок "Complex Power"</div>
        </div>
        <div class="infobox-section-header">Характеристики</div>
        <div class="infobox-grid">
          <div class="infobox-cell label">🏃 Скорость</div>
          <div class="infobox-value infobox-cell stat-speed">60 единиц</div>
        </div>
        <div class="infobox-grid">
          <div class="infobox-cell label">🦘 Сила прыжка</div>
          <div class="infobox-value infobox-cell stat-jump">16 единиц</div>
        </div>
        <div class="infobox-section-header">Особенности</div>
        <div class="infobox-grid">
          <div class="infobox-cell label">🔮 Способность</div>
          <div class="infobox-value infobox-cell">Спавн блоков 4х2х1 разных цветов</div>
        </div>
      </div>

      <h3>📋 Описание предмета:</h3>
      <p style="text-align: left;"><strong>Катушка призыва</strong> — одна из четырёх катушек, для которой требуется получить значок, имеет способность призывать блоки по месту клика курсора/пальца. Имеет розово-белое свечение, сама катушка имеет розово-зелено-сине-желтый перелив.</p>
    </div>

    <!-- ================= ENGLISH ================= -->
    <div lang="en">
      <h1 style="font-family: 'Rubik Mono One', sans-serif; font-size: 22px; text-align: center;">🏗️ Summon Coil</h1>
      <div class="wiki-infobox">
        <div class="infobox-title">Summon Coil</div>
        <div class="infobox-grid">
          <div class="infobox-cell label">Difficulty</div>
          <div class="infobox-value infobox-cell"><span class="difficulty-easy">Easy</span></div>
        </div>
        <div class="infobox-grid">
          <div class="infobox-cell label">Obtain</div>
          <div class="infobox-value infobox-cell" style="color: #a066ff; font-weight: bold;">"Complex Power" Badge</div>
        </div>
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
    <p align="center"><a href="coils.html">🔙 Назад к Катушкам / Back to Coils</a></p>
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
