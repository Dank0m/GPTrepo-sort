# Original publication artwork

- `icon.svg` → `icon.png`: 512 × 512 px.
- `cover.svg` → `cover.png`: 800 × 470 px; title exactly `Sort & Upgrade`.

The SVG sources were drawn for this repository from geometric shapes and an abstract conveyor. They do not contain gameplay screenshots, interface controls, third-party images, textures, logos or remote fonts. The cover uses locally available system sans-serif typography; no font binary or font download is included. Both images are full rectangular compositions without an outer frame or rounded image corners.

PNG files were rendered directly from these SVGs in Chromium at device scale 1 and exported as RGB with 8 bits per channel (24-bit PNG, no alpha). These are screenshots of the original SVG artwork, **not screenshots of the game**. Actual gameplay screenshots and video are separate publication materials.

Source requirements: [icon and cover fields](https://yandex.ru/dev/games/doc/ru/console/add-new-game/draft#icon-and-cover), [publication requirements](https://yandex.ru/dev/games/doc/ru/concepts/requirements). The images belong in the publication package, not in the game `dist` archive or `public` assets.

## Gameplay captures — version 1.1.0

- `desktop-1.png`, `desktop-2.png`: real production game at 1280 × 720.
- `mobile-1.png`, `mobile-2.png`: real production game in a mobile viewport at 720 × 1280.
- `upgrade-tree.png`: additional desktop capture of the real upgrade tree; use gameplay captures as primary screenshots.
- `gameplay.mp4`: Chromium capture of real pointer actions and upgrades, H.264 MP4, 1280 × 720, 26.48 seconds, approximately 0.98 MB. No audio track. The clip demonstrates real sorting and purchases in the new permanent upgrade tree.

All screenshots are RGB24 PNG without alpha or browser frames. No images were composited onto the game. The video uses deterministic random shapes to make its demonstration reproducible; screenshots use the ordinary game generator. No fake ad rewards, injected currency or modified progression were used. These files go in the separate media fields of the publication card, not inside the game ZIP.
