# Sort & Upgrade

Браузерная 2D-игра на HTML5 Canvas и TypeScript. Сейчас **PHASE 2**: перетащи предмет с ленты в контейнер своего типа. Монет, комбо и апгрейдов нет.

Требования: [`GAME_DESIGN.md`](./GAME_DESIGN.md). План: [`TODO.md`](./TODO.md).

## Запуск

Нужны Node.js 20+ и npm.

```bash
npm install
npm run dev
```

Откройте адрес, который выведет Vite (по умолчанию `http://localhost:47321`).

Собранная версия (Preview в облаке использует её):

```bash
npm run build
npm run preview
```

Другие команды:

```bash
npm run typecheck
npm run build
npm run preview
```

## Управление

- Мышь или палец: захватить предмет на ленте и бросить в контейнер того же цвета/формы.
- Верный дроп кладёт предмет в контейнер (`filled` растёт).
- Неверный дроп или полный контейнер возвращает предмет на ленту.

## Структура

```
src/
  main.ts              точка входа
  config.ts            фаза, типы предметов, скорости
  style.css            полноэкранный canvas
  core/canvas.ts       размер, DPR, 2D-контекст
  core/loop.ts         игровой цикл
  core/pointer.ts      координаты указателя
  core/app.ts          сборка приложения
  game/item.ts         предмет
  game/bin.ts          контейнер
  game/hit.ts          попадание по предмету и контейнеру
  game/layout.ts       раскладка под размер окна
  game/world.ts        спавн, лента, захват и дроп
  render/scene.ts      отрисовка сцены
  debug/overlay.ts     debug HUD
```
