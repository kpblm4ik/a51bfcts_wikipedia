---
layout: default
title: Главная — a51bfcts Вики
custom_css: /css/main.css
---

# Катушка призыва

<div class="item-card">
<img src="Screenshot_20261006_083912.jpg" alt="Summon Coil">
<img src="Screenshot_20261006_083941.jpg" alt="Summon Coil">
</div>

<!-- Блок генератора в фиолетовой рамке -->
<div class="main-sector-card">
    <h3 style="color: #ffffff; text-align: center; text-shadow: 0 0 15px #a066ff, 0 0 5px rgba(138, 43, 226, 0.8); margin-bottom: 20px;">
        🎨 База цветов кубиков
    </h3>
    <div id="svgContainer" style="width: 100%; max-width: 600px; margin: 0 auto;"></div>
</div>

<script>
// ========================================================
// НАШЕЛ НОВЫЙ ЦВЕТ? ПРОСТО ДОБАВЬ СТРОКУ В КОНЕЦ СПИСКА:
// ========================================================
const COIL_COLORS = [
    { hex: "#3D1C02", name: "Коричневый" },
    { hex: "#0D0D0D", name: "Черный" },
    { hex: "#5C2E00", name: "Темно-оранжевый" },
    { hex: "#F5D000", name: "Желтый" },
    { hex: "#6BBF4A", name: "Салатовый" },
    { hex: "#D8D8D8", name: "Серый" },
    { hex: "#6B1F8A", name: "Пурпурный" },
    { hex: "#1A5C10", name: "Темно-зеленый" },
    { hex: "#DDD5A0", name: "Песочный" },
    { hex: "#7A1010", name: "Бордовый" },
    { hex: "#CC1414", name: "Ярко-красный" },
    { hex: "#1428A0", name: "Темно-синий" },
    { hex: "#5BC8C8", name: "Светло-бирюзовый" },
    { hex: "#C85500", name: "Оранжевый" },
    { hex: "#5A8A78", name: "Пастельно-зеленый" },
    { hex: "#AACC00", name: "Лаймовый" },
    { hex: "#6B5A4A", name: "Бурый" },
    { hex: "#1A1A8C", name: "Глубокий синий" },
    { hex: "#C87060", name: "Терракотовый" },
    { hex: "#880088", name: "Фиолетовый" },
    { hex: "#2D0035", name: "Сливовый" },
    { hex: "#00DDE0", name: "Ярко-зеленый" },
    { hex: "#6B6030", name: "Оливковый" },
    { hex: "#C08878", name: "Телесно-розовый" },
    { hex: "#FF00CC", name: "Розовый" },
    { hex: "#1A8C00", name: "Зеленый" },
    { hex: "#00DDEE", name: "Голубой" },
    { hex: "#C8AEA0", name: "Бежевый" },
    { hex: "#0000CC", name: "Чистый синий" },
    { hex: "#4477CC", name: "Джинсовый" }
];

function adjustColor(hex, factor) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, Math.floor(r * factor));
    g = Math.max(0, Math.floor(g * factor));
    b = Math.max(0, Math.floor(b * factor));
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

// Базовая разметка SVG-контейнера с фильтром внутренней тени для ячеек
let svgContent = `
<svg xmlns="http://w3.org" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="100%" height="auto">
  <defs>
    <filter id="inset-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feOffset dx="1.5" dy="1.5"/>
      <feGaussianBlur stdDeviation="1.5" result="offset-blur"/>
      <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
      <feFlood flood-color="black" flood-opacity="0.7" result="color"/>
      <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
      <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
    </filter>
  </defs>
`;

COIL_COLORS.forEach((item, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    
    const bx = PAD_X + col * (BRICK_W + PAD_X);
    const by = PAD_Y + row * (BRICK_H + PAD_Y + TEXT_SPACE);
    
    const strokeColor = adjustColor(item.hex, 0.75);
    const innerCellColor = adjustColor(item.hex, 0.75);
    
    // 1. Тело кубика и его внешняя обводка
    svgContent += `  <rect x="${bx}" y="${by}" width="${BRICK_W}" height="${BRICK_H}" fill="${item.hex}" stroke="${strokeColor}" stroke-width="3" />\n`;
    
    // 2. Генерация ячеек (2х4)
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 2; c++) {
            const cx = bx + c * STUD + STUD / 2;
            const cy = by + r * STUD + STUD / 2;
            
            const size = 36;
            const rx = cx - size / 2;
            const ry = cy - size / 2;
            
            // Белая нижняя фаска-блик
            svgContent += `  <rect x="${rx + 1}" y="${ry + 1}" width="${size}" height="${size}" rx="6" fill="rgba(255, 255, 255, 0.4)" />\n`;
            // Сама ячейка с внутренней тенью
            svgContent += `  <rect x="${rx}" y="${ry}" width="${size}" height="${size}" rx="6" fill="${innerCellColor}" filter="url(#inset-shadow)" />\n`;
        }
    }
    
    // 3. Текстовая подпись под кубиком
    svgContent += `  <text x="${bx + BRICK_W / 2}" y="${by + BRICK_H + 25}" fill="#bcaada" font-family="sans-serif" font-size="14" text-anchor="middle">${item.name}</text>\n`;
});

svgContent += `</svg>`;

// Монтируем сгенерированный SVG в DOM
document.getElementById('svgContainer').innerHTML = svgContent;
</script>
