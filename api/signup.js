function normalize(value, max = 1000) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function parseBody(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === "object") {
    return req.body;
  }

  const body = String(req.body);
  const contentType = req.headers["content-type"] || "";

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  return Object.fromEntries(new URLSearchParams(body));
}

function wantsJson(req) {
  const accept = req.headers.accept || "";
  return accept.includes("application/json");
}

function sendError(req, res, statusCode, message) {
  if (wantsJson(req)) {
    return res.status(statusCode).json({ error: message });
  }

  return res.redirect(303, "/?signup=error");
}

async function storeLeadInSupabase(lead) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseTable = process.env.SUPABASE_SIGNUPS_TABLE || "signups";

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const missing = [
      !supabaseUrl ? "SUPABASE_URL" : "",
      !supabaseServiceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : ""
    ].filter(Boolean);
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const trimmedUrl = supabaseUrl.replace(/\/$/, "");
  const record = {
    name: lead.name,
    email: lead.email,
    company: lead.company,
    interest: lead.interest,
    submitted_at: lead.submittedAt
  };
  const response = await fetch(`${trimmedUrl}/rest/v1/${encodeURIComponent(supabaseTable)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": supabaseServiceRoleKey,
      "Authorization": `Bearer ${supabaseServiceRoleKey}`,
      "Prefer": "return=minimal"
    },
    body: JSON.stringify([record])
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase insert failed: ${text}`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendError(req, res, 405, "Method not allowed.");
  }

  const body = parseBody(req);
  const lead = {
    name: normalize(body.name, 120) || "Discovery Call Lead",
    email: normalize(body.email, 200).toLowerCase(),
    company: normalize(body.company, 200) || "Discovery call lead",
    interest: normalize(body.interest, 2000) || "Workflow assessment request",
    submittedAt: new Date().toISOString()
  };

  try {
    await storeLeadInSupabase(lead);
    if (wantsJson(req)) {
      return res.status(200).json({ ok: true });
    }
    return res.redirect(303, "/thank-you");
  } catch (error) {
    console.error("Signup delivery failed", error);
    return sendError(req, res, 500, "Signup could not be processed right now.");
  }
};
