function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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

async function notifyLead(lead) {
  const webhookUrl = process.env.SIGNUP_WEBHOOK_URL;
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;
  const leadsTo = process.env.LEADS_TO_EMAIL;

  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead)
    });

    if (!response.ok) {
      throw new Error("Webhook delivery failed.");
    }

    return;
  }

  if (resendApiKey && resendFrom && leadsTo) {
    const html = [
      "<h1>New Future AI News signup</h1>",
      `<p><strong>Name:</strong> ${escapeHtml(lead.name)}</p>`,
      `<p><strong>Email:</strong> ${escapeHtml(lead.email)}</p>`,
      `<p><strong>Company:</strong> ${escapeHtml(lead.company)}</p>`,
      `<p><strong>Interest:</strong> ${escapeHtml(lead.interest || "Not provided")}</p>`,
      `<p><strong>Submitted:</strong> ${escapeHtml(lead.submittedAt)}</p>`
    ].join("");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [leadsTo],
        reply_to: lead.email,
        subject: `New Future AI News signup: ${lead.email}`,
        html,
        text: [
          "New Future AI News signup",
          `Name: ${lead.name}`,
          `Email: ${lead.email}`,
          `Company: ${lead.company}`,
          `Interest: ${lead.interest || "Not provided"}`,
          `Submitted: ${lead.submittedAt}`
        ].join("\n")
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Resend delivery failed: ${text}`);
    }

    return;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendError(req, res, 405, "Method not allowed.");
  }

  const body = parseBody(req);
  const lead = {
    name: normalize(body.name, 120) || "Future AI News Reader",
    email: normalize(body.email, 200).toLowerCase(),
    company: normalize(body.company, 200) || "Future AI News",
    interest: normalize(body.interest, 2000) || "Future AI News signup",
    submittedAt: new Date().toISOString()
  };

  if (!lead.email) {
    return sendError(req, res, 400, "Email is required.");
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(lead.email)) {
    return sendError(req, res, 400, "Please enter a valid email address.");
  }

  try {
    await storeLeadInSupabase(lead);
    await notifyLead(lead);
    if (wantsJson(req)) {
      return res.status(200).json({ ok: true });
    }
    return res.redirect(303, "/thank-you");
  } catch (error) {
    console.error("Signup delivery failed", error);
    const message = error instanceof Error && error.message
      ? error.message
      : "Signup could not be processed right now.";
    return sendError(req, res, 500, message);
  }
};
