# Sort & Upgrade

Браузерная 2D-игра на HTML5 Canvas и TypeScript. Сейчас реализована только **PHASE 0**: запускаемый проект, полноэкранный canvas, игровой цикл и адаптация под размер окна. Игровых механик нет.

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
  main.ts            точка входа
  config.ts          константы PHASE 0
  style.css          полноэкранный canvas
  core/canvas.ts     размер, DPR, 2D-контекст
  core/loop.ts       игровой цикл
  core/app.ts        сборка приложения
  debug/overlay.ts   заглушка сцены и debug HUD
```
