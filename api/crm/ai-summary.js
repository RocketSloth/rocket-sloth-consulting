// AI deal summary endpoint.
//
// POST /api/crm/ai-summary?deal_id=<uuid>
// Auth: Bearer <session token>
//
// Pulls the deal + linked contact + recent activities for the caller's tenant,
// sends them to Claude, and returns { summary, nextActions, riskScore }.
//
// Requires ANTHROPIC_API_KEY in env. Falls back to a deterministic
// stub response if the key is missing so the demo always works.

const { json, handleError, methodGuard } = require("../_lib/http");
const { sbSelect } = require("../_lib/supabase");
const { requireSession } = require("../_lib/auth");

const MODEL = "claude-sonnet-4-6";

async function callClaude({ deal, contact, activities }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      summary: `Stub summary (set ANTHROPIC_API_KEY for live AI). Deal "${deal.title}" is in "${deal.stage}" with amount ${deal.amount}.`,
      nextActions: [
        "Connect ANTHROPIC_API_KEY in Vercel env vars to enable live Claude summaries.",
        "Once enabled, this card will analyze the deal + activity timeline and recommend the next best action."
      ],
      riskScore: 50,
      stub: true
    };
  }

  const contactLine = contact
    ? `${[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "(no name)"} <${contact.email || "no email"}> at ${contact.company || "(unknown company)"}`
    : "No contact linked";

  const activityLines = (activities || [])
    .slice(0, 20)
    .map((a) => `- [${a.type}] ${a.subject || "(no subject)"}: ${a.body || ""}`)
    .join("\n") || "No activities logged yet.";

  const prompt = `You are a senior sales operations analyst. Analyze the following CRM deal and produce a JSON response with three keys:
- "summary": a 2-3 sentence plain-English status of where this deal stands.
- "nextActions": an array of 3 concrete, specific next steps the deal owner should take this week.
- "riskScore": an integer 0-100 where 0 = safe/likely to close and 100 = imminent loss.

Respond with raw JSON only, no prose, no markdown fences.

Deal:
- Title: ${deal.title}
- Stage: ${deal.stage}
- Amount: ${deal.amount} ${deal.currency}
- Probability: ${deal.probability}%
- Expected close: ${deal.expected_close_date || "unset"}

Contact: ${contactLine}

Recent activities:
${activityLines}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Claude request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const text = (data.content && data.content[0] && data.content[0].text) || "{}";
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // If Claude wrapped it in fences anyway, strip and retry once.
    const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "");
    parsed = JSON.parse(cleaned);
  }

  return {
    summary: String(parsed.summary || ""),
    nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions.map(String) : [],
    riskScore: Number(parsed.riskScore) || 0
  };
}

module.exports = async function handler(req, res) {
  if (!methodGuard(req, res, ["POST"])) return;
  try {
    const { tenantId } = await requireSession(req);
    const dealId = (req.query && req.query.deal_id) || null;
    if (!dealId) return json(res, 400, { error: "deal_id is required" });

    const deals = await sbSelect("crm_deals", {
      tenant_id: `eq.${tenantId}`,
      id: `eq.${dealId}`,
      select: "*"
    });
    const deal = deals && deals[0];
    if (!deal) return json(res, 404, { error: "Deal not found" });

    let contact = null;
    if (deal.contact_id) {
      const contacts = await sbSelect("crm_contacts", {
        tenant_id: `eq.${tenantId}`,
        id: `eq.${deal.contact_id}`,
        select: "*"
      });
      contact = contacts && contacts[0];
    }

    const activities = await sbSelect("crm_activities", {
      tenant_id: `eq.${tenantId}`,
      deal_id: `eq.${dealId}`,
      select: "*",
      order: "created_at.desc",
      limit: "20"
    });

    const result = await callClaude({ deal, contact, activities });
    return json(res, 200, result);
  } catch (err) {
    return handleError(res, err);
  }
};
