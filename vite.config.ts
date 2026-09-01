import type { Plugin } from "vite";
import { defineConfig } from "vite";

/** Node defaults keepAliveTimeout to 5s; Cursor Preview holds the socket and then gets ERR_EMPTY_RESPONSE. */
function disableShortKeepAlive(): Plugin {
  const patch = (httpServer: { keepAliveTimeout: number; headersTimeout: number; requestTimeout: number; timeout: number } | null): void => {
    if (!httpServer) {
      return;
    }
    httpServer.keepAliveTimeout = 0;
    httpServer.headersTimeout = 0;
    httpServer.requestTimeout = 0;
    httpServer.timeout = 0;
  };

  return {
    name: "disable-short-keep-alive",
    configureServer(server) {
      return () => {
        patch(server.httpServer);
      };
    },
    configurePreviewServer(server) {
      return () => {
        patch(server.httpServer);
      };
    },
  };
}

export default defineConfig({
  plugins: [disableShortKeepAlive()],
  server: {
    host: "0.0.0.0",
    port: 47321,
    strictPort: true,
    allowedHosts: true,
    hmr: false,
  },
  preview: {
    host: "0.0.0.0",
    port: 47321,
    strictPort: true,
    allowedHosts: true,
  },
});
