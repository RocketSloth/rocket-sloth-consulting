const { parseBody, json, handleError, methodGuard } = require("../_lib/http");
const { sbSelect, sbInsert, sbUpdate, sbDelete } = require("../_lib/supabase");
const { requireSession } = require("../_lib/auth");

function sanitize(body, tenantId) {
  const out = {};
  if ("first_name" in body) out.first_name = String(body.first_name || "").slice(0, 120);
  if ("last_name" in body) out.last_name = String(body.last_name || "").slice(0, 120);
  if ("email" in body) out.email = String(body.email || "").toLowerCase().slice(0, 200);
  if ("phone" in body) out.phone = String(body.phone || "").slice(0, 60);
  if ("company" in body) out.company = String(body.company || "").slice(0, 200);
  if ("title" in body) out.title = String(body.title || "").slice(0, 200);
  if ("status" in body) out.status = String(body.status || "lead").slice(0, 40);
  if ("owner_id" in body) out.owner_id = body.owner_id || null;
  if ("tags" in body && Array.isArray(body.tags)) out.tags = body.tags.map(String).slice(0, 40);
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
        const rows = await sbSelect("crm_contacts", {
          tenant_id: `eq.${tenantId}`,
          id: `eq.${id}`,
          select: "*"
        });
        if (!rows[0]) return json(res, 404, { error: "Not found" });
        return json(res, 200, rows[0]);
      }
      const search = (req.query && req.query.q) || "";
      const query = {
        tenant_id: `eq.${tenantId}`,
        select: "*",
        order: "updated_at.desc",
        limit: "200"
      };
      if (search) {
        query.or = `(first_name.ilike.*${search}*,last_name.ilike.*${search}*,email.ilike.*${search}*,company.ilike.*${search}*)`;
      }
      const rows = await sbSelect("crm_contacts", query);
      return json(res, 200, { contacts: rows });
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      const record = sanitize(body, tenantId);
      const inserted = await sbInsert("crm_contacts", record);
      return json(res, 201, inserted);
    }

    if (req.method === "PATCH") {
      if (!id) return json(res, 400, { error: "id is required" });
      const body = parseBody(req);
      const patch = sanitize(body, null);
      patch.updated_at = new Date().toISOString();
      const updated = await sbUpdate(
        "crm_contacts",
        { tenant_id: `eq.${tenantId}`, id: `eq.${id}` },
        patch
      );
      return json(res, 200, updated[0] || null);
    }

    if (req.method === "DELETE") {
      if (!id) return json(res, 400, { error: "id is required" });
      await sbDelete("crm_contacts", { tenant_id: `eq.${tenantId}`, id: `eq.${id}` });
      return json(res, 200, { ok: true });
    }
  } catch (err) {
    return handleError(res, err);
  }
};
