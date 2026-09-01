import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 47321,
    strictPort: true,
    // Cloud Preview proxies with a non-localhost Host header; Vite 8 rejects it by default.
    allowedHosts: true,
    // Preview tunnels HTTP, not the HMR WebSocket (ws://localhost vs 127.0.0.1).
    // A canvas game loop also breaks under HMR. Full reload is enough.
    hmr: false,
  },
  preview: {
    host: "0.0.0.0",
    port: 47321,
    strictPort: true,
    allowedHosts: true,
  },
});
