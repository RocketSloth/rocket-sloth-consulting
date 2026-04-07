// Admin-only endpoint: provisions a new tenant CRM with an owner user.
//
// Protected by CRM_ADMIN_TOKEN env var. Use this to stand up a new
// customer CRM with one curl call:
//
//   curl -X POST https://your-domain/api/crm/provision \
//     -H "Authorization: Bearer $CRM_ADMIN_TOKEN" \
//     -H "Content-Type: application/json" \
//     -d '{"slug":"acme","name":"Acme Inc","ownerEmail":"owner@acme.com","ownerPassword":"s3cret","config":{...}}'

const { parseBody, json, handleError, methodGuard } = require("../_lib/http");
const { sbSelect, sbInsert } = require("../_lib/supabase");
const { hashPassword, extractToken } = require("../_lib/auth");

const DEFAULT_CONFIG = {
  branding: {
    productName: "CRM",
    accentColor: "#4f46e5",
    logoUrl: ""
  },
  pipeline: {
    stages: [
      { id: "new", label: "New", probability: 10 },
      { id: "qualified", label: "Qualified", probability: 25 },
      { id: "proposal", label: "Proposal", probability: 50 },
      { id: "negotiation", label: "Negotiation", probability: 75 },
      { id: "won", label: "Won", probability: 100 },
      { id: "lost", label: "Lost", probability: 0 }
    ]
  },
  contactStatuses: ["lead", "customer", "partner", "archived"],
  customFields: {
    contact: [],
    deal: []
  },
  modules: {
    contacts: true,
    deals: true,
    activities: true
  }
};

module.exports = async function handler(req, res) {
  if (!methodGuard(req, res, ["POST"])) return;
  try {
    const adminToken = process.env.CRM_ADMIN_TOKEN;
    if (!adminToken) return json(res, 500, { error: "CRM_ADMIN_TOKEN not configured" });
    if (extractToken(req) !== adminToken) return json(res, 401, { error: "Unauthorized" });

    const body = parseBody(req);
    const slug = String(body.slug || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const ownerEmail = String(body.ownerEmail || "").trim().toLowerCase();
    const ownerPassword = String(body.ownerPassword || "");
    const ownerName = String(body.ownerName || "Owner").trim();
    const plan = String(body.plan || "starter");
    const config = body.config && typeof body.config === "object" ? { ...DEFAULT_CONFIG, ...body.config } : DEFAULT_CONFIG;

    if (!slug || !name || !ownerEmail || !ownerPassword) {
      return json(res, 400, { error: "slug, name, ownerEmail, ownerPassword are required" });
    }
    if (ownerPassword.length < 8) {
      return json(res, 400, { error: "ownerPassword must be at least 8 characters" });
    }

    const existing = await sbSelect("crm_tenants", { slug: `eq.${slug}`, select: "id" });
    if (existing && existing[0]) {
      return json(res, 409, { error: "Tenant slug already exists" });
    }

    const tenant = await sbInsert("crm_tenants", {
      slug,
      name,
      plan,
      status: "active",
      config
    });

    const user = await sbInsert("crm_users", {
      tenant_id: tenant.id,
      email: ownerEmail,
      full_name: ownerName,
      role: "owner",
      password_hash: hashPassword(ownerPassword)
    });

    return json(res, 201, {
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name, plan: tenant.plan },
      owner: { id: user.id, email: user.email, role: user.role },
      loginUrl: `/crm/login?tenant=${encodeURIComponent(slug)}`
    });
  } catch (err) {
    return handleError(res, err);
  }
};
