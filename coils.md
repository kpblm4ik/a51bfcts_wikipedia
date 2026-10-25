---
layout: default
title: Главная — a51bfcts Вики
custom_css: /css/main.css
---

# ⚡ Раздел: Катушки (Coils)

Добро пожаловать в архив катушек!

<div class="items-grid">
  <a href="summoncoil.html" class="item-card">
    <img src="Screenshot_20261005_180602.jpg" alt="Summon Coil">
    <h3>Катушка призыва</h3>
  </a>

  <div class="item-card">
    <img src="Screenshot_20261005_180545.jpg" alt="None">
    <h3>Пока пусто</h3>
  </div>
</div>

<br>

<div style="text-align: center; margin-top: 20px;">
  <a href="index.html" class="lang-btn"> На Главную</a>
</div>

<style>
/* Делаем так, чтобы бирюзовая вспышка при тапе аккуратно скруглялась по форме карточки */
.item-card {
  border-radius: 12px !important;
}

/* Делаем картинки крупнее и удерживаем квадратные пропорции 1:1 */
.item-card img {
  max-width: 100% !important; 
  width: 100% !important;
  aspect-ratio: 1 / 1;
  object-fit: cover;
}

/* Сетка по 2 в ряд для мобильных и планшетов (до 1024px) */
@media (max-width: 1024px) {
  .items-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 12px !important;
  }
}

/* На совсем крошечных экранах (до 360px) возвращаем в 1 колонку */
@media (max-width: 360px) {
  .items-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
