# Sort & Upgrade

Казуальная сортировка для Яндекс Игр: предметы на поле, drag & drop в подходящие контейнеры, уровни, позже — постоянные улучшения.

Требования: [`GAME_DESIGN.md`](./GAME_DESIGN.md). План: [`TODO.md`](./TODO.md).

Сейчас закрыта **Phase 1**: можно пройти уровень. Нет монет, магазина, жизней и рекламы.

## Запуск

```bash
npm install
npm run build
npm run preview
```

Открыть **http://localhost:47321**.

Для разработки с hot reload: `npm run dev` (тот же порт). Для Preview в Cursor надежнее `build` + `preview`.

## Обновить локальную копию

```bash
cd ~/sortup
git pull origin main
npm install
npm run build
npm run preview
```

## Как играть

1. Перетащи фигуру в контейнер с той же формой.
2. Не туда — фигура вернётся на место.
3. Все фигуры на местах — экран «уровень пройден», нажми для следующего.

## Стек

Vite, TypeScript, HTML5 Canvas. Без фреймворка UI.
