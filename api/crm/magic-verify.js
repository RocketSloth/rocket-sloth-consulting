// POST /api/crm/magic-verify
//
// Body: { token: "<magic link token>" }
//
// Validates the one-time token, marks it used, creates a session, and
// returns the same payload as /api/crm/login so the frontend can store
// and redirect identically.

const { parseBody, json, handleError, methodGuard } = require("../_lib/http");
const { sbSelect, sbUpdate } = require("../_lib/supabase");
const { createSession } = require("../_lib/auth");

module.exports = async function handler(req, res) {
  if (!methodGuard(req, res, ["POST"])) return;
  try {
    const body = parseBody(req);
    const token = String(body.token || "").trim();
    if (!token) {
      return json(res, 400, { error: "token is required" });
    }

    const rows = await sbSelect("crm_magic_links", {
      token: `eq.${token}`,
      select: "*"
    });
    const link = rows && rows[0];
    if (!link) {
      return json(res, 401, { error: "Invalid or expired link" });
    }

    if (link.used_at) {
      return json(res, 401, { error: "This link has already been used. Please request a new one." });
    }

    if (new Date(link.expires_at).getTime() < Date.now()) {
      return json(res, 401, { error: "This link has expired. Please request a new one." });
    }

    // Mark used immediately to prevent replay.
    await sbUpdate(
      "crm_magic_links",
      { token: `eq.${token}` },
      { used_at: new Date().toISOString() }
    );

    const users = await sbSelect("crm_users", {
      id: `eq.${link.user_id}`,
      select: "*"
    });
    const user = users && users[0];
    if (!user) {
      return json(res, 401, { error: "User not found" });
    }

    const tenants = await sbSelect("crm_tenants", {
      id: `eq.${link.tenant_id}`,
      select: "id,slug,name,plan,config,status"
    });
    const tenant = tenants && tenants[0];
    if (!tenant || tenant.status !== "active") {
      return json(res, 401, { error: "Workspace is no longer active" });
    }

    const session = await createSession(user);
    return json(res, 200, {
      token: session.token,
      expiresAt: session.expiresAt,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
        config: tenant.config || {}
      },
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    return handleError(res, err);
  }
};
