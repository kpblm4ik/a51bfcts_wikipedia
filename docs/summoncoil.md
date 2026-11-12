---
permalink: /summoncoil.html
layout: default
title: Главная — a51bfcts Вики
custom_css: /css/main.css
---

# Катушка призыва
<div class="item-card">
<img src="../images/Screenshot_20261006_083912.avif" alt="Summon Coil">
<img src="../images/Screenshot_20261006_083941.avif" alt="Summon Coil">
</div>

***Описание*** *- призовите случайные и бесполезные блоки с помощью заклинания*

**Катушка призыва** - одна из пяти катушек, для которой требуется получение значка в игре, четыре других: [**катушка расщепления**](fissioncoil.html), [**флекс-катушка**](flexcoil.html), [**зовки-катушка**](zowkycoil.html), [**защитная катушка**](guardiancoil.html). Особенностью данной катушки является призыв блоков 4 на 2 на 1 (Длина-Ширина-Высота), которые не несут никакой функции, кроме декоративной. Все найденные цвета блоков представлены ниже

<sub>[Лень листать кубики? Нажми сюда, чтобы попасть в конец списка кубиков](#end-of-cubes)</sub>

<!-- Блок генератора в фиолетовой рамке -->
<div class="main-sector-card">
    <h3 style="color: #ffffff; text-align: center; text-shadow: 0 0 15px #a066ff, 0 0 5px rgba(138, 43, 226, 0.8); margin-bottom: 20px;">
        Все цвета блоков
    </h3>
    <div id="svgContainer" style="width: 100%; max-width: 600px; margin: 0 auto;"></div>
</div>

<script>
// ========================================================
// НАШЕЛ НОВЫЙ ЦВЕТ? ПРОСТО ДОБАВЬ СТРОКУ В КОНЕЦ СПИСКА:
// ========================================================
const COIL_COLORS = [
  { hex: "#3D1C02", name: "Коричневый" }, { hex: "#0D0D0D", name: "Черный" },
  { hex: "#5C2E00", name: "Темно-оранжевый" }, { hex: "#F5D000", name: "Желтый" },
  { hex: "#6BBF4A", name: "Салатовый" }, { hex: "#D8D8D8", name: "Серый" },
  { hex: "#6B1F8A", name: "Пурпурный" }, { hex: "#1A5C10", name: "Темно-зеленый" },
  { hex: "#DDD5A0", name: "Песочный" }, { hex: "#7A1010", name: "Бордовый" },
  { hex: "#CC1414", name: "Ярко-красный" }, { hex: "#1428A0", name: "Темно-синий" },
  { hex: "#5BC8C8", name: "Светло-бирюзовый" }, { hex: "#C85500", name: "Оранжевый" },
  { hex: "#5A8A78", name: "Пастельно-зеленый" }, { hex: "#AACC00", name: "Лаймовый" },
  { hex: "#6B5A4A", name: "Бурый" }, { hex: "#1A1A8C", name: "Глубокий синий" },
  { hex: "#C87060", name: "Терракотовый" }, { hex: "#880088", name: "Фиолетовый" },
  { hex: "#2D0035", name: "Сливовый" }, { hex: "#00DDE0", name: "Ярко-зеленый" },
  { hex: "#6B6030", name: "Оливковый" }, { hex: "#C08878", name: "Телесно-розовый" },
  { hex: "#FF00CC", name: "Розовый" }, { hex: "#1A8C00", name: "Зеленый" },
  { hex: "#00DDEE", name: "Голубой" }, { hex: "#C8AEA0", name: "Бежевый" },
  { hex: "#0000CC", name: "Чистый синий" }, { hex: "#4477CC", name: "Джинсовый" },
  { hex: "#3A3A3A", name: "Графитовый" }, { hex: "#B5341A", name: "Кирпичный" },
  { hex: "#F0EDE8", name: "Белый" }, { hex: "#6B3A1A", name: "Средне-коричневый" },
  { hex: "#7B2010", name: "Темно-кирпичный" }
];

// Цвет темнее: factor < 1 (0.5 = вдвое темнее)
function darken(hex, factor) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.floor((n >> 16 & 255) * factor);
  const g = Math.floor((n >> 8 & 255) * factor);
  const b = Math.floor((n & 255) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}
// Цвет светлее: подмешиваем белый (работает и для очень тёмных цветов)
function lighten(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round((n >> 16 & 255) + (255 - (n >> 16 & 255)) * t);
  const g = Math.round((n >> 8 & 255) + (255 - (n >> 8 & 255)) * t);
  const b = Math.round((n & 255) + (255 - (n & 255)) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

const STUD = 55;
const BRICK_W = 2 * STUD;
const BRICK_H = 4 * STUD;
const TEXT_SPACE = 40;
const COLS = 5;
const WIDTH = 600;
const PAD_X = Math.floor((WIDTH - COLS * BRICK_W) / (COLS + 1));
const PAD_Y = 50;
const totalRows = Math.ceil(COIL_COLORS.length / COLS);
const HEIGHT = totalRows * (BRICK_H + PAD_Y + TEXT_SPACE) + PAD_Y;

let svg = "";

COIL_COLORS.forEach((item, idx) => {
  const col = idx % COLS;
  const row = Math.floor(idx / COLS);
  const bx = PAD_X + col * (BRICK_W + PAD_X);
  const by = PAD_Y + row * (BRICK_H + PAD_Y + TEXT_SPACE);

  const edge  = darken(item.hex, 0.75);   // обводка кубика
  const shade = darken(item.hex, 0.45);   // тёмный край сверху и слева
  const slope = lighten(item.hex, 0.22);  // светлый скос снизу и справа

  // 1. Тело кубика
  svg += `<rect x="${bx}" y="${by}" width="${BRICK_W}" height="${BRICK_H}" rx="4" fill="${item.hex}" stroke="${edge}" stroke-width="2"/>\n`;

  // 2. Студы 2x4: квадратные углубления со скруглёнными углами
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 2; c++) {
      const cx = bx + c * STUD + STUD / 2;
      const cy = by + r * STUD + STUD / 2;
      const S = 36;                       // внешний размер углубления
      const x = cx - S / 2, y = cy - S / 2;

      // тёмная кромка (тень сверху и слева)
      svg += `<rect x="${x}" y="${y}" width="${S}" height="${S}" rx="9" fill="${shade}"/>\n`;
      // светлый скос (виден снизу и справа), сдвинут вниз-вправо
      svg += `<rect x="${x + 2}" y="${y + 2.5}" width="${S - 3}" height="${S - 3.5}" rx="8" fill="${slope}"/>\n`;
      // плоское дно того же цвета, что и кубик
      svg += `<rect x="${x + 4.5}" y="${y + 4}" width="${S - 12}" height="${S - 12}" rx="5" fill="${item.hex}"/>\n`;
    }
  }

  // 3. Подпись под кубиком (с переносом по дефису)
  const ty = by + BRICK_H + 22;
  const cxText = bx + BRICK_W / 2;
  const style = `font-size="13" fill="#e8e0f5" text-anchor="middle" font-family="Trebuchet MS, sans-serif"`;
  if (item.name.includes('-')) {
    const parts = item.name.split('-');
    svg += `<text x="${cxText}" y="${ty}" ${style}>${parts[0]}-</text>\n`;
    svg += `<text x="${cxText}" y="${ty + 16}" ${style}>${parts[1]}</text>\n`;
  } else {
    svg += `<text x="${cxText}" y="${ty}" ${style}>${item.name}</text>\n`;
  }
});

// Монтируем SVG (работает и если svgContainer — это <svg>, и если <div>)
let box = document.getElementById('svgContainer');
if (!box) {
  // Контейнера нет на странице: создаём его на месте скрипта
  box = document.createElement('div');
  box.id = 'svgContainer';
  const me = document.currentScript;
  if (me && me.parentNode) {
    me.parentNode.insertBefore(box, me);
  } else {
    (document.querySelector('.wrapper') || document.body).appendChild(box);
  }
}
if (box.tagName.toLowerCase() === 'svg') {
  box.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
  box.setAttribute('width', '100%');
  box.innerHTML = svg;
} else {
  box.innerHTML = `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" width="100%" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
}
</script>

<a name="end-of-cubes" id="end-of-cubes"></a>

## Мелочи: 


Эта катушка довольно быстрая, достаточно быстра, чтобы пробегать средние расстояния. 

Несмотря на то, что призываемые блоки бесполезны, они являются важной частью бесконечного прыжка к стене без использования катушки с бесконечным прыжком

Оригинальное фото логотипа катушки призыва расположен [на сайте Pixabay](https://pixabay.com/vectors/gradient-banner-wallpaper-events-7258997/) (@satheeshsankaran)°.


**° - необходим VPN для посещения сайта**
