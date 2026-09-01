# Sort & Upgrade

Браузерная 2D-игра на HTML5 Canvas и TypeScript. Сейчас **PHASE 4**: монеты тратятся на апгрейды внизу экрана.

Требования: [`GAME_DESIGN.md`](./GAME_DESIGN.md). План: [`TODO.md`](./TODO.md).

## Запуск

```bash
npm install
npm run dev
```

Собранная версия (Preview в облаке):

```bash
npm run build
npm run preview
```

Открыть **http://localhost:47321**.

## Правила

- Перетащи предмет в контейнер своего типа.
- Верный дроп: монеты × комбо.
- Ошибка или съезд с ленты: −1 жизнь, комбо сбрасывается.
- Кнопки внизу: скорость, ценность, тип, автосорт, буфер. Действуют до конца сессии.

## Обновить локальную копию

```bash
cd ~/sortup
git pull origin main
npm run build
npm run preview
```
