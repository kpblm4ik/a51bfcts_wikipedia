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

***Описание*** *- призовите случайные и бесполезные блоки с помощью заклинания*

**Катушка призыва** - одна из пяти катушек, для которой требуется получение значка в игре, четыре других: [**катушка расщепления**](fissioncoil.html), [**флекс-катушка**](flexcoil.html), [**зовки-катушка**](zowkycoil.html), [**защитная катушка**](guardiancoil.html). Особенностью данной катушки является призыв блоков 4 на 2 на 1 (Длина-Ширина-Высота), все найденные цвета блоков 

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
{ hex: "#4477CC", name: "Джинсовый" },
{ hex: "#3A3A3A", name: "Графитовый" },
{ hex: "#B5341A", name: "Кирпичный" },
{ hex: "#F0EDE8", name: "Белый" },
{ hex: "#6B3A1A", name: "Средне-коричневый" },
{ hex: "#7B2010", name: "Темно-кирпичный" }
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

    // 1. ОТКРЫВАЕМ ГРУППУ ДЛЯ ПАСХАЛКИ (ДОБАВИЛИ СЮДА)
    svgContent += `  <g class="falling-brick" data-start-x="${bx}" data-start-y="${by}">\n`;

    // Тело кубика и его внешняя обводка
    svgContent += `  <rect x="${bx}" y="${by}" width="${BRICK_W}" height="${BRICK_H}" fill="${item.hex}" stroke="${strokeColor}" stroke-width="3" />\n`;

    // 2. Генерация ячеек (2х4)
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 2; c++) {
            const cx = bx + c * STUD + STUD / 2;
            const cy = by + r * STUD + STUD / 2;
            const size = 36;
            const rx = cx - size / 2;
            const ry = cy - size / 2;

            svgContent += `  <rect x="${rx}" y="${ry + 3}" width="${size}" height="${size}" rx="4" fill="${strokeColor}" opacity="0.3" />\n`;
            svgContent += `  <rect x="${rx}" y="${ry}" width="${size}" height="${size}" rx="4" fill="${item.hex}" filter="url(#inset-shadow)" stroke="${strokeColor}" stroke-width="1.5" />\n`;
        }
    }

    // 3. Текстовая подпись под кубиком
    if (item.name.includes('-')) {
        const parts = item.name.split('-');
        svgContent += `  <text x="${bx + BRICK_W / 2}" y="${by + BRICK_H + 25}" font-family="monospace" font-size="14" fill="#AAA" text-anchor="middle">
            <tspan x="${bx + BRICK_W / 2}" dy="0">${parts[0]}-</tspan>
            <tspan x="${bx + BRICK_W / 2}" dy="18">${parts[1]}</tspan>
        </text>\n`;
    } else {
        svgContent += `  <text x="${bx + BRICK_W / 2}" y="${by + BRICK_H + 25}" font-family="monospace" font-size="14" fill="#AAA" text-anchor="middle">${item.name}</text>\n`;
    }

    svgContent += `  </g>\n`; 
});
    
// Монтируем сгенерированный SVG в DOM
document.getElementById('svgContainer').innerHTML = svgContent;

// ========================================================
// ЛОГИКА ДЛЯ ПАСХАЛКИ (ДОБАВЛЯЕМ КНОПКУ И ФИЗИКУ ПАДЕНИЯ)
// ========================================================

// 1. Создаем и добавляем кнопку «НЕ ТРОГАТЬ» прямо над картой
const btn = document.createElement('button');
btn.innerText = 'НЕ ТРОГАТЬ';
btn.style.cssText = 'display:block; margin: 10px auto; padding: 10px 20px; background: #222; color: #ff3333; border: 1px solid #ff3333; font-family: monospace; font-size: 14px; cursor: pointer; font-weight: bold;';
document.getElementById('svgContainer').before(btn);

let isChaos = false;
let bricks = [];
let shakeX = 0;
let shakeY = 0;

// 2. Слушаем наклон и тряску телефона (Акселерометр)
if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', (event) => {
        if (!isChaos) return;
        // Считываем положение телефона в пространстве
        shakeX = (event.accelerationIncludingGravity.x || 0) * -1.2;
        shakeY = (event.accelerationIncludingGravity.y || 0) * 1.2;
    });
}

// 3. Активация хаоса при клике на кнопку
btn.addEventListener('click', () => {
    if (isChaos) return;
    isChaos = true;
    btn.innerText = 'ЧТО ТЫ НАДЕЛАЛ?!';
    btn.style.color = '#00ff00';
    btn.style.borderColor = '#00ff00';

    // Находим все кубики на странице
    const brickElements = document.querySelectorAll('.falling-brick');
    
    brickElements.forEach((el) => {
        // Запоминаем стартовые позиции, которые выдал твой скрипт
        const startX = parseFloat(el.getAttribute('data-start-x'));
        const startY = parseFloat(el.getAttribute('data-start-y'));
        
        bricks.push({
            element: el,
            x: startX,
            y: startY,
            vx: (Math.random() - 0.5) * 15, // Случайный толчок вбок при старте
            vy: (Math.random() - 0.5) * 15, // Случайный толчок вверх/вниз
            w: 110, // Приблизительная ширина кубика с отступами
            h: 260  // Высота кубика вместе с текстом
        });
    });

    // Запускаем бесконечный цикл падения
    requestAnimationFrame(updatePhysics);
});

