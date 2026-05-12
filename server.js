#!/usr/bin/env node

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const START_PORT = 48187;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function openBrowser(url) {
  const platform = process.platform;

  if (platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
  } else if (platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
  } else {
    spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  }
}

function safeJoin(base, requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const resolved = path.resolve(base, "." + decoded);

  if (!resolved.startsWith(base)) {
    return null;
  }

  return resolved;
}

async function serveFile(res, filePath) {
  try {
    const data = await fs.readFile(filePath);
    const type = mime[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";

    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
  }
}

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (url.pathname === "/") {
      return serveFile(res, path.join(ROOT, "index.html"));
    }

    const rootFile = safeJoin(ROOT, url.pathname);

    if (!rootFile) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("403 Forbidden");
    }

    return serveFile(res, rootFile);
  });
}

function listenOnOpenPort(port) {
  const server = createServer();

  server.once("error", err => {
    if (err.code === "EADDRINUSE") {
      listenOnOpenPort(port + 1);
    } else {
      throw err;
    }
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}/`;
    console.log(`Serving ${url}`);
    console.log(`Root:   ${ROOT}/index.html`);
    console.log(`Public: ${PUBLIC}/`);

    openBrowser(url);
  });
}

listenOnOpenPort(START_PORT);
