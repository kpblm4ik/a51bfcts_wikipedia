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
<div style="border: 3px solid #6B1F8A; border-radius: 12px; padding: 20px; margin-top: 30px; background-color: rgba(107, 31, 138, 0.05); text-align: center;">
    <h3 style="color: #6B1F8A; margin-top: 0; font-family: sans-serif;">🎨 База цветов кубиков</h3>
    <canvas id="coilsCanvas" width="1200" height="450" style="max-width: 100%; height: auto; border-radius: 6px; background-color: #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></canvas>
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
    { hex: "#7A1010", name: "Бордовый" }
];

const canvas = document.getElementById('coilsCanvas');
const ctx = canvas.getContext('2d');

function adjustColor(hex, factor) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    if (factor < 1) {
        r = Math.max(0, Math.floor(r * factor));
        g = Math.max(0, Math.floor(g * factor));
        b = Math.max(0, Math.floor(b * factor));
    } else {
        const f = factor - 1;
        r = Math.min(255, Math.floor(r + (255 - r) * f));
        g = Math.min(255, Math.floor(g + (255 - g) * f));
        b = Math.min(255, Math.floor(b + (255 - b) * f));
    }
    return `rgb(${r}, ${g}, ${b})`;
}

const STUD = 55;
const BRICK_W = 2 * STUD;
const BRICK_H = 4 * STUD;
const TEXT_SPACE = 40; // Место под текст под каждым кубиком
const COLS = 5;

const PAD_X = Math.floor((canvas.width - COLS * BRICK_W) / (COLS + 1));
const PAD_Y = 50;

// Автоматический расчет высоты под любое количество рядов с учетом подписей
const totalRows = Math.ceil(COIL_COLORS.length / COLS);
canvas.height = totalRows * (BRICK_H + PAD_Y + TEXT_SPACE) + PAD_Y;

// Белый фон внутри канваса
ctx.fillStyle = "#FFFFFF";
ctx.fillRect(0, 0, canvas.width, canvas.height);

COIL_COLORS.forEach((item, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    
    const bx = PAD_X + col * (BRICK_W + PAD_X);
    const by = PAD_Y + row * (BRICK_H + PAD_Y + TEXT_SPACE);
    
    // Кубик
    ctx.fillStyle = item.hex;
    ctx.fillRect(bx, by, BRICK_W, BRICK_H);
    ctx.strokeStyle = adjustColor(item.hex, 0.75);
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, BRICK_W, BRICK_H);
    
    // Пины (студы)
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 2; c++) {
            const cx = bx + c * STUD + STUD / 2;
            const cy = by + r * STUD + STUD / 2;
            ctx.fillStyle = adjustColor(item.hex, 0.7);
            ctx.beginPath(); ctx.arc(cx, cy, 21, 0, 2 * Math.PI); ctx.fill();
            ctx.fillStyle = adjustColor(item.hex, 1.15);
            ctx.beginPath(); ctx.arc(cx, cy, 18, 0, 2 * Math.PI); ctx.fill();
            ctx.fillStyle = adjustColor(item.hex, 1.35);
            ctx.beginPath(); ctx.arc(cx - 5, cy - 5, 5, 0, 2 * Math.PI); ctx.fill();
        }
    }
    
    // Подписи под кубиками
    ctx.fillStyle = "#1A1A1A";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    // Выводим название цвета по центру под кубиком
    ctx.fillText(item.name, bx + BRICK_W / 2, by + BRICK_H + 28);
});
</script>
