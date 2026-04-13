// POST /api/crm/demo-session
//
// Creates a temporary read-only session for the public "demo" tenant.
// No credentials required — anyone can call this.
// Only works for the tenant with slug "demo". Returns the same session
// payload as /api/crm/login so the frontend handles it identically.

const { json, handleError, methodGuard } = require("../_lib/http");
const { sbSelect } = require("../_lib/supabase");
const { createSession } = require("../_lib/auth");

const DEMO_SLUG = "demo";

module.exports = async function handler(req, res) {
  if (!methodGuard(req, res, ["POST"])) return;
  try {
    const tenants = await sbSelect("crm_tenants", {
      slug: `eq.${DEMO_SLUG}`,
      select: "id,slug,name,plan,config,status"
    });
    const tenant = tenants && tenants[0];
    if (!tenant || tenant.status !== "active") {
      return json(res, 503, { error: "Demo is not available right now. Please check back later." });
    }

    // Pick the first user in the demo tenant (the seeded demo owner).
    const users = await sbSelect("crm_users", {
      tenant_id: `eq.${tenant.id}`,
      order: "created_at.asc",
      limit: "1",
      select: "*"
    });
    const user = users && users[0];
    if (!user) {
      return json(res, 503, { error: "Demo is not set up yet. Please run scripts/seed-demo.js first." });
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
        fullName: user.full_name || "Demo User",
        role: user.role
      }
    });
  } catch (err) {
    return handleError(res, err);
  }
};
