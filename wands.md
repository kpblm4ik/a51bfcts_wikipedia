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

  /* СЕТКА ДЛЯ КАРТОЧЕК ПАЛОЧЕК (2 В РЯД) */
  .items-grid { display: flex; flex-wrap: wrap; gap: 15px; margin-top: 20px; }
  
  .item-card {
    flex: 1 1 calc(50% - 8px); min-width: 140px;
    background-color: rgba(20, 16, 28, 0.7);
    border: 1px solid rgba(160, 102, 255, 0.3); border-radius: 6px;
    padding: 10px; box-sizing: border-box;
    display: flex; flex-direction: column; align-items: center; text-align: center;
    transition: transform 0.2s, box-shadow 0.2s; cursor: pointer;
  }
  .item-card:hover {
    transform: scale(1.03);
    box-shadow: 0 0 15px rgba(160, 102, 255, 0.6);
    border-color: #a066ff;
  }
  .item-card img { width: 100%; height: auto; border-radius: 4px; margin-bottom: 8px; }
  .item-card h3 { margin: 5px 0; color: #fff; font-size: 16px; }
  .item-card p { margin: 2px 0; font-size: 13px; color: #bcaada; }
</style>

<!-- ================= РУССКИЙ ЯЗЫК ================= -->
<div lang="ru">
  <h1>🪄 Раздел: Палочки (Wands)</h1>
  <p>Добро пожаловать в архивы магического оружия! Нажмите на карточку палочки, чтобы открыть секретное досье и координаты крафта.</p>
  
  <div class="items-grid">
    <!-- КАРТОЧКА 1: Ужасная палочка (Кликабельная кнопка) -->
    <a href="horrificwand.html" class="item-card">
      <img src="IMG_20261008_194233.jpg" alt="ho_rr&c wand">
      <h3 style="color: #ff3333;">ho_rr&c wand</h3>
      <p>💀 Сложность: Адская</p>
      <p style="font-size:11px; color:#ff3333; margin-top:5px;">🩸 Открыть секретный гайд...</p>
    </a>

    <!-- КАРТОЧКА 2: Глитч палочка (Пока текст) -->
    <div class="item-card">
      <img src="image_LyAAv1.png" alt="glitch wand">
      <h3>glitch wand</h3>
      <p>👾 Сложность: ??</p>
      <p style="font-size:11px; color:#a066ff; margin-top:5px;">🔍 Подробнее в будущем...</p>
    </div>
  </div>
</div>

<!-- ================= ENGLISH ================= -->
<div lang="en">
  <h1>🪄 Section: Wands</h1>
  <p>Welcome to the magic weapons archive! Click on a wand card to open the secret dossier and craft coordinates.</p>
  
  <div class="items-grid">
    <a href="horrificwand.html" class="item-card">
      <img src="IMG_20261008_194233.jpg" alt="ho_rr&c wand">
      <h3 style="color: #ff3333;">ho_rr&c wand</h3>
      <p>💀 Difficulty: Insane</p>
      <p style="font-size:11px; color:#ff3333; margin-top:5px;">🩸 Open guide...</p>
    </a>

    <div class="item-card">
      <img src="image_LyAAv1.png" alt="glitch wand">
      <h3>glitch wand</h3>
      <p>👾 Difficulty: ??</p>
    </div>
  </div>
</div>

<!-- ================= ESPAÑOL ================= -->
<div lang="es">
  <h1>🪄 Sección: Varitas</h1>
  <p>¡Bienvenido al archivo de armas mágicas! Haz clic en una tarjeta para abrir el expediente secreto.</p>
  
  <div class="items-grid">
    <a href="horrificwand.html" class="item-card">
      <img src="IMG_20261008_194233.jpg" alt="ho_rr&c wand">
      <h3 style="color: #ff3333;">ho_rr&c wand</h3>
      <p>💀 Dificultad: Infernal</p>
      <p style="font-size:11px; color:#ff3333; margin-top:5px;">🩸 Ver guía...</p>
    </a>

    <div class="item-card">
      <img src="image_LyAAv1.png" alt="glitch wand">
      <h3>glitch wand</h3>
      <p>👾 Dificultad: ??</p>
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
