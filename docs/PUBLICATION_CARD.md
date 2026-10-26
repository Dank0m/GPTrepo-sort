# Карточка публикации 1.1.0

Название во всех языках, игре и обложке: **Sort & Upgrade**. Версия в Консоли: **1.1.0**. Платформы: desktop/mobile, без ТВ. Ориентации: любая. Языки RU/EN. Категории аркады/казуальные. Облачные сохранения включить, монетизацию включить; инап-покупок нет. До финальной проверки оставить отсроченную публикацию. Контент — геометрические фигуры; возрастную анкету пройти в Консоли (ориентир 0+). Уникальность названия и права аккаунта проверяются там же.

## RU

**Название**

Sort & Upgrade

**SEO**

Сортируйте фигуры, развивайте постоянное дерево навыков и управляйте конвейером. Широкий захват, автоматика, комбо и задания дня!

**Короткое описание**

Сортируй фигуры и развивай своё дерево улучшений!

**Об игре**

Управляй сортировочной линией и открывай новые способы работы. В постоянном дереве 12 навыков: широкий захват группы, магнитный прицел, разгрузочный люк, двойной автосорт, возвратная лента и другие улучшения. Выбирай между контролем, автоматикой и доходом. Каждые 20 верных сортировок темп растёт, до десятой смены. Заполняй контейнеры ради награды, выполняй задания дня и развивай мастерство. Купленные навыки сохраняются после проигрыша. Комбо даёт ограниченный бонус, поэтому монеты нужно тратить обдуманно. Реклама доступна только для добровольного удвоения награды полного набора.

**Как играть**

Мышью или пальцем перетаскивай фигуры в контейнер той же формы и цвета. За верные действия получай монеты; ошибки отнимают жизни. Кнопка «Улучшения» открывает дерево и ставит игру на паузу. Сначала купи «Разделители», затем «Широкий захват»: ПКМ начнёт переносить несколько фигур сразу. На телефоне включи кнопку группы и захвати фигуры пальцем. Подходящие заполнят контейнер, остальные вернутся без штрафа. Заполни все контейнеры ради награды. С навыком «Разгрузочный люк» можно нажать отдельный полный контейнер и разгрузить его за меньшую сумму. Динамик выключает звук; Escape или P ставит паузу.

**Ключевые слова**

сортировка,конвейер,фигуры,дерево навыков,автосорт,улучшения

## EN

**Title**

Sort & Upgrade

**SEO**

Sort shapes, build a permanent skill tree and manage your conveyor. Unlock group pickup, automation, limited combo bonuses and daily missions!

**Short description**

Sort shapes and grow your own upgrade tree!

**About**

Run a sorting line and unlock new ways to play. A permanent tree offers 12 skills: wide group pickup, magnetic aim, an unload hatch, twin autosort, a return belt and more. Choose between control, automation and income. Every 20 correct sorts increases the pace, up to shift ten. Fill bins for rewards, complete daily missions and build mastery. Purchased skills survive defeat. Combos give a capped bonus, so spend your coins carefully. Rewarded ads are optional and only double a completed full-set reward.

**How to play**

Drag shapes into bins with the same shape and color using your mouse or finger. Correct sorts earn coins; mistakes cost lives. The Upgrades button opens the tree and pauses play. Buy Dividers, then Wide pickup to move groups with the right mouse button. On mobile, switch on the group button and pick shapes with your finger. Matching shapes enter the bin; others return without a penalty. Fill every bin for a reward. With Unload hatch, tap a full bin to empty it for a smaller payout. Use the speaker to mute sound and Escape or P to pause.

**Keywords**

sorting,conveyor,shapes,skill tree,autosort,upgrades

## Комментарий разработчика

HTML5 Canvas, мышь/тач, desktop/mobile без ТВ. SDK загружается по /sdk.js, Ready после первого интерактивного экрана, GameplayAPI размечает игру и паузы; обработаны game_api_pause/resume с сохранением ручной паузы. Запрос fullscreen — только по действию игрока. Реклама исключительно добровольно удваивает награду полного набора; награда только по onRewarded. Фиксированной выдачи монет за рекламу и инап-покупок нет. Дерево навыков, мастерство и рекорды хранятся локально и в Player data; дерево объединяется без потери купленных уровней. Текущая партия и её деньги хранятся локально после действий. После reload — пауза и свежая лента. После проигрыша навыки остаются, перенос денег ограничен 20 монетами плюс до 10 за мастерство. При переходе с 1.0 старые инфляционные деньги, рекорд монет и сессионные апгрейды сбрасываются; XP и задания сохраняются. Ресурсы сборки относительны для вложенного пути хостинга.

## Материалы

Файлы `docs/media`: icon.png 512×512, cover.png 800×470, desktop-1/2.png 1280×720, mobile-1/2.png 720×1280, gameplay.mp4 1280×720 до 28 секунд. Иконка и обложка — оригинальные SVG-иллюстрации без игрового UI. Скриншоты и видео необходимо загружать версии 1.1, где внизу две кнопки вместо старых пяти покупок. Дополнительный upgrade-tree.png показывает окно навыков и служит для ознакомления; основные два скриншота на платформу — desktop-1/2 и mobile-1/2.

Источник ограничений: https://yandex.ru/dev/games/doc/ru/console/add-new-game/draft . В поле «Архив» загружается только игровой ZIP, остальные материалы — в отдельные поля. Проверить реальный SDK checker, рекламу и сохранения на тестовой ссылке после загрузки; затем отправлять на модерацию.
