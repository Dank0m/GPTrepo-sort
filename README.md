# Sort & Upgrade

Браузерная 2D-игра на HTML5 Canvas и TypeScript. Сейчас **PHASE 1**: предметы едут по ленте слева направо, снизу стоят контейнеры по типам. Сортировки, ввода и экономики нет.

Требования: [`GAME_DESIGN.md`](./GAME_DESIGN.md). План: [`TODO.md`](./TODO.md).

## Запуск

Нужны Node.js 20+ и npm.

```bash
npm install
npm run dev
```

Откройте адрес, который выведет Vite (по умолчанию `http://localhost:47321`).

Другие команды:

```bash
npm run typecheck
npm run build
npm run preview
```

## Структура

```
src/
  main.ts              точка входа
  config.ts            фаза, типы предметов, скорости
  style.css            полноэкранный canvas
  core/canvas.ts       размер, DPR, 2D-контекст
  core/loop.ts         игровой цикл
  core/app.ts          сборка приложения
  game/item.ts         предмет
  game/bin.ts          контейнер
  game/layout.ts       раскладка под размер окна
  game/world.ts        спавн и движение по ленте
  render/scene.ts      отрисовка сцены
  debug/overlay.ts     debug HUD
```
