// POST /api/crm/magic-link
//
// Body: { tenant: "acme", email: "user@acme.com" }
//
// Looks up the tenant + user, generates a one-time magic link token
// (30 min expiry), stores it in crm_magic_links, and emails it via Resend.
//
// If Resend isn't configured, returns the link in the response so
// dev/testing still works (never do this in prod — gate on RESEND_API_KEY).

const crypto = require("crypto");
const { parseBody, json, handleError, methodGuard } = require("../_lib/http");
const { sbSelect, sbInsert } = require("../_lib/supabase");

const MAGIC_TTL_MS = 1000 * 60 * 30; // 30 minutes

function newToken() {
  return crypto.randomBytes(32).toString("hex");
}

function baseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

async function sendMagicEmail({ to, link, tenantName }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return null;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Sign in to ${tenantName}`,
      html: [
        `<h2>Sign in to ${tenantName}</h2>`,
        `<p>Click the link below to sign in. It expires in 30 minutes.</p>`,
        `<p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Sign in</a></p>`,
        `<p style="color:#666;font-size:13px;">Or copy this URL: ${link}</p>`,
        `<p style="color:#999;font-size:12px;">If you didn't request this, ignore this email.</p>`
      ].join(""),
      text: `Sign in to ${tenantName}\n\n${link}\n\nThis link expires in 30 minutes. If you didn't request this, ignore this email.`
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to send magic link email: ${text}`);
  }

  return true;
}

module.exports = async function handler(req, res) {
  if (!methodGuard(req, res, ["POST"])) return;
  try {
    const body = parseBody(req);
    const tenantSlug = String(body.tenant || "").trim().toLowerCase();
    const email = String(body.email || "").trim().toLowerCase();

    if (!tenantSlug || !email) {
      return json(res, 400, { error: "tenant and email are required" });
    }

    // Always respond 200 to prevent email enumeration, even if user not found.
    const okResponse = { ok: true, message: "If that email exists, a sign-in link has been sent." };

    const tenants = await sbSelect("crm_tenants", {
      slug: `eq.${tenantSlug}`,
      select: "id,slug,name,status"
    });
    const tenant = tenants && tenants[0];
    if (!tenant || tenant.status !== "active") {
      return json(res, 200, okResponse);
    }

    const users = await sbSelect("crm_users", {
      tenant_id: `eq.${tenant.id}`,
      email: `eq.${email}`,
      select: "id,tenant_id,email"
    });
    const user = users && users[0];
    if (!user) {
      return json(res, 200, okResponse);
    }

    const token = newToken();
    const expiresAt = new Date(Date.now() + MAGIC_TTL_MS).toISOString();
    await sbInsert("crm_magic_links", {
      token,
      tenant_id: tenant.id,
      user_id: user.id,
      expires_at: expiresAt
    });

    const link = `${baseUrl(req)}/crm/auth?token=${token}`;

    const emailSent = await sendMagicEmail({
      to: email,
      link,
      tenantName: tenant.name
    });

    if (!emailSent) {
      // Resend not configured — return the link directly for dev/testing.
      return json(res, 200, {
        ok: true,
        message: "Resend not configured. Link returned directly (dev mode only).",
        link
      });
    }

    return json(res, 200, okResponse);
  } catch (err) {
    return handleError(res, err);
  }
};
