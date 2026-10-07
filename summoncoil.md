<style>
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

  .photo-row {
    display: flex; flex-wrap: wrap; gap: 15px; margin: 20px 0;
  }
  .photo-col {
    flex: 1 1 calc(50% - 8px); min-width: 140px;
  }
  .photo-col img {
    width: 100%; height: auto; border-radius: 6px; border: 1px solid rgba(160, 102, 255, 0.4);
  }
</style>

<!-- ================= РУССКИЙ ================= -->
<div lang="ru">
  <h1>🏗️ Катушка призыва (Summon Coil)</h1>
  
  <div class="photo-row">
    <div class="photo-col"><img src="Screenshot_20261006_083912.jpg" alt="Катушка призыва фото 1"></div>
    <div class="photo-col"><img src="Screenshot_20261006_083941.jpg" alt="Катушка призыва фото 2"></div>
  </div>

  <h3>📋 Описание:</h3>
  <p>Вызовите случайные и бесполезные blocks с заклинанием.</p>

  <h3>🏅 Получение:</h3>
  <p>Чтобы разблокировать этот предмет, необходимо получить значок <strong>"Комплексная сила" (Complex Power)</strong>.</p>
</div>

<!-- ================= ENGLISH ================= -->
<div lang="en">
  <h1>🏗️ Summon Coil</h1>
  
  <div class="photo-row">
    <div class="photo-col"><img src="Screenshot_20261006_083912.jpg" alt="Summon Coil 1"></div>
    <div class="photo-col"><img src="Screenshot_20261006_083941.jpg" alt="Summon Coil 2"></div>
  </div>

  <h3>📋 Description:</h3>
  <p>Summon random and useless blocks with a spell.</p>

  <h3>🏅 How to get:</h3>
  <p>To unlock this item, you need to earn the badge <strong>"Complex Power"</strong>.</p>
</div>

<!-- ================= ESPAÑOL ================= -->
<div lang="es">
  <h1>🏗️ Bobina de Invocación (Summon Coil)</h1>
  
  <div class="photo-row">
    <div class="photo-col"><img src="Screenshot_20261006_083912.jpg" alt="Bobina de Invocación 1"></div>
    <div class="photo-col"><img src="Screenshot_20261006_083941.jpg" alt="Bobina de Invocación 2"></div>
  </div>

  <h3>📋 Descripción:</h3>
  <p>Invoca bloques aleatorios e inútiles con un hechizo.</p>

  <h3>🏅 Cómo conseguir:</h3>
  <p>Debes obtener el emblema <strong>"Complex Power"</strong>.</p>
</div>

<br>
<hr>

<p align="center" style="font-size: 20px;">
  <span style="cursor:pointer;" onclick="changeLang('ru')">🇷🇺 RU</span> | 
  <span style="cursor:pointer;" onclick="changeLang('en')">🇬🇧 EN</span> | 
  <span style="cursor:pointer;" onclick="changeLang('es')">🇪🇸 ES</span>
</p>

<p align="center"><a href="coils.html">🔙 Назад к Катушкам / Back to Coils / Volver a Bobinas</a></p>

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
