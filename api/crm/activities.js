const { parseBody, json, handleError, methodGuard } = require("../_lib/http");
const { sbSelect, sbInsert, sbUpdate, sbDelete } = require("../_lib/supabase");
const { requireSession } = require("../_lib/auth");

function sanitize(body, tenantId, userId) {
  const out = {};
  if ("type" in body) out.type = String(body.type || "note").slice(0, 40);
  if ("subject" in body) out.subject = String(body.subject || "").slice(0, 240);
  if ("body" in body) out.body = String(body.body || "").slice(0, 10000);
  if ("contact_id" in body) out.contact_id = body.contact_id || null;
  if ("deal_id" in body) out.deal_id = body.deal_id || null;
  if ("due_at" in body) out.due_at = body.due_at || null;
  if ("completed_at" in body) out.completed_at = body.completed_at || null;
  if (tenantId) out.tenant_id = tenantId;
  if (userId) out.user_id = userId;
  return out;
}

module.exports = async function handler(req, res) {
  if (!methodGuard(req, res, ["GET", "POST", "PATCH", "DELETE"])) return;
  try {
    const { tenantId, user } = await requireSession(req);
    const id = (req.query && req.query.id) || null;
    const contactId = (req.query && req.query.contact_id) || null;
    const dealId = (req.query && req.query.deal_id) || null;

    if (req.method === "GET") {
      const query = {
        tenant_id: `eq.${tenantId}`,
        select: "*",
        order: "created_at.desc",
        limit: "200"
      };
      if (contactId) query.contact_id = `eq.${contactId}`;
      if (dealId) query.deal_id = `eq.${dealId}`;
      const rows = await sbSelect("crm_activities", query);
      return json(res, 200, { activities: rows });
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      const record = sanitize(body, tenantId, user.id);
      const inserted = await sbInsert("crm_activities", record);
      return json(res, 201, inserted);
    }

    if (req.method === "PATCH") {
      if (!id) return json(res, 400, { error: "id is required" });
      const body = parseBody(req);
      const patch = sanitize(body, null, null);
      const updated = await sbUpdate(
        "crm_activities",
        { tenant_id: `eq.${tenantId}`, id: `eq.${id}` },
        patch
      );
      return json(res, 200, updated[0] || null);
    }

    if (req.method === "DELETE") {
      if (!id) return json(res, 400, { error: "id is required" });
      await sbDelete("crm_activities", { tenant_id: `eq.${tenantId}`, id: `eq.${id}` });
      return json(res, 200, { ok: true });
    }
  } catch (err) {
    return handleError(res, err);
  }
};
