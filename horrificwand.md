<!-- ПОДКЛЮЧАЕМ ТОПОВЫЙ ИГРОВОЙ ШРИФТ ИЗ GOOGLE FONTS -->
<link rel="preconnect" href="https://googleapis.com">
<link rel="preconnect" href="https://gstatic.com" crossorigin>
<link href="https://googleapis.com/css2?family=Rubik+Mono+One&family=Rubik:wght@900&display=swap" rel="stylesheet">

<style>
  /* ================= ОБЩИЙ СТИЛЬ СТРАНИЦЫ ================= */
  html, body { background-color: #050407 !important; color: #e2daf0 !important; }
  .container-lg, main, .wrapper {
    position: relative; background-color: #0b090f !important;
    box-shadow: 0 0 40px rgba(138, 43, 226, 0.4), 0 0 10px rgba(138, 43, 226, 0.2) !important;
    border-radius: 8px; padding: 20px; z-index: 1; overflow: hidden;
  }
  .container-lg::before, main::before, .wrapper::before {
    content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background-image: url('Screenshot_20261006_110338.jpg') !important;
    background-size: cover !important; background-position: center top !important;
    filter: brightness(0.24) contrast(1.4) saturate(1.3) !important; z-index: -1; opacity: 0.9;
  }
  a { color: #a066ff !important; text-shadow: 0 0 5px rgba(160, 102, 255, 0.3); text-decoration: none; }
  [lang="en"], [lang="es"] { display: none; }

  /* СЕТКА ДЛЯ СКРИНШОТОВ */
  .photo-row { display: flex; flex-wrap: wrap; gap: 15px; margin: 20px 0; }
  .photo-col { flex: 1 1 100%; max-width: 100%; }
  .photo-col img { width: 100%; height: auto; border-radius: 6px; border: 1px solid rgba(255, 51, 51, 0.4); box-shadow: 0 0 15px rgba(255, 51, 51, 0.2); }

  /* ================= ИГРОВАЯ ТАБЛИЦА В СТИЛЕ ФАНДОМА ================= */
  .wiki-infobox {
    background-color: #121016; border: 3px solid #3a2626; border-radius: 4px;
    max-width: 420px; margin: 25px auto; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.6);
  }
  .infobox-title {
    background-color: #2f1d1d; color: #ffffff; text-align: center; padding: 12px; 
    font-family: 'Rubik Mono One', sans-serif; font-size: 18px; border-bottom: 3px solid #3a2626; letter-spacing: 1px;
  }
  .infobox-section-header {
    background-color: #e2b316; color: #000000; text-align: center; padding: 6px;
    font-family: 'Rubik', sans-serif; font-weight: 900; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;
  }
  .infobox-grid { display: flex; background-color: #1e1616; }
  .infobox-cell {
    flex: 1; padding: 10px; text-align: center; font-family: 'Rubik', sans-serif; font-size: 14px; border-bottom: 2px solid #3a2626;
  }
  .infobox-cell.label { background-color: #1c1111; color: #ffffff; font-weight: bold; border-right: 2px solid #3a2626; }
  .infobox-cell.value { color: #e2daf0; }
  
  .difficulty-insane { color: #ff3333; font-weight: bold; text-shadow: 0 0 10px rgba(255, 51, 51, 0.6); text-transform: uppercase; }
</style>

<!-- ================= РУССКИЙ ЯЗЫК ================= -->
<div lang="ru">
  <h1 style="font-family: 'Rubik Mono One', sans-serif; font-size: 24px; color: #ff3333; text-shadow: 0 0 10px #ff3333;">🩸 Палочка ho_rr&c wand</h1>
  
  <div class="photo-row">
    <div class="photo-col"><img src="IMG_20261008_194233.jpg" alt="ho_rr&c wand в руках исследователя"></div>
  </div>

  <!-- КАРТОЧКА ПРЕДМЕТА ИЗ ФАНДОМА -->
  <div class="wiki-infobox">
    <div class="infobox-title">ho_rr&c wand</div>
    
    <div class="infobox-grid">
      <div class="infobox-cell label">Сложность получения</div>
      <div class="infobox-value infobox-cell"><span class="difficulty-insane">Адски сложно</span></div>
    </div>
    <div class="infobox-grid">
      <div class="infobox-cell label">🎵 Трек при экипировке</div>
      <div class="infobox-value infobox-cell" style="font-style: italic; color: #ff9999;">Aekhloria - Darkness Looms</div>
    </div>

    <!-- РАЗДЕЛ ХАРАКТЕРИСТИКИ -->
    <div class="infobox-section-header">Характеристики</div>
    <div class="infobox-grid">
      <div class="infobox-cell label">⚔️ Способность</div>
      <div class="infobox-value infobox-cell" style="color: #00ffcc; font-weight: bold;">Бесконечный прыжок</div>
    </div>

    <!-- РАЗДЕЛ ОСОБЕННОСТИ -->
    <div class="infobox-section-header">Особенности</div>
    <div class="infobox-grid">
      <div class="infobox-cell label">👁️ Визуальный эффект</div>
      <div class="infobox-value infobox-cell">Огромный пиксельный клинок с сочным кроваво-чёрным переливом (дымом)</div>
    </div>
  </div>

  <h3>📋 Описание и Руководство:</h3>
  <p><strong>ho_rr&c wand</strong> — одна из самых засекреченных и изнурительных для получения палочек во всей игре. Для обычного игрока получить её практически невозможно, если не обладать избыточным любопытством исследовать дальние окраины карты.</p>
  <blockquote>⚠️ <strong>Секрет получения:</strong> Чтобы скрафтить эту палочку, необходимо отыскать легендарную <strong>Ужасную катушку (Horrific Coil)</strong>, скрытую глубоко в Старой Зоне 51 на невероятных координатах:<br>
  <span style="color: #ffcc00; font-family: monospace; font-size: 16px;"><b>X: -47296.59 | Y: 204.50 | Z: 3272.40</b></span><br>
  Путь туда представляет собой бесконечный бег по пустому пространству, который занимает колоссально много времени даже с использованием самой быстрой катушки в игре!</blockquote>
</div>

<!-- ================= ENGLISH ================= -->
<div lang="en">
  <h1 style="font-family: 'Rubik Mono One', sans-serif; font-size: 24px; color: #ff3333;">🩸 ho_rr&c wand</h1>
  
  <div class="photo-row">
    <div class="photo-col"><img src="IMG_20261008_194233.jpg" alt="ho_rr&c wand"></div>
  </div>

  <div class="wiki-infobox">
    <div class="infobox-title">ho_rr&c wand</div>
    <div class="infobox-grid">
      <div class="infobox-cell label">Difficulty</div>
      <div class="infobox-value infobox-cell"><span class="difficulty-insane">Insane</span></div>
    </div>
    <div class="infobox-grid">
      <div class="infobox-cell label">🎵 Equipped Music</div>
      <div class="infobox-value infobox-cell" style="font-style: italic; color: #ff9999;">Aekhloria - Darkness Looms</div>
    </div>

    <div class="infobox-section-header">Stats</div>
    <div class="infobox-grid">
      <div class="infobox-cell label">⚔️ Ability</div>
      <div class="infobox-value infobox-cell" style="color: #00ffcc; font-weight: bold;">Infinite Jump</div>
    </div>

    <div class="infobox-section-header">Features</div>
    <div class="infobox-grid">
      <div class="infobox-cell label">👁️ Visual Effect</div>
      <div class="infobox-value infobox-cell">Massive pixelated blade with a dark bloody-black aura (smoke)</div>
    </div>
  </div>

  <h3>📋 Description & Guide:</h3>
  <p><strong>ho_rr&c wand</strong> is one of the most hidden and exhausting wands to obtain. It is virtually impossible for an ordinary player to get without an extreme curiosity to explore the outermost edges of the map.</p>
  <blockquote>⚠️ <strong>How to obtain:</strong> To craft this wand, you must locate the mythical <strong>Horrific Coil</strong>, hidden deep within Old Area 51 at these insane coordinates:<br>
  <span style="color: #ffcc00; font-family: monospace; font-size: 16px;"><b>X: -47296.59 | Y: 204.50 | Z: 3272.40</b></span><br>
  The path there requires running endlessly through the void, which takes a massive amount of time even with the fastest coil equipped!</blockquote>
</div>

<!-- ================= ESPAÑOL ================= -->
<div lang="es">
  <h1 style="font-family: 'Rubik Mono One', sans-serif; font-size: 24px; color: #ff3333;">🩸 Varita ho_rr&c</h1>
  
  <div class="photo-row">
    <div class="photo-col"><img src="IMG_20261008_194233.jpg" alt="ho_rr&c wand"></div>
  </div>

  <div class="wiki-infobox">
    <div class="infobox-title">ho_rr&c wand</div>
    <div class="infobox-grid">
      <div class="infobox-cell label">Dificultad</div>
      <div class="infobox-value infobox-cell"><span class="difficulty-insane">Infernal</span></div>
    </div>
    <div class="infobox-grid">
      <div class="infobox-cell label">🎵 Música</div>
      <div class="infobox-value infobox-cell" style="font-style: italic; color: #ff9999;">Aekhloria - Darkness Looms</div>
    </div>

    <div class="infobox-section-header">Estadísticas</div>
    <div class="infobox-grid">
      <div class="infobox-cell label">⚔️ Habilidad</div>
      <div class="infobox-value infobox-cell" style="color: #00ffcc; font-weight: bold;">Salto Infinito</div>
    </div>

    <div class="infobox-section-header">Características</div>
    <div class="infobox-grid">
      <div class="infobox-cell label">👁️ Efecto Visual</div>
      <div class="infobox-value infobox-cell">Hoja pixelada masiva con una densa aura negra y sangrienta</div>
    </div>
  </div>

  <h3>📋 Descripción:</h3>
  <p><strong>ho_rr&c wand</strong> es una de las varitas más ocultas y difíciles de obtener. Es prácticamente imposible de conseguir para un jugador común sin una curiosidad extrema por explorar los límites del mapa.</p>
</div>

<br>
<hr>

<!-- КНОПКИ ПЕРЕКЛЮЧЕНИЯ ЯЗЫКОВ -->
<p align="center" style="font-size: 20px;">
  <span style="cursor:pointer;" onclick="changeLang('ru')">🇷🇺 RU</span> | 
  <span style="cursor:pointer;" onclick="changeLang('en')">🇬🇧 EN</span> | 
  <span style="cursor:pointer;" onclick="changeLang('es')">🇪🇸 ES</span>
</p>

<p align="center"><a href="wands.html">🔙 Назад к Палочкам / Back to Wands / Volver a Varitas</a></p>

<!-- СКРИПТ ЛОКАЛИЗАЦИИ -->
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
});
</script>
