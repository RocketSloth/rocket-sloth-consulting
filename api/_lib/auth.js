// Minimal session auth for the CRM API.
// Sessions are random opaque tokens stored in crm_sessions and passed
// via the Authorization: Bearer header from the frontend.

const crypto = require("crypto");
const { sbSelect, sbInsert, sbDelete, sbUpdate } = require("./supabase");

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

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
  const header = req.headers.authorization || req.headers.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(header));
  return match ? match[1].trim() : null;
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
  // Re-check tenant is still active on every request.
  const tenants = await sbSelect("crm_tenants", { id: `eq.${user.tenant_id}`, select: "id,status" });
  const tenant = tenants && tenants[0];
  if (!tenant || tenant.status !== "active") {
    await sbDelete("crm_sessions", { token: `eq.${token}` });
    const err = new Error("Workspace is no longer active");
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
  extractToken
};
