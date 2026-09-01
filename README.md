# Sort & Upgrade

Браузерная игра на HTML5 Canvas и TypeScript для Яндекс Игр.

Полные требования: [`GAME_DESIGN.md`](./GAME_DESIGN.md). План: [`TODO.md`](./TODO.md).

Сейчас в репозитории ещё крутится **конвейерный прототип**. Официальный дизайн — уровни, drag & drop на поле, procedural generation, постоянные upgrades. Это не одно и то же.

## Запуск

```bash
npm install
npm run dev
```

Собранная версия:

```bash
npm run build
npm run preview
```

Открыть **http://localhost:47321**.

## Обновить локальную копию

```bash
cd ~/sortup
git pull origin main
npm run build
npm run preview
```