// 4. Математика падения и отскоков
// 1. При старте хаоса (в обработчике клика на кнопку, там где bricks.push),
// обязательно добавь кубикам начальный угол и скорость вращения:
// b.angle = 0;
// b.angularVelocity = (Math.random() - 0.5) * 0.1; // случайное вращение при старте

function updatePhysics() {
    // Включаем оптимизацию и разрешаем вылет за рамки SVG
    if (bricks[0] && !bricks[0].optimized) {
        document.querySelectorAll('rect').forEach(rect => {
            rect.removeAttribute('filter');
            rect.setAttribute('stroke-width', '1');
        });
        
        // Магия: делаем SVG "прозрачным" для вылетающих кубиков
        const svgEl = document.querySelector('svg');
        if (svgEl) {
            svgEl.style.overflow = 'visible';
            svgEl.style.position = 'relative';
            svgEl.style.zIndex = '10';
        }
        
        // Инициализируем физику вращения для всех блоков
        bricks.forEach(b => {
            b.angle = b.angle || 0;
            b.angularVelocity = b.angularVelocity || (Math.random() - 0.5) * 0.1;
        });
        
        bricks[0].optimized = true;
    }
    
    // Получаем реальные размеры экрана телефона, чтобы кубики летали по всей странице!
    const containerWidth = window.innerWidth; 
    const containerHeight = document.documentElement.scrollHeight || window.innerHeight;

    bricks.forEach((b) => {
        let gravityX = shakeX;
        let gravityY = (shakeY === 0) ? 0.4 : shakeY;

        b.vx += gravityX;
        b.vy += gravityY;

        b.vx *= 0.98;
        b.vy *= 0.98;
        b.angularVelocity *= 0.98; // Торможение вращения воздухом

        b.x += b.vx;
        b.y += b.vy;
        b.angle += b.angularVelocity; // Меняем угол поворота

        // --- ФИЗИКА ОТСКОКОВ И ВРАЩЕНИЯ ---
        
        // Отскок от левой стены экрана
        if (b.x < 0) { 
            b.x = 0; 
            b.vx *= -0.6; 
            b.angularVelocity += b.vy * 0.002; // Удар закручивает блок!
        }
        // Отскок от правой стены экрана
        if (b.x + b.w > containerWidth) { 
            b.x = containerWidth - b.w; 
            b.vx *= -0.6; 
            b.angularVelocity -= b.vy * 0.002;
        }
        // Отскок от потолка
        if (b.y < 0) { 
            b.y = 0; 
            b.vy *= -0.6; 
            b.angularVelocity += b.vx * 0.002;
        }
        
        // Отскок от пола страницы (Засыпание дна)
        if (b.y + b.h > containerHeight) { 
            b.y = containerHeight - b.h; 
            b.vy *= -0.4; // Мягкий отскок, чтобы они оседали
            b.vx *= 0.8;  // Трение о пол
            b.angularVelocity *= 0.5; // Затухание кручения
            
            // Если скорость совсем маленькая — блок "засыпает"
            if (Math.abs(b.vy) < 0.2) b.vy = 0;
        }

        // --- СТОЛКНОВЕНИЯ МЕЖДУ КУБИКАМИ (Простая засыпка грудой) ---
        bricks.forEach((other) => {
            if (b === other) return; // Не сталкиваемся сами с собой
            
            // Проверяем расстояние между центрами кубиков
            let dx = other.x - b.x;
            let dy = other.y - b.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            
            // Если кубики слишком близко друг к другу (наползают)
            let minDist = b.w * 0.9; 
            if (distance < minDist && distance > 0) {
                let overlap = minDist - distance;
                // Расталкиваем их в стороны
                let nx = dx / distance;
                let ny = dy / distance;
                
                b.x -= nx * overlap * 0.5;
                b.y -= ny * overlap * 0.5;
                
                // Передаем импульс скорости друг другу
                b.vx *= -0.5;
                b.vy *= -0.5;
                b.angularVelocity += (b.vx - other.vx) * 0.005; // Закручивание при столкновении
            }
        });

        // ПРИМЕНЯЕМ СРАЗУ И ПОЗИЦИЮ, И ПОВОРОТ
        // Магия translate + rotate заставит кубик крутиться вокруг своей оси!
        b.element.style.transform = `translate(${b.x}px, ${b.y}px) rotate(${b.angle}rad)`;
        b.element.style.transformOrigin = 'center'; // Крутим ровно по центру
    });

    requestAnimationFrame(updatePhysics);
}
