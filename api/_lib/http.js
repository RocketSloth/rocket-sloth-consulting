// Shared HTTP helpers for CRM API handlers.

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  const raw = String(req.body);
  const ct = req.headers["content-type"] || "";
  if (ct.includes("application/json")) {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return Object.fromEntries(new URLSearchParams(raw));
}

function json(res, status, data) {
  res.status(status);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify(data));
}

function handleError(res, err) {
  const status = err && err.status ? err.status : 500;
  const message = err && err.message ? err.message : "Internal error";
  if (status >= 500) console.error("CRM API error", err);
  return json(res, status, { error: message });
}

function methodGuard(req, res, allowed) {
  if (!allowed.includes(req.method)) {
    res.setHeader("Allow", allowed.join(", "));
    json(res, 405, { error: "Method not allowed" });
    return false;
  }
  return true;
}

module.exports = { parseBody, json, handleError, methodGuard };
