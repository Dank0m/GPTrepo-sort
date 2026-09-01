# Sort & Upgrade

Браузерная 2D-игра на HTML5 Canvas и TypeScript. Сейчас **PHASE 5**: полировка UI, обратная связь и звук.

Это конвейерная версия (лента слева направо, жизни, сессионный магазин). Требования: [`GAME_DESIGN.md`](./GAME_DESIGN.md). План: [`TODO.md`](./TODO.md).

## Запуск

```bash
npm install
npm run build
npm run preview
```

Открыть **http://localhost:47321**.

Для разработки: `npm run dev` (тот же порт).

## Правила

- Перетащи предмет в контейнер своего типа.
- Верный дроп: монеты × комбо, частицы и звук.
- Ошибка или съезд с ленты: −1 жизнь, комбо сбрасывается.
- Полный контейнер: предмет возвращается на ленту без штрафа.
- Кнопки внизу: скорость, ценность, тип, автосорт, буфер. До конца сессии.
- Динамик в углу HUD выключает звук. Клавиша **D** — debug overlay.

## Обновить локальную копию

```bash
cd ~/sortup
git fetch origin
git checkout cursor/conveyor-prototype-b9e9
git pull origin cursor/conveyor-prototype-b9e9
npm install
npm run build
npm run preview
```
