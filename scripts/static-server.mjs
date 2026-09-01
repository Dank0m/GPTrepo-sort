import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 47321;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function safeFile(urlPath) {
  const raw = decodeURIComponent((urlPath ?? "/").split("?")[0] || "/");
  const relative = raw === "/" ? "index.html" : raw.replace(/^\/+/, "");
  const file = path.normalize(path.join(ROOT, relative));
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) {
    return null;
  }
  return file;
}

function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Connection", "close");

  if (req.method === "HEAD" || req.method === "GET") {
    const file = safeFile(req.url);
    if (!file) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("not found");
        return;
      }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      res.end(data);
    });
    return;
  }

  res.writeHead(405);
  res.end();
}

function listen(host) {
  const server = http.createServer({ keepAlive: false }, handler);
  server.keepAliveTimeout = 0;
  server.headersTimeout = 0;
  server.requestTimeout = 0;
  server.timeout = 0;
  server.on("error", (err) => {
    const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
    if (host === "::1" && (code === "EADDRINUSE" || code === "EADDRNOTAVAIL" || code === "EAFNOSUPPORT")) {
      console.warn(`skip ${host}:${PORT} (${code})`);
      return;
    }
    console.error(err);
    process.exit(1);
  });
  server.listen(PORT, host, () => {
    console.log(`static preview on http://${host}:${PORT}  root=${ROOT}`);
  });
  return server;
}

if (!fs.existsSync(path.join(ROOT, "index.html"))) {
  console.error("dist/index.html missing — run npm run build first");
  process.exit(1);
}

listen("0.0.0.0");
listen("::1");
