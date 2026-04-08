const { json, handleError, methodGuard } = require("../_lib/http");

module.exports = async function handler(req, res) {
  if (!methodGuard(req, res, ["GET"])) return;
  try {
    const email = String(process.env.DEMO_LOGIN_EMAIL || "demo@rocketsloth.space").trim().toLowerCase();
    const password = String(process.env.DEMO_LOGIN_PASSWORD || "demo-rocketsloth-2026");
    const tenant = String(process.env.DEMO_LOGIN_TENANT || "demo").trim().toLowerCase();

    return json(res, 200, {
      loginUrl: `/crm/login?tenant=${encodeURIComponent(tenant)}`,
      tenant,
      email,
      password
    });
  } catch (err) {
    return handleError(res, err);
  }
};
