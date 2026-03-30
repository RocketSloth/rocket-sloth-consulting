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

async function deliverLead(lead) {
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
      "<h1>New Rocket Sloth lead</h1>",
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
        subject: `New Rocket Sloth early-access signup: ${lead.company}`,
        html,
        text: [
          "New Rocket Sloth lead",
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

  throw new Error("No signup delivery service is configured.");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendError(req, res, 405, "Method not allowed.");
  }

  const body = parseBody(req);
  const lead = {
    name: normalize(body.name, 120),
    email: normalize(body.email, 200).toLowerCase(),
    company: normalize(body.company, 200),
    interest: normalize(body.interest, 2000),
    submittedAt: new Date().toISOString()
  };

  if (!lead.name || !lead.email || !lead.company) {
    return sendError(req, res, 400, "Name, email, and company are required.");
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(lead.email)) {
    return sendError(req, res, 400, "Please enter a valid email address.");
  }

  try {
    await deliverLead(lead);
    if (wantsJson(req)) {
      return res.status(200).json({ ok: true });
    }
    return res.redirect(303, "/thank-you");
  } catch (error) {
    console.error("Signup delivery failed", error);
    return sendError(req, res, 500, "Signup is not configured yet. Add the required Vercel environment variables.");
  }
};
