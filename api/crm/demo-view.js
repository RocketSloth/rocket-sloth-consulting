const crypto = require("crypto");
const { parseBody, json, handleError, methodGuard } = require("../_lib/http");
const { sbSelect, sbInsert, sbUpdate } = require("../_lib/supabase");
const { createSession, setSessionCookie, hashPassword } = require("../_lib/auth");

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

module.exports = async function handler(req, res) {
  if (!methodGuard(req, res, ["POST"])) return;
  try {
    const body = parseBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      return json(res, 400, { error: "A valid email is required" });
    }

    const demoTenantSlug = String(process.env.DEMO_LOGIN_TENANT || "demo").trim().toLowerCase();

    const tenants = await sbSelect("crm_tenants", {
      slug: `eq.${demoTenantSlug}`,
      select: "id,slug,name,plan,status,config"
    });
    let tenant = tenants && tenants[0];
    if (!tenant) {
      tenant = await sbInsert("crm_tenants", {
        slug: demoTenantSlug,
        name: "RocketSloth Demo",
        plan: "demo",
        status: "active",
        config: {
          branding: {
            productName: "RocketSloth Demo CRM",
            accentColor: "#f58f4c",
            logoUrl: ""
          }
        }
      });
    } else if (tenant.status !== "active") {
      const updated = await sbUpdate("crm_tenants", { id: `eq.${tenant.id}` }, { status: "active" });
      tenant = updated && updated[0] ? updated[0] : tenant;
    }

    const users = await sbSelect("crm_users", {
      tenant_id: `eq.${tenant.id}`,
      email: `eq.${email}`,
      select: "*"
    });
    let user = users && users[0];
    if (!user) {
      const fullName = email.split("@")[0].replace(/[._-]+/g, " ").slice(0, 80);
      user = await sbInsert("crm_users", {
        tenant_id: tenant.id,
        email,
        full_name: fullName || "Demo Viewer",
        role: "member",
        password_hash: hashPassword(crypto.randomBytes(24).toString("hex"))
      });
    }

    const { token, expiresAt } = await createSession(user);
    setSessionCookie(res, token, expiresAt);
    return json(res, 200, { ok: true, redirectTo: "/crm" });
  } catch (err) {
    return handleError(res, err);
  }
};
