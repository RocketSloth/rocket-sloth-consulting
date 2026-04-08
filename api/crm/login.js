const { parseBody, json, handleError, methodGuard } = require("../_lib/http");
const { sbSelect, sbInsert, sbUpdate } = require("../_lib/supabase");
const { verifyPassword, createSession, setSessionCookie, hashPassword } = require("../_lib/auth");

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
    let tenant = tenants && tenants[0];
    if (!tenant && tenantSlug === "demo") {
      tenant = await sbInsert("crm_tenants", {
        slug: "demo",
        name: "RocketSloth Demo",
        plan: "demo",
        status: "active",
        config: {
          branding: {
            productName: "RocketSloth Demo CRM",
            accentColor: "#f58f4c",
            logoUrl: ""
          },
          pipeline: {
            stages: [
              { id: "new", label: "New", probability: 10 },
              { id: "qualified", label: "Qualified", probability: 25 },
              { id: "demo", label: "Site Visit", probability: 40 },
              { id: "proposal", label: "Proposal", probability: 60 },
              { id: "negotiation", label: "Negotiation", probability: 80 },
              { id: "won", label: "Won", probability: 100 },
              { id: "lost", label: "Lost", probability: 0 }
            ]
          },
          contactStatuses: ["lead", "prospect", "customer", "archived"]
        }
      });
    }
    if (tenant && tenantSlug === "demo" && tenant.status !== "active") {
      const updatedTenants = await sbUpdate(
        "crm_tenants",
        { id: `eq.${tenant.id}` },
        { status: "active" }
      );
      tenant = updatedTenants && updatedTenants[0] ? updatedTenants[0] : tenant;
    }
    if (!tenant || tenant.status !== "active") {
      return json(res, 401, { error: "Invalid credentials" });
    }

    let users = await sbSelect("crm_users", {
      tenant_id: `eq.${tenant.id}`,
      email: `eq.${email}`,
      select: "*"
    });
    let user = users && users[0];

    const demoEmail = String(process.env.DEMO_LOGIN_EMAIL || "demo@rocketsloth.space").trim().toLowerCase();
    const demoPassword = String(process.env.DEMO_LOGIN_PASSWORD || "demo-rocketsloth-2026");
    const isDemoCredentialPair = tenantSlug === "demo" && email === demoEmail && password === demoPassword;

    if (isDemoCredentialPair) {
      if (!user) {
        user = await sbInsert("crm_users", {
          tenant_id: tenant.id,
          email: demoEmail,
          full_name: "Demo User",
          role: "owner",
          password_hash: hashPassword(demoPassword)
        });
      } else if (!verifyPassword(demoPassword, user.password_hash)) {
        const updated = await sbUpdate(
          "crm_users",
          { tenant_id: `eq.${tenant.id}`, id: `eq.${user.id}` },
          { password_hash: hashPassword(demoPassword) }
        );
        user = updated && updated[0] ? updated[0] : user;
      }
    }

    if (!user || !verifyPassword(password, user.password_hash)) {
      return json(res, 401, { error: "Invalid credentials" });
    }

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
