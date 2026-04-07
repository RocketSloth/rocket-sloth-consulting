// Minimal session auth for the CRM API.
// Sessions are random opaque tokens stored in crm_sessions and sent
// via a secure HttpOnly cookie (with optional Bearer support for migration).

const crypto = require("crypto");
const { sbSelect, sbInsert, sbDelete, sbUpdate } = require("./supabase");

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const SESSION_COOKIE_NAME = "rs_crm_session";

function hashPassword(password, salt) {
  const useSalt = salt || crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(String(password), useSalt, 64).toString("hex");
  return `${useSalt}:${derived}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, expected] = stored.split(":");
  const derived = crypto.scryptSync(String(password), salt, 64).toString("hex");
  const a = Buffer.from(derived, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function newToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function createSession(user) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await sbInsert("crm_sessions", {
    token,
    tenant_id: user.tenant_id,
    user_id: user.id,
    expires_at: expiresAt
  });
  await sbUpdate(
    "crm_users",
    { id: `eq.${user.id}` },
    { last_login_at: new Date().toISOString() }
  );
  return { token, expiresAt };
}

function extractToken(req) {
  const cookieToken = extractTokenFromCookie(req);
  if (cookieToken) return cookieToken;

  const header = req.headers.authorization || req.headers.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(header));
  return match ? match[1].trim() : null;
}

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  if (!raw) return {};
  return String(raw)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const idx = part.indexOf("=");
      if (idx < 0) return acc;
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      try {
        acc[key] = decodeURIComponent(value);
      } catch {
        acc[key] = value;
      }
      return acc;
    }, {});
}

function extractTokenFromCookie(req) {
  const cookies = parseCookies(req);
  return cookies[SESSION_COOKIE_NAME] || null;
}

function serializeSessionCookie(token, expiresAt) {
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax"
  ];
  if (expiresAt) attrs.push(`Expires=${new Date(expiresAt).toUTCString()}`);
  return attrs.join("; ");
}

function setSessionCookie(res, token, expiresAt) {
  res.setHeader("Set-Cookie", serializeSessionCookie(token, expiresAt));
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0"
  ].join("; "));
}

async function requireSession(req) {
  const token = extractToken(req);
  if (!token) {
    const err = new Error("Missing session token");
    err.status = 401;
    throw err;
  }
  const rows = await sbSelect("crm_sessions", { token: `eq.${token}`, select: "*" });
  const session = rows && rows[0];
  if (!session) {
    const err = new Error("Invalid session");
    err.status = 401;
    throw err;
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await sbDelete("crm_sessions", { token: `eq.${token}` });
    const err = new Error("Session expired");
    err.status = 401;
    throw err;
  }
  const users = await sbSelect("crm_users", { id: `eq.${session.user_id}`, select: "*" });
  const user = users && users[0];
  if (!user) {
    const err = new Error("User not found");
    err.status = 401;
    throw err;
  }
  return { token, user, tenantId: user.tenant_id };
}

async function destroySession(token) {
  if (!token) return;
  await sbDelete("crm_sessions", { token: `eq.${token}` });
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  requireSession,
  destroySession,
  extractToken,
  setSessionCookie,
  clearSessionCookie,
  SESSION_COOKIE_NAME
};
