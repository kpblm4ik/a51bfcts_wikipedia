# Движок ECM для «Опасной зоны»

Здесь должен лежать файл `ecm-engine.js`. Пока его нет, кнопка «Начать» на странице экспериментов неактивна.

**ECM** (Enhanced Compression Model) — референсное ПО команды JVET (на C++). Готовой версии для браузера нет: её нужно собрать в WebAssembly (например, через Emscripten) и обернуть в Web Worker по контракту ниже. Перед публикацией сборки проверьте лицензию ECM.

## Контракт

`ecm-engine.js` — обычный (не module) Web Worker. Страница создаёт его через `new Worker(url)`.

Входящее сообщение (буферы передаются без копирования):

```js
{ cmd: 'encode',
  width: 640, height: 360,      // чётные
  fps: 15, qp: 32,
  config: 'ra',                 // 'ra' (Random Access) | 'ld' (Low Delay) | 'ai' (All Intra)
  frames: [ArrayBuffer, ...] }  // кадры I420, 8 бит, BT.709 limited, плоскости Y, U, V подряд
```

Исходящие сообщения:

```js
{ type: 'progress', done: 3, total: 30 }
{ type: 'done', data: ArrayBuffer }        // поток ECM, лучше с transfer
{ type: 'error', message: '...' }
```

## Замечания по сборке

- На GitHub Pages нельзя задать заголовки COOP/COEP, поэтому `SharedArrayBuffer` и pthread-сборка WebAssembly без дополнительных трюков (service worker) не заработают. Рассчитывайте на однопоточную сборку.
- Конфиги кодировщика из репозитория ECM нужно вшить в виртуальную файловую систему движка.
- Результат — поток ECM, который воспроизведёт только декодер ECM.
