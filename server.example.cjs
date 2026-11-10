"use strict";

// Serves the page and casts charts with FreeAstroAPI.
// Copy this file to server.cjs and paste the key between the quotes there.
// server.cjs is gitignored, so the key stays off GitHub. Leave this example empty.
const PASTED_KEY = "";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { BMFChart } = require("./chart.js");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8765;
const UPSTREAM = process.env.FREE_ASTRO_API_BASE || "https://api.freeastroapi.com";
const KEY = (
  path.basename(__filename) === "server.cjs" ? PASTED_KEY : process.env.FREE_ASTRO_API_KEY || ""
).trim();
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".cjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const cache = new Map();
const visitors = new Map();
let upstreamTimes = [];
let lastUpstream = 0;

function sendJson(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(payload),
  });
  response.end(payload);
}

function clientAddress(request) {
  return request.socket.remoteAddress || "unknown";
}

function allowVisitor(address) {
  const now = Date.now();
  const recent = (visitors.get(address) || []).filter((stamp) => now - stamp < 60_000);
  if (recent.length >= 8) {
    visitors.set(address, recent);
    return false;
  }
  recent.push(now);
  visitors.set(address, recent);
  return true;
}

function allowUpstream() {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  upstreamTimes = upstreamTimes.filter((stamp) => stamp > dayAgo);
  return upstreamTimes.length < 70;
}

function remember(key, status, body) {
  cache.set(key, { status, body, at: Date.now() });
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

function cached(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > 24 * 60 * 60 * 1000) {
    cache.delete(key);
    return null;
  }
  return hit;
}

async function castNatal(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 4096) return { status: 400, body: { error: "The chart request was too large." } };
    chunks.push(chunk);
  }
  let incoming;
  try {
    incoming = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return { status: 400, body: { error: "The chart request was incomplete." } };
  }
  const accepted = BMFChart.acceptNatalBody(incoming);
  if (accepted.error) return { status: 400, body: { error: accepted.error } };
  if (ownCalculation()) {
    const chart = BMFChart.castOwn({
      year: accepted.request.year,
      month: accepted.request.month,
      day: accepted.request.day,
      hour: accepted.request.hour,
      minute: accepted.request.minute,
      place: {
        latitude: accepted.request.lat,
        longitude: accepted.request.lng,
        timezone: accepted.request.tz_str,
      },
    });
    if (chart.error) return { status: 500, body: { error: chart.error } };
    return { status: 200, body: chart };
  }
  const key = JSON.stringify(accepted.request);
  const hit = cached(key);
  if (hit) return hit;

  if (!KEY || KEY === "paste-your-key-here") {
    return { status: 503, body: { error: "The chart key is not on the server yet." } };
  }
  if (!allowUpstream()) {
    return { status: 429, body: { error: "The chart service is at its limit for now. Try again later." } };
  }
  const wait = 1100 - (Date.now() - lastUpstream);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastUpstream = Date.now();
  upstreamTimes.push(lastUpstream);

  let upstream;
  try {
    upstream = await fetch(`${UPSTREAM.replace(/\/$/, "")}/api/v1/natal/calculate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": KEY,
        "Idempotency-Key": require("node:crypto").randomUUID(),
      },
      body: key,
    });
  } catch {
    return { status: 502, body: { error: "The chart service could not be reached." } };
  }
  const text = await upstream.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    return { status: 502, body: { error: "The chart service returned an unexpected response." } };
  }
  if (!upstream.ok) {
    const status = upstream.status === 401 || upstream.status === 403 ? 503 : upstream.status;
    const message = status === 429
      ? "The chart service is at its limit for now. Try again later."
      : status === 503
        ? "The chart key is not on the server yet."
        : "The chart service rejected that birth time or place.";
    return { status: status >= 400 && status < 600 ? status : 502, body: { error: message } };
  }
  const result = { status: 200, body };
  remember(key, 200, body);
  return result;
}

function filePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relative = decoded.replace(/^\/+/, "");
  if (relative.split("/").some((part) => part.startsWith("."))) return null;
  const full = path.normalize(path.join(ROOT, relative));
  if (full !== ROOT && !full.startsWith(`${ROOT}${path.sep}`)) return null;
  return full;
}

function ownCalculation() {
  try {
    const text = fs.readFileSync(path.join(ROOT, "params.js"), "utf8");
    const match = text.match(/owncalculation\s*=\s*(\d+)/);
    return !match || Number(match[1]) === 1;
  } catch {
    return true;
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (url.pathname === "/api/natal") {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Use POST to cast a chart." });
      return;
    }
    if (!allowVisitor(clientAddress(request))) {
      sendJson(response, 429, { error: "The chart service is at its limit for now. Try again later." });
      return;
    }
    try {
      const result = await castNatal(request);
      sendJson(response, result.status, result.body);
    } catch (error) {
      console.error("natal request failed");
      sendJson(response, 500, { error: "The chart service had a problem. Try again in a moment." });
    }
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const full = filePath(requested);
  if (!full) {
    response.writeHead(404);
    response.end();
    return;
  }
  fs.stat(full, (error, stat) => {
    if (error || !stat.isFile()) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, { "Content-Type": TYPES[path.extname(full)] || "application/octet-stream" });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    fs.createReadStream(full).pipe(response);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`iAngels listening on http://127.0.0.1:${PORT}`);
  if (ownCalculation()) {
    console.log("owncalculation is 1. Charts are calculated here, with no API key.");
  } else if (!KEY || KEY === "paste-your-key-here") {
    console.log("Paste the FreeAstroAPI key between the quotes in server.cjs, then run: node server.cjs");
  }
});
