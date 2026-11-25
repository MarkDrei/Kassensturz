// Kassensturz backend: serves the whole site (static frontend + JSON API) on PORT (default 3000).
// Static files are read once, gzip-compressed once and kept in memory (the whole site is ~2 MB).
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".svg", ".txt", ".md"]);
const cache = new Map(); // abs path -> { raw, gz, type, etag }

function load(file) {
  if (cache.has(file)) return cache.get(file);
  const raw = fs.readFileSync(file);
  const ext = path.extname(file);
  const stat = fs.statSync(file);
  const entry = {
    raw,
    gz: COMPRESSIBLE.has(ext) ? zlib.gzipSync(raw, { level: 9 }) : null,
    type: TYPES[ext] || "application/octet-stream",
    etag: `"${stat.size.toString(36)}-${stat.mtimeMs.toString(36)}"`,
  };
  cache.set(file, entry);
  return entry;
}

function send(req, res, file) {
  let entry;
  try {
    if (!fs.statSync(file).isFile()) throw new Error("not a file");
    entry = load(file);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Not found");
  }
  const headers = {
    "Content-Type": entry.type,
    ETag: entry.etag,
    Vary: "Accept-Encoding",
    // HTML always revalidates; versioned vendor files are immutable; data/js/css revalidate after 5 min.
    "Cache-Control": file.endsWith(".html")
      ? "no-cache"
      : file.includes(`${path.sep}vendor${path.sep}`)
        ? "public, max-age=31536000, immutable"
        : "public, max-age=300",
  };
  if (req.headers["if-none-match"] === entry.etag) {
    res.writeHead(304, headers);
    return res.end();
  }
  const gzip = entry.gz && /\bgzip\b/.test(req.headers["accept-encoding"] || "");
  if (gzip) headers["Content-Encoding"] = "gzip";
  const body = gzip ? entry.gz : entry.raw;
  headers["Content-Length"] = body.length;
  res.writeHead(200, headers);
  res.end(req.method === "HEAD" ? undefined : body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/health") {
    res.writeHead(200, { "Content-Type": TYPES[".json"] });
    return res.end(JSON.stringify({ ok: true }));
  }
  if (url.pathname.startsWith("/api/")) {
    res.writeHead(404, { "Content-Type": TYPES[".json"] });
    return res.end(JSON.stringify({ error: "not found" }));
  }
  let rel;
  try {
    rel = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400);
    return res.end();
  }
  const file = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  send(req, res, file);
});

server.listen(PORT, "0.0.0.0", () => console.log(`Kassensturz listening on :${PORT}`));
