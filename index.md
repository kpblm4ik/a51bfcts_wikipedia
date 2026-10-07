<style>
  /* ================= СТИЛЬ ЗАСТАВКИ (INTRO) ================= */
  #intro-screen {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background-color: #050407; z-index: 9999;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    animation: fadeOut 0.5s ease-in-out 2.5s forwards;
  }
  .intro-coil {
    width: 120px; height: 120px;
    background-image: url('Screenshot_20261005_180602.jpg') !important;
    background-size: contain; background-repeat: no-repeat; background-position: center;
    animation: spin 1.5s cubic-bezier(0.25, 1, 0.5, 1) 0.3s forwards;
  }
  .intro-text {
    margin-top: 20px; font-family: monospace; font-size: 18px; color: #a066ff;
    text-shadow: 0 0 10px rgba(160, 102, 255, 0.7); letter-spacing: 2px; text-align: center;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); scale: 0.5; opacity: 0; }
    100% { transform: rotate(360deg); scale: 1; opacity: 1; }
  }
  @keyframes fadeOut {
    0% { opacity: 1; }
    100% { opacity: 0; visibility: hidden; }
  }

  /* ================= ОБЩИЙ СТИЛЬ САЙТА ================= */
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
  a { color: #a066ff !important; text-shadow: 0 0 5px rgba(160, 102, 255, 0.3); }
  [lang="en"], [lang="es"] { display: none; }

  /* ================= СТИЛЬ СКРЫТОЙ БОКОВОЙ ПАНЕЛИ ================= */
  #side-panel {
    position: fixed;
    top: 0;
    left: -280px; /* Полностью прячем панель за левый край экрана */
    width: 250px;
    height: 100%;
    background-color: rgba(11, 9, 15, 0.95);
    border-right: 2px solid #a066ff;
    box-shadow: 5px 0 25px rgba(160, 102, 255, 0.4);
    z-index: 5000; /* Под заставкой, но над контентом */
    padding: 20px;
    box-sizing: border-box;
    transition: left 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Плавный вылет с легким пружинящим эффектом */
  }

  /* Класс-активатор, который выдвинет панель */
  #side-panel.active {
    left: 0;
  }

  .panel-header { color: #a066ff; font-family: monospace; font-size: 18px; margin-bottom: 20px; text-shadow: 0 0 5px #a066ff; }
  .panel-menu { list-style: none; padding: 0; margin: 0; }
  .panel-menu li { margin: 15px 0; font-size: 14px; }
</style>

<!-- 🔥 ЭКРАН ЗАСТАВКИ -->
<div id="intro-screen">
  <div class="intro-coil"></div>
  <div class="intro-text">AREA 51 BUT FIND COILS TO SURVIVE</div>
</div>

<!-- 🛸 СЕКРЕТНАЯ ВЫЛЕТАЮЩАЯ БОКОВАЯ ПАНЕЛЬ -->
<div id="side-panel">
  <div class="panel-header">📟 СЕКРЕТНЫЙ СЕКТОР</div>
  <ul class="panel-menu">
    <li>🔒 Исследование: Логи Бэкенда</li>
    <li>📊 Мощность: 107,208 км/ч</li>
    <li>⚡ Статус Системы: Оптимальный</li>
    <li style="margin-top: 40px;"><button onclick="togglePanel()" style="background: #a066ff; border: none; color: #fff; padding: 5px 10px; border-radius: 4px; cursor: pointer;">❌ Закрыть</button></li>
  </ul>
</div>

<!-- ================= РУССКИЙ ЯЗЫК ================= -->
<div lang="ru">
  <h1>Вики a51bfcts</h1>
  <p><em>Area 51 but find coils to survive</em></p>
  <p style="color: #a066ff; font-size: 12px; animation: pulse 1.5s infinite;">📱 Секрет: Тряхните телефон, чтобы открыть скрытую панель!</p>
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
  <p style="color: #a066ff; font-size: 12px;">📱 Secret: Shake your phone to open the hidden panel!</p>
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
  <p style="color: #a066ff; font-size: 12px;">📱 Secreto: ¡Agita tu teléfono para abrir el panel oculto!</p>
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

<!-- СКРИПТ ПЕРЕВОДА, АВТОУДАЛЕНИЯ ИНТРО И ДАТЧИКА ТРЯСКИ -->
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

// Функция ручного открытия/закрытия панели
function togglePanel() {
  const panel = document.getElementById('side-panel');
  if (panel) panel.classList.toggle('active');
}

document.addEventListener("DOMContentLoaded", function() {
  const savedLang = localStorage.getItem('wiki_language') || 'ru';
  changeLang(savedLang);

  setTimeout(() => {
    const intro = document.getElementById('intro-screen');
    if (intro) intro.remove();
  }, 3000);

  // ХАКЕРСКИЙ ДАТЧИК ТРЯСКИ (АКСЕЛЕРОМЕТР)
  let lastX = null, lastY = null, lastZ = null;
  const threshold = 15; // Чувствительность тряски (чем меньше цифра, тем легче сработает)

  window.addEventListener('devicemotion', function(event) {
    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration) return;

    let currentX = acceleration.x;
    let currentY = acceleration.y;
    let currentZ = acceleration.z;

    if (lastX !== null) {
      // Считаем разницу в траектории движения телефона
      let deltaX = Math.abs(currentX - lastX);
      let deltaY = Math.abs(currentY - lastY);
      let deltaZ = Math.abs(currentZ - lastZ);

      // Если махнули рукой сильнее порога — выдвигаем нашу неоновую панель!
      if ((deltaX > threshold && deltaY > threshold) || (deltaX > threshold && deltaZ > threshold)) {
        const panel = document.getElementById('side-panel');
        if (panel && !panel.classList.contains('active')) {
          panel.classList.add('active');
        }
      }
    }

    lastX = currentX;
    lastY = currentY;
    lastZ = currentZ;
  });
});
</script>
