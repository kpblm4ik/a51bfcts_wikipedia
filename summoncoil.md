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
  .photo-col { flex: 1 1 calc(50% - 8px); min-width: 140px; }
  .photo-col img { width: 100%; height: auto; border-radius: 6px; border: 1px solid rgba(160, 102, 255, 0.4); }

  /* ================= ИГРОВАЯ ТАБЛИЦА В СТИЛЕ ФАНДОМА ================= */
  .wiki-infobox {
    background-color: #121016;
    border: 3px solid #2d263a;
    border-radius: 4px;
    max-width: 420px;
    margin: 25px auto;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0,0,0,0.6);
  }
  
  .infobox-title {
    background-color: #241d2f;
    color: #ffffff; text-align: center; padding: 12px; 
    font-family: 'Rubik Mono One', sans-serif; font-size: 18px;
    border-bottom: 3px solid #2d263a;
    letter-spacing: 1px;
  }
  .infobox-section-header {
    background-color: #e2b316;
    color: #000000; text-align: center; padding: 6px;
    font-family: 'Rubik', sans-serif; font-weight: 900; font-size: 16px;
    text-transform: uppercase; letter-spacing: 1px;
  }
  
  .infobox-grid { display: flex; background-color: #1a1622; }
  .infobox-cell {
    flex: 1; padding: 10px; text-align: center; font-family: 'Rubik', sans-serif; font-size: 14px;
    border-bottom: 2px solid #2d263a;
  }
  .infobox-cell.label {
    background-color: #15111c; color: #ffffff; font-weight: bold;
    border-right: 2px solid #2d263a;
  }
  .infobox-cell.value { color: #e2daf0; }
  
  /* ЦВЕТА СЛОЖНОСТИ И БАФФОВ */
  .difficulty-easy { color: #00ff66; font-weight: bold; text-shadow: 0 0 8px rgba(0, 255, 102, 0.4); }
  .stat-speed { color: #00ffcc; font-weight: bold; }
  .stat-jump { color: #ffcc00; font-weight: bold; }
</style>

<!-- ================= РУССКИЙ ЯЗЫК ================= -->
<div lang="ru">
  <h1 style="font-family: 'Rubik Mono One', sans-serif; font-size: 24px; color: #fff; text-shadow: 0 0 10px #a066ff;">🏗️ Катушка призыва</h1>
  
  <div class="photo-row">
    <div class="photo-col"><img src="Screenshot_20261006_083912.jpg" alt=""></div>
    <div class="photo-col"><img src="Screenshot_20261006_083941.jpg" alt=""></div>
  </div>

  <!-- КАРТОЧКА ПРЕДМЕТА -->
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

    <!-- РАЗДЕЛ ХАРАКТЕРИСТИКИ -->
    <div class="infobox-section-header">Характеристики</div>
    <div class="infobox-grid">
      <div class="infobox-cell label">🏃 Скорость</div>
      <div class="infobox-value infobox-cell stat-speed">60 единиц</div>
    </div>
    <div class="infobox-grid">
      <div class="infobox-cell label">🦘 Сила прыжка</div>
      <div class="infobox-value infobox-cell stat-jump">16 единиц</div>
    </div>

    <!-- РАЗДЕЛ ОСОБЕННОСТИ -->
    <div class="infobox-section-header">Особенности</div>
    <div class="infobox-grid">
      <div class="infobox-cell label">🔮 Способность</div>
      <div class="infobox-value infobox-cell">Спавн блоков 4х2х1 разных цветов</div>
    </div>
  </div>

  <h3>📋 Описание предмета:</h3>
  <p><strong>Катушка призыва</strong> — одна из четырёх катушек, для которой требуется получить значок, имеет способность призывать блоки по месту клика курсора/пальца. Имеет розово-белое свечение, сама катушка имеет розово-зелено-сине-желтый перелив.</p>
</div>

<!-- ================= ENGLISH ================= -->
<div lang="en">
  <h1 style="font-family: 'Rubik Mono One', sans-serif; font-size: 24px; color: #fff;">🏗️ Summon Coil</h1>
  
  <div class="photo-row">
    <div class="photo-col"><img src="Screenshot_20261006_083912.jpg" alt=""></div>
    <div class="photo-col"><img src="Screenshot_20261006_083941.jpg" alt=""></div>
  </div>

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

    <div class="infobox-section-header">Stats</div>
    <div class="infobox-grid">
      <div class="infobox-cell label">🏃 Speed</div>
      <div class="infobox-value infobox-cell stat-speed">60 units</div>
    </div>
    <div class="infobox-grid">
      <div class="infobox-cell label">🦘 Jump Power</div>
      <div class="infobox-value infobox-cell stat-jump">16 units</div>
    </div>

    <div class="infobox-section-header">Features</div>
    <div class="infobox-grid">
      <div class="infobox-cell label">🔮 Ability</div>
      <div class="infobox-value infobox-cell">Spawns 4x2x1 multi-colored blocks</div>
    </div>
  </div>

  <h3>📋 Description:</h3>
  <p><strong>Summon Coil</strong> — one of the four coils that requires a badge to obtain. It has the unique ability to summon blocks exactly where the cursor or finger clicks. Features a glowing pink and white aura, while the coil itself shifts beautifully through pink, green, blue, and yellow gradients.</p>
</div>

<!-- ================= ESPAÑOL ================= -->
<div lang="es">
  <h1 style="font-family: 'Rubik Mono One', sans-serif; font-size: 24px; color: #fff;">🏗️ Bobina de Invocación</h1>
  
  <div class="photo-row">
    <div class="photo-col"><img src="Screenshot_20261006_083912.jpg" alt=""></div>
    <div class="photo-col"><img src="Screenshot_20261006_083941.jpg" alt=""></div>
  </div>

  <div class="wiki-infobox">
    <div class="infobox-title">Bobina de Invocación</div>
    <div class="infobox-grid">
      <div class="infobox-cell label">Dificultad</div>
      <div class="infobox-value infobox-cell"><span class="difficulty-easy">Fácil</span></div>
    </div>
    <div class="infobox-grid">
      <div class="infobox-cell label">Obtención</div>
      <div class="infobox-value infobox-cell" style="color: #a066ff; font-weight: bold;">Emblema "Complex Power"</div>
    </div>

    <div class="infobox-section-header">Estadísticas</div>
    <div class="infobox-grid">
      <div class="infobox-cell label">🏃 Velocidad</div>
      <div class="infobox-value infobox-cell stat-speed">60 unidades</div>
    </div>
    <div class="infobox-grid">
      <div class="infobox-cell label">🦘 Salto</div>
      <div class="infobox-value infobox-cell stat-jump">16 unidades</div>
    </div>

    <div class="infobox-section-header">Características</div>
    <div class="infobox-grid">
      <div class="infobox-cell label">🔮 Habilidad</div>
      <div class="infobox-value infobox-cell">Invoca bloques de 4x2x1 de varios colores</div>
    </div>
  </div>

  <h3>📋 Descripción:</h3>
  <p><strong>Bobina de Invocación</strong> — una de las cuatro bobinas que requiere un emblema. Tiene la habilidad de invocar bloques en el lugar exacto del clic del cursor o del dedo. Tiene un brillo rosa y blanco, y la bobina misma tiene un degradado de rosa, verde, azul y amarillo.</p>
</div>

<br>
<hr>

<!-- КНОПКИ ПЕРЕКЛЮЧЕНИЯ ЯЗЫКОВ -->
<p align="center" style="font-size: 20px;">
  <span style="cursor:pointer;" onclick="changeLang('ru')">🇷🇺 RU</span> | 
  <span style="cursor:pointer;" onclick="changeLang('en')">🇬🇧 EN</span> | 
  <span style="cursor:pointer;" onclick="changeLang('es')">🇪🇸 ES</span>
</p>

<p align="center"><a href="coils.html">🔙 Назад к Катушкам / Back to Coils / Volver a Bobinas</a></p>

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
