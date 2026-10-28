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

---

### Все цвета блоков

<div id="svgContainer"></div>

<script>
const COIL_COLORS = [
  { hex: "#7F00FF", name: "Пурпурный" }, { hex: "#9F00FF", name: "Фиолетовый" },
  { hex: "#007FFF", name: "Голубой" }, { hex: "#0000FF", name: "Синий" },
  { hex: "#00008B", name: "Темно-синий" }, { hex: "#00FFFF", name: "Чистый синий" },
  { hex: "#4B0082", name: "Индиго" }, { hex: "#00FF00", name: "Зеленый" },
  { hex: "#32CD32", name: "Лайм" }, { hex: "#006400", name: "Темно-зеленый" },
  { hex: "#ADFF2F", name: "Зелено-желтый" }, { hex: "#808000", name: "Оливковый" },
  { hex: "#FFFF00", name: "Желтый" }, { hex: "#FFD700", name: "Золотой" },
  { hex: "#FFA500", name: "Оранжевый" }, { hex: "#FF8C00", name: "Темно-оранжевый" },
  { hex: "#FF4500", name: "Красно-оранжевый" }, { hex: "#E69A8B", name: "Терракотовый" },
  { hex: "#FF0000", name: "Красный" }, { hex: "#8B0000", name: "Темно-красный" },
  { hex: "#B22222", name: "Кирпичный" }, { hex: "#FFC0CB", name: "Розовый" },
  { hex: "#FF69B4", name: "Ярко-розовый" }, { hex: "#C71585", name: "Глубокий розовый" },
  { hex: "#FFFFFF", name: "Белый" }, { hex: "#D3D3D3", name: "Светло-серый" },
  { hex: "#808080", name: "Серый" }, { hex: "#A9A9A9", name: "Темно-серый" },
  { hex: "#000000", name: "Черный" }, { hex: "#8B4513", name: "Коричневый" },
  { hex: "#A0522D", name: "Сиена" }, { hex: "#CD853F", name: "Перу" },
  { hex: "#DEB887", name: "Бурый" }, { hex: "#F5F5DC", name: "Бежевый" },
  { hex: "#D2B48C", name: "Загар" }
];

function adjustColor(hex, factor) {
    hex = hex.replace('#', '');
    let r = Math.max(0, Math.min(255, Math.floor(parseInt(hex.substring(0, 2), 16) * factor)));
    let g = Math.max(0, Math.min(255, Math.floor(parseInt(hex.substring(2, 4), 16) * factor)));
    let b = Math.max(0, Math.min(255, Math.floor(parseInt(hex.substring(4, 6), 16) * factor)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const WIDTH = 600; const COLS = 4; const BRICK_W = 110; const BRICK_H = 220; const STUD = 55;
const PAD_X = (WIDTH - (COLS * BRICK_W)) / (COLS + 1); const PAD_Y = 25; const TEXT_SPACE = 40;
const ROWS = Math.ceil(COIL_COLORS.length / COLS);
const HEIGHT = PAD_Y + ROWS * (BRICK_H + PAD_Y + TEXT_SPACE);

let svgContent = `<svg width="100%" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://w3.org" style="background:#0a0a0a; border: 2px solid #222; border-radius: 8px;">
  <defs>
    <filter id="inset-shadow">
      <feOffset dx="0" dy="2"/><feGaussianBlur stdDeviation="2" result="offset-blur"/>
      <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
      <feFlood flood-color="black" flood-opacity="0.6" result="color"/><feComposite operator="in" in="color" in2="inverse" result="shadow"/>
      <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
    </filter>
  </defs>`;

  COIL_COLORS.forEach((item, idx) => {
    const col = idx % COLS; const row = Math.floor(idx / COLS);
    const bx = PAD_X + col * (BRICK_W + PAD_X); const by = PAD_Y + row * (BRICK_H + PAD_Y + TEXT_SPACE);
    const strokeColor = adjustColor(item.hex, 0.75);

    svgContent += `  <g class="falling-brick" data-start-x="${bx}" data-start-y="${by}">
  <rect x="${bx}" y="${by}" width="${BRICK_W}" height="${BRICK_H}" fill="${item.hex}" stroke="${strokeColor}" stroke-width="3" />`;

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 2; c++) {
            const cx = bx + c * STUD + STUD / 2; const cy = by + r * STUD + STUD / 2;
            const size = 36; const rx = cx - size / 2; const ry = cy - size / 2;
            svgContent += `  <rect x="${rx}" y="${ry + 3}" width="${size}" height="${size}" rx="4" fill="${strokeColor}" opacity="0.3" />
  <rect x="${rx}" y="${ry}" width="${size}" height="${size}" rx="4" fill="${item.hex}" filter="url(#inset-shadow)" stroke="${strokeColor}" stroke-width="1.5" />`;
        }
    }

    if (item.name.includes('-')) {
        const parts = item.name.split('-');
        svgContent += `  <text x="${bx + BRICK_W / 2}" y="${by + BRICK_H + 25}" font-family="monospace" font-size="14" fill="#AAA" text-anchor="middle">
            <tspan x="${bx + BRICK_W / 2}" dy="0">${parts[0]}-</tspan>
            <tspan x="${bx + BRICK_W / 2}" dy="18">${parts[1]}</tspan>
        </text></g>`;
    } else {
        svgContent += `  <text x="${bx + BRICK_W / 2}" y="${by + BRICK_H + 25}" font-family="monospace" font-size="14" fill="#AAA" text-anchor="middle">${item.name}</text></g>`;
    }
});

svgContent += `</svg>`;
document.getElementById('svgContainer').innerHTML = svgContent;

const btn = document.createElement('button');
btn.innerText = 'НЕ ТРОГАТЬ';
btn.style.cssText = 'display:block; margin: 15px auto; padding: 12px 24px; background: #111; color: #ff3333; border: 2px solid #ff3333; border-radius: 4px; font-family: monospace; font-size: 14px; cursor: pointer; font-weight: bold; z-index: 20; position: relative;';
document.getElementById('svgContainer').before(btn);

let isChaos = false; let bricks = []; let shakeX = 0; let shakeY = 0;

if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', (event) => {
        if (!isChaos) return;
        shakeX = (event.accelerationIncludingGravity.x || 0) * -1.2;
        shakeY = (event.accelerationIncludingGravity.y || 0) * 1.2;
    });
}

