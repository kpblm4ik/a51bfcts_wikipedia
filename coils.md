<style>
  /* ================= ОБЩИЙ СТИЛЬ СТРАНИЦЫ ================= */
  html, body { background-color: #050407 !important; color: #e2daf0 !important; }
  .container-lg, main, .wrapper {
    position: relative; background-color: #0b090f !important;
    box-shadow: 0 0 40px rgba(138, 43, 226, 0.4), 0 0 10px rgba(138, 43, 226, 0.2) !important;
    border-radius: 8px; padding: 20px; z-index: 1; overflow: hidden;
  }
  
  /* Фирменный приближенный логотип на фоне */
  .container-lg::before, main::before, .wrapper::before {
    content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background-image: url('Screenshot_20261006_110338.jpg') !important;
    background-size: cover !important; background-position: center top !important;
    filter: brightness(0.24) contrast(1.4) saturate(1.3) !important; z-index: -1; opacity: 0.9;
  }
  a { color: #a066ff !important; text-shadow: 0 0 5px rgba(160, 102, 255, 0.3); }
  [lang="en"], [lang="es"] { display: none; }

  /* ================= СЕТКА ДЛЯ ФОТОГРАФИЙ (2 В РЯД) ================= */
  .items-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 15px; /* Отступы между карточками */
    margin-top: 20px;
  }

  /* Сама карточка предмета */
  .item-card {
    flex: 1 1 calc(50% - 8px); /* Строго 50% ширины экрана минус половина отступа */
    min-width: 140px; /* Чтобы на совсем мелких экранах код не ломался */
    background-color: rgba(20, 16, 28, 0.7); /* Темная прозрачная плашка под карточку */
    border: 1px solid rgba(160, 102, 255, 0.3);
    border-radius: 6px;
    padding: 10px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  /* Стиль картинок внутри сетки */
  .item-card img {
    width: 100%;
    height: auto;
    border-radius: 4px;
    margin-bottom: 8px;
  }

  .item-card h3 { margin: 5px 0; color: #fff; font-size: 16px; }
  .item-card p { margin: 2px 0; font-size: 13px; color: #bcaada; }
</style>

<!-- ================= РУССКИЙ ЯЗЫК ================= -->
<div lang="ru">
  <h1>⚡ Раздел: Катушки (Coils)</h1>
  <p>Добро пожаловать в архив катушек! Здесь собраны все артефакты, ускоряющие персонажа и дающие супер-прыжки.</p>
  
  <!-- СЕТКА ИГРОВЫХ ПРЕДМЕТОВ НА РУССКОМ -->
  <div class="items-grid">
    
    <!-- КАРТОЧКА 1: Строительная катушка -->
    <div class="item-card">
      <img src="Screenshot_20261005_180602.jpg" alt="Строительная катушка">
      <h3>Строительная катушка</h3>
      <p>🏃 Скорость: 60</p>
      <p>🦘 Прыжок: 16</p>
      <p style="font-size:11px; color:#a066ff; margin-top:5px;">🔮 Призывает случайные блоки</p>
    </div>

    <!-- КАРТОЧКА 2: Сюда добавите следующую фотку -->
    <div class="item-card">
      <img src="Screenshot_20261005_180545.jpg" alt="Катушка">
      <h3>Секретная катушка</h3>
      <p>🏃 Скорость: ??</p>
      <p>🦘 Прыжок: ??</p>
    </div>

    <!-- Сюда можно докидывать бесконечно новые карточки вниз, просто копируя блок <div class="item-card">...</div> -->

  </div>
</div>

<!-- ================= ENGLISH LANGUAGE ================= -->
<div lang="en">
  <h1>⚡ Section: Coils</h1>
  <p>Welcome to the coils archive! Here are all the artifacts that boost speed and jump power.</p>
  
  <div class="items-grid">
    <div class="item-card">
      <img src="Screenshot_20261005_180602.jpg" alt="Building Coil">
      <h3>Building Coil</h3>
      <p>🏃 Speed: 60</p>
      <p>🦘 Jump: 16</p>
      <p style="font-size:11px; color:#a066ff; margin-top:5px;">🔮 Summons random blocks</p>
    </div>

    <div class="item-card">
      <img src="Screenshot_20261005_180545.jpg" alt="Coil">
      <h3>Secret Coil</h3>
      <p>🏃 Speed: ??</p>
      <p>🦘 Jump: ??</p>
    </div>
  </div>
</div>

<!-- ================= ESPAÑOL ================= -->
<div lang="es">
  <h1>⚡ Sección: Bobinas (Coils)</h1>
  <p>¡Bienvenido al archivo de bobinas! Aquí estão todos los objetos que aumentan la velocidad y el salto.</p>
  
  <div class="items-grid">
    <div class="item-card">
      <img src="Screenshot_20261005_180602.jpg" alt="Bobina de Construcción">
      <h3>Bobina de Construcción</h3>
      <p>🏃 Velocidad: 60</p>
      <p>🦘 Salto: 16</p>
      <p style="font-size:11px; color:#a066ff; margin-top:5px;">🔮 Invoca bloques aleatorios</p>
    </div>

    <div class="item-card">
      <img src="Screenshot_20261005_180545.jpg" alt="Bobina">
      <h3>Bobina Secreta</h3>
      <p>🏃 Velocidad: ??</p>
      <p>🦘 Salto: ??</p>
    </div>
  </div>
</div>

<br>
<hr>

<!-- КНОПКИ ПЕРЕКЛЮЧЕНИЯ ЯЗЫКОВ -->
<p align="center" style="font-size: 20px;">
  <span style="cursor:pointer;" onclick="changeLang('ru')">🇷🇺 RU</span> | 
  <span style="cursor:pointer;" onclick="changeLang('en')">🇬🇧 EN</span> | 
  <span style="cursor:pointer;" onclick="changeLang('es')">🇪🇸 ES</span>
</p>

<p align="center"><a href="index.html">🔙 На Главную / Back to Main / Volver al Inicio</a></p>

<!-- НАШ СКРИПТ ЖЕЛЕЗНОЙ ПАМЯТИ -->
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
