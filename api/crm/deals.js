const { parseBody, json, handleError, methodGuard } = require("../_lib/http");
const { sbSelect, sbInsert, sbUpdate, sbDelete } = require("../_lib/supabase");
const { requireSession } = require("../_lib/auth");

function sanitize(body, tenantId) {
  const out = {};
  if ("title" in body) out.title = String(body.title || "").slice(0, 240);
  if ("contact_id" in body) out.contact_id = body.contact_id || null;
  if ("owner_id" in body) out.owner_id = body.owner_id || null;
  if ("stage" in body) out.stage = String(body.stage || "new").slice(0, 60);
  if ("amount" in body) out.amount = Number(body.amount) || 0;
  if ("currency" in body) out.currency = String(body.currency || "USD").slice(0, 8);
  if ("probability" in body) out.probability = Math.max(0, Math.min(100, parseInt(body.probability, 10) || 0));
  if ("expected_close_date" in body) out.expected_close_date = body.expected_close_date || null;
  if ("custom_fields" in body && typeof body.custom_fields === "object") {
    out.custom_fields = body.custom_fields;
  }
  if (tenantId) out.tenant_id = tenantId;
  return out;
}

module.exports = async function handler(req, res) {
  if (!methodGuard(req, res, ["GET", "POST", "PATCH", "DELETE"])) return;
  try {
    const { tenantId } = await requireSession(req);
    const id = (req.query && req.query.id) || null;

    if (req.method === "GET") {
      if (id) {
        const rows = await sbSelect("crm_deals", {
          tenant_id: `eq.${tenantId}`,
          id: `eq.${id}`,
          select: "*"
        });
        if (!rows[0]) return json(res, 404, { error: "Not found" });
        return json(res, 200, rows[0]);
      }
      const rows = await sbSelect("crm_deals", {
        tenant_id: `eq.${tenantId}`,
        select: "*",
        order: "updated_at.desc",
        limit: "500"
      });
      return json(res, 200, { deals: rows });
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      if (!body.title) return json(res, 400, { error: "title is required" });
      const record = sanitize(body, tenantId);
      const inserted = await sbInsert("crm_deals", record);
      return json(res, 201, inserted);
    }

    if (req.method === "PATCH") {
      if (!id) return json(res, 400, { error: "id is required" });
      const body = parseBody(req);
      const patch = sanitize(body, null);
      patch.updated_at = new Date().toISOString();
      const updated = await sbUpdate(
        "crm_deals",
        { tenant_id: `eq.${tenantId}`, id: `eq.${id}` },
        patch
      );
      return json(res, 200, updated[0] || null);
    }

    if (req.method === "DELETE") {
      if (!id) return json(res, 400, { error: "id is required" });
      await sbDelete("crm_deals", { tenant_id: `eq.${tenantId}`, id: `eq.${id}` });
      return json(res, 200, { ok: true });
    }
  } catch (err) {
    return handleError(res, err);
  }
};
