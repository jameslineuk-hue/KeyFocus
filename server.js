const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8000);
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data", "entries.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

function json(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function readEntries() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch (_) {
    // Fallback to empty object if missing/corrupt.
  }
  return {};
}

async function writeEntries(entries) {
  const ordered = Object.keys(entries)
    .sort()
    .reduce((acc, key) => {
      acc[key] = entries[key];
      return acc;
    }, {});
  await fs.writeFile(DATA_FILE, `${JSON.stringify(ordered, null, 2)}\n`, "utf8");
}

function safePublicPath(urlPathname) {
  let pathname = urlPathname;
  if (pathname === "/") pathname = "/index.html";
  else if (pathname === "/generate") pathname = "/generate.html";
  else if (pathname === "/details") pathname = "/details.html";
  const normalized = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const absolute = path.join(ROOT, normalized);
  if (!absolute.startsWith(ROOT)) return null;
  return absolute;
}

const server = http.createServer(async (req, res) => {
  if (!req.url) return json(res, 400, { error: "Missing URL" });
  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  if (req.method === "POST" && url.pathname === "/api/entries") {
    try {
      let rawBody = "";
      for await (const chunk of req) rawBody += chunk;
      const body = JSON.parse(rawBody || "{}");

      const code = normalizeCode(body.code);
      const name = String(body.name || "").trim();
      const phone = String(body.phone || "").trim();
      if (!code || !name || !phone) {
        return json(res, 400, { error: "code, name, and phone are required" });
      }

      const all = await readEntries();
      all[code] = { name, phone };
      await writeEntries(all);
      return json(res, 200, { ok: true, code });
    } catch (error) {
      return json(res, 500, { error: "Failed to persist entry", detail: String(error.message || error) });
    }
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const filePath = safePublicPath(url.pathname);
  if (!filePath) return json(res, 400, { error: "Invalid path" });

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) return json(res, 404, { error: "Not found" });

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const content = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    if (req.method === "HEAD") return res.end();
    return res.end(content);
  } catch (_) {
    return json(res, 404, { error: "Not found" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`KeyFocus server running at http://${HOST}:${PORT}`);
});