btn.addEventListener('click', () => {
    if (isChaos) return;
    isChaos = true;
    btn.innerText = 'ЧТО ТЫ НАДЕЛАЛ?!';
    btn.style.color = '#00ff00'; btn.style.borderColor = '#00ff00';

    document.querySelectorAll('.falling-brick').forEach((el) => {
        const startX = parseFloat(el.getAttribute('data-start-x'));
        const startY = parseFloat(el.getAttribute('data-start-y'));
        bricks.push({
            element: el, x: startX, y: startY,
            vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15,
            w: 110, h: 260, angle: 0, angularVelocity: (Math.random() - 0.5) * 0.1
        });
    });
    requestAnimationFrame(updatePhysics);
});

function updatePhysics() {
    if (bricks && !bricks.optimized) {
        document.querySelectorAll('rect').forEach(r => { r.removeAttribute('filter'); r.setAttribute('stroke-width', '1'); });
        const svgEl = document.querySelector('svg');
        if (svgEl) { svgEl.style.overflow = 'visible'; svgEl.style.position = 'relative'; svgEl.style.zIndex = '10'; }
        bricks.optimized = true;
    }

    const svgRect = document.querySelector('svg').getBoundingClientRect();
    const screenWidthInSvg = window.innerWidth * (600 / svgRect.width);
    const screenHeightInSvg = window.innerHeight * (HEIGHT / svgRect.height);
    
    const viewX = -svgRect.left * (600 / svgRect.width);
    const viewY = -svgRect.top * (HEIGHT / svgRect.height);

    bricks.forEach((b) => {
        b.vx += shakeX;
        b.vy += (shakeY === 0) ? 0.4 : shakeY;
        b.vx *= 0.98; b.vy *= 0.98; b.angularVelocity *= 0.96;
        b.x += b.vx; b.y += b.vy; b.angle += b.angularVelocity;

        // Отскоки строго внутри рамок телефона
        if (b.x < viewX) { b.x = viewX; b.vx *= -0.5; b.angularVelocity += b.vy * 0.003; }
        if (b.x + b.w > viewX + screenWidthInSvg) { b.x = viewX + screenWidthInSvg - b.w; b.vx *= -0.5; b.angularVelocity -= b.vy * 0.003; }
        if (b.y < viewY) { b.y = viewY; b.vy *= -0.5; b.angularVelocity += b.vx * 0.003; }
        if (b.y + b.h > viewY + screenHeightInSvg) { 
            b.y = viewY + screenHeightInSvg - b.h; b.vy *= -0.3; b.vx *= 0.7; b.angularVelocity *= 0.4;
            if (Math.abs(b.vy) < 0.25) b.vy = 0;
        }

        // Логика кучи
        bricks.forEach((other) => {
            if (b === other) return;
            let dx = other.x - b.x; let dy = other.y - b.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 130 && distance > 0) {
                let overlap = 130 - distance;
                b.x -= (dx / distance) * overlap * 0.5; b.y -= (dy / distance) * overlap * 0.5;
                b.vx *= -0.4; b.vy *= -0.4; b.angularVelocity += (b.vx - other.vx) * 0.006;
            }
        });

        b.element.style.transform = `translate(${b.x}px, ${b.y}px) rotate(${b.angle}rad)`;
        b.element.style.transformOrigin = 'center';
    });
    requestAnimationFrame(updatePhysics);
}
</script>
