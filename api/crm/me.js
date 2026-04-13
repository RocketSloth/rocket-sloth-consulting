const { json, handleError, methodGuard } = require("../_lib/http");
const { sbSelect } = require("../_lib/supabase");
const { requireSession, destroySession, clearSessionCookie } = require("../_lib/auth");

module.exports = async function handler(req, res) {
  if (!methodGuard(req, res, ["GET", "DELETE"])) return;
  try {
    const { token, user, tenantId } = await requireSession(req);

    if (req.method === "DELETE") {
      await destroySession(token);
      clearSessionCookie(res);
      return json(res, 200, { ok: true });
    }

    const tenants = await sbSelect("crm_tenants", {
      id: `eq.${tenantId}`,
      select: "id,slug,name,plan,config"
    });
    const tenant = tenants && tenants[0];
    return json(res, 200, {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      },
      tenant: tenant
        ? {
            id: tenant.id,
            slug: tenant.slug,
            name: tenant.name,
            plan: tenant.plan,
            config: tenant.config || {}
          }
        : null
    });
  } catch (err) {
    return handleError(res, err);
  }
};
