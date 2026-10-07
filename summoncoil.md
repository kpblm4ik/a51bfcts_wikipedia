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
</style>

<!-- ================= РУССКИЙ ================= -->
<div lang="ru">
  <h1>🏗️ Катушка призыва (Summon Coil)</h1>
  <p>Полное руководство по секретному артефакту лаборатории Зоны 51.</p>
  <hr>
  <p align="center"><img src="Screenshot_20261006_083912.jpg" alt="Катушка призыва" style="border-radius: 6px; max-width: 100%; height: auto; border: 1px solid #a066ff;"></p>
  
  <h3>📊 Игровые параметры:</h3>
  <ul>
    <li><strong>Скорость бега:</strong> 60 единиц (мощное ускорение персонажа)</li>
    <li><strong>Высота прыжка:</strong> 16 единиц (позволяет запрыгивать на ящики)</li>
  </ul>

  <h3>🔮 Особая способность:</h3>
  <p>При активации катушки в руке персонаж произносит скрытое заклинание и **призывает случайные блоки**. По заявлению исследователей, эти блоки абсолютно бесполезны для прохождения, но идеально подходят для фана, создания баррикад от монстров или троллинга друзей на сервере!</p>

  <h3>🎵 Звуковое сопровождение (64 kbps):</h3>
  <p align="center">
    <audio controls style="width: 100%; max-width: 400px;">
      <source src="block_magic.mp3" type="audio/mpeg">
      Ваш браузер не поддерживает аудио.
    </audio>
  </p>
</div>

<!-- ================= ENGLISH ================= -->
<div lang="en">
  <h1>🏗️ Summon Coil</h1>
  <p>Full guide to the secret artifact of the Area 51 laboratory.</p>
  <hr>
  <p align="center"><img src="Screenshot_20261006_083912.jpg" alt="Summon Coil" style="border-radius: 6px; max-width: 100%; height: auto; border: 1px solid #a066ff;"></p>
  
  <h3>📊 Item Stats:</h3>
  <ul>
    <li><strong>Speed:</strong> 60 units (powerful character boost)</li>
    <li><strong>Jump Power:</strong> 16 units (allows you to climb on boxes)</li>
  </ul>

  <h3>🔮 Special Ability:</h3>
  <p>When activated in hand, the character casts a hidden spell and **summons random blocks**. According to researchers, these blocks are completely useless for finishing the game, but perfect for having fun, trolling friends, or building funny barricades from monsters!</p>

  <h3>🎵 Item Audio (64 kbps):</h3>
  <p align="center">
    <audio controls style="width: 100%; max-width: 400px;">
      <source src="block_magic.mp3" type="audio/mpeg">
    </audio>
  </p>
</div>

<!-- ================= ESPAÑOL ================= -->
<div lang="es">
  <h1>🏗️ Bobina de Invocación (Summon Coil)</h1>
  <p>Guía completa del artefacto secreto del laboratorio de la Área 51.</p>
  <hr>
  <p align="center"><img src="Screenshot_20261006_083912.jpg" alt="Bobina de Invocación" style="border-radius: 6px; max-width: 100%; height: auto; border: 1px solid #a066ff;"></p>
  
  <h3>📊 Estadísticas:</h3>
  <ul>
    <li><strong>Velocidad:</strong> 60 unidades (gran impulso de personaje)</li>
    <li><strong>Salto:</strong> 16 unidades (permite subir a las cajas)</li>
  </ul>

  <h3>🔮 Habilidad Especial:</h3>
  <p>Cuando se activa en la mano, el personaje lanza un hechizo oculto и **invoca bloques aleatorios**. Según los investigadores, estos bloques son completamente inútiles para completar el juego, ¡pero perfectos para divertirse, trollear amigos o construir barricadas contra monstruos!</p>
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
