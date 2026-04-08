const crypto = require("crypto");
const { parseBody, json, handleError, methodGuard } = require("../_lib/http");
const { sbInsert, sbSelect } = require("../_lib/supabase");
const { createSession, hashPassword, setSessionCookie } = require("../_lib/auth");

const PUBLIC_DEMO_TENANT = "demo";
const DEMO_VIEWER_EMAIL = "demo-viewer@rocketsloth.space";
const DEMO_VIEWER_NAME = "Demo Visitor";
const DEMO_VIEWER_ROLE = "demo_viewer";

async function getTenantBySlug(slug) {
  const tenants = await sbSelect("crm_tenants", {
    slug: `eq.${slug}`,
    select: "id,slug,name,plan,status,config"
  });
  return tenants && tenants[0];
}

async function getDemoViewerUser(tenantId) {
  const users = await sbSelect("crm_users", {
    tenant_id: `eq.${tenantId}`,
    email: `eq.${DEMO_VIEWER_EMAIL}`,
    select: "*"
  });
  return users && users[0];
}

async function ensureDemoViewerUser(tenantId) {
  const existingUser = await getDemoViewerUser(tenantId);
  if (existingUser) return existingUser;

  try {
    return await sbInsert("crm_users", {
      tenant_id: tenantId,
      email: DEMO_VIEWER_EMAIL,
      full_name: DEMO_VIEWER_NAME,
      role: DEMO_VIEWER_ROLE,
      password_hash: hashPassword(crypto.randomBytes(32).toString("hex"))
    });
  } catch (err) {
    if (err && err.status === 409) {
      const retryUser = await getDemoViewerUser(tenantId);
      if (retryUser) return retryUser;
    }
    throw err;
  }
}

module.exports = async function handler(req, res) {
  if (!methodGuard(req, res, ["POST"])) return;
  try {
    const body = parseBody(req);
    const tenantSlug = String(body.tenant || PUBLIC_DEMO_TENANT).trim().toLowerCase();

    if (tenantSlug !== PUBLIC_DEMO_TENANT) {
      return json(res, 403, { error: "Public demo access is only available for the demo tenant" });
    }

    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant || tenant.status !== "active") {
      return json(res, 404, { error: "Demo tenant is unavailable" });
    }

    const user = await ensureDemoViewerUser(tenant.id);
    const { token, expiresAt } = await createSession(user);

    setSessionCookie(res, token, expiresAt);
    return json(res, 200, {
      expiresAt,
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
