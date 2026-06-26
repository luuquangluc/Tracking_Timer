const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "dist");
const port = Number(process.argv[2]) || 8768;

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(root, safePath === "/" ? "index.html" : safePath);
  const isNavigationFallback = !path.extname(safePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (!isNavigationFallback) {
      res.writeHead(404, {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      });
      res.end("Not found");
      return;
    }
    filePath = path.join(root, "index.html");
  }

  const ext = path.extname(filePath);
  const isHashedAsset = filePath.includes(`${path.sep}assets${path.sep}`);
  res.writeHead(200, {
    "content-type": types[ext] || "application/octet-stream",
    "cache-control": isHashedAsset ? "public, max-age=31536000, immutable" : "no-cache",
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`static server listening on http://127.0.0.1:${port}`);
});
