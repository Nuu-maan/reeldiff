import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
};

export function serveDir(root: string, port: number): Promise<Server> {
  const base = resolve(root);
  const server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    const file = normalize(join(base, pathname.endsWith("/") ? `${pathname}index.html` : pathname));
    if (file !== base && !file.startsWith(base + sep)) {
      res.writeHead(403).end();
      return;
    }
    const info = await stat(file).catch(() => undefined);
    if (!info?.isFile()) {
      res.writeHead(404).end("Not found");
      return;
    }
    const headers = {
      "content-type": types[extname(file)] ?? "application/octet-stream",
      "accept-ranges": "bytes",
      "cache-control": "no-cache",
    };
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
    if (range) {
      const start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
      if (start > end || start >= info.size) {
        res.writeHead(416, { "content-range": `bytes */${info.size}` }).end();
        return;
      }
      res.writeHead(206, {
        ...headers,
        "content-range": `bytes ${start}-${end}/${info.size}`,
        "content-length": end - start + 1,
      });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { ...headers, "content-length": info.size });
    createReadStream(file).pipe(res);
  });
  return new Promise((done, fail) => {
    server.once("error", fail);
    server.listen(port, "127.0.0.1", () => done(server));
  });
}
