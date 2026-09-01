import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 47321,
    strictPort: true,
    // Cloud Preview proxies with a non-localhost Host header; Vite 8 rejects it by default.
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 47321,
    strictPort: true,
  },
});
