const { parseBody, json, handleError, methodGuard } = require("../_lib/http");
const { sbSelect } = require("../_lib/supabase");
const { verifyPassword, createSession } = require("../_lib/auth");

module.exports = async function handler(req, res) {
  if (!methodGuard(req, res, ["POST"])) return;
  try {
    const body = parseBody(req);
    const tenantSlug = String(body.tenant || "").trim().toLowerCase();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!tenantSlug || !email || !password) {
      return json(res, 400, { error: "tenant, email and password are required" });
    }

    const tenants = await sbSelect("crm_tenants", {
      slug: `eq.${tenantSlug}`,
      select: "id,slug,name,plan,status,config"
    });
    const tenant = tenants && tenants[0];
    if (!tenant || tenant.status !== "active") {
      return json(res, 401, { error: "Invalid credentials" });
    }

    const users = await sbSelect("crm_users", {
      tenant_id: `eq.${tenant.id}`,
      email: `eq.${email}`,
      select: "*"
    });
    const user = users && users[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return json(res, 401, { error: "Invalid credentials" });
    }

    const { token, expiresAt } = await createSession(user);
    return json(res, 200, {
      token,
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
