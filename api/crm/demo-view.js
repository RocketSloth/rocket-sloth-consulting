const crypto = require("crypto");
const { parseBody, json, handleError, methodGuard } = require("../_lib/http");
const { sbSelect, sbInsert, sbUpdate } = require("../_lib/supabase");
const { createSession, setSessionCookie, hashPassword } = require("../_lib/auth");

const POOL_CONTACTS = [
  ["Jake", "Miller", "jake@sunriseresidential.com", "Sunrise Residential", "Homeowner", "lead"],
  ["Maria", "Lopez", "maria@coastlinehoa.org", "Coastline HOA", "Board President", "prospect"],
  ["Evan", "Brooks", "evan@blueheronhotel.com", "Blue Heron Hotel", "Facilities Manager", "prospect"],
  ["Priya", "Shah", "priya@lagunafitness.com", "Laguna Fitness Club", "General Manager", "lead"],
  ["Tom", "Reynolds", "tom@seasidevillas.com", "Seaside Villas", "Property Manager", "customer"],
  ["Angela", "Kim", "angela@northshoredaycare.com", "Northshore Daycare", "Owner", "lead"],
  ["Chris", "Daniels", "chris@harborrestaurant.com", "Harbor Grill", "Operations Director", "prospect"],
  ["Olivia", "Grant", "olivia@pinecrestschool.org", "Pinecrest School", "Athletics Director", "customer"],
  ["Derek", "Nguyen", "derek@marinacondos.com", "Marina Condos", "HOA Treasurer", "prospect"],
  ["Lena", "Foster", "lena@bayviewspa.com", "Bayview Spa", "Owner", "lead"]
];

const POOL_DEALS = [
  ["Weekly cleaning + chemicals", 0, 520, "qualified", "Inbound web form"],
  ["HOA monthly service contract", 1, 2400, "proposal", "Referral"],
  ["Hotel commercial maintenance", 2, 4200, "demo", "Outbound"],
  ["Fitness center filtration upgrade", 3, 6800, "negotiation", "Inbound web form"],
  ["Seaside Villas annual renewal", 4, 12000, "won", "Existing customer"],
  ["Daycare safety compliance package", 5, 1800, "qualified", "Inbound web form"],
  ["Restaurant decorative fountain service", 6, 950, "new", "Referral"],
  ["School swim program support", 7, 3600, "proposal", "Outbound"],
  ["Condo leak detection add-on", 8, 2200, "qualified", "Existing customer"],
  ["Spa saltwater conversion", 9, 5400, "new", "Inbound web form"]
];

const POOL_ACTIVITIES = [
  ["call", "Initial needs call", "Reviewed current maintenance schedule, water quality issues, and budget constraints."],
  ["email", "Sent proposal", "Shared service options with weekly and bi-weekly packages plus expected response SLAs."],
  ["meeting", "On-site walkthrough", "Inspected equipment pad, filter age, pump performance, and tile cleaning requirements."],
  ["note", "Decision maker confirmed", "Primary approver identified. They want predictable monthly billing and fewer algae incidents."],
  ["task", "Follow-up check-in", "Call back in 3 days to answer questions and confirm preferred start date."]
];

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

async function ensureDemoData(tenantId, ownerUserId) {
  const existingContacts = await sbSelect("crm_contacts", {
    tenant_id: `eq.${tenantId}`,
    select: "id",
    limit: "1"
  });
  if (existingContacts && existingContacts.length) {
    return;
  }

  const contacts = await sbInsert("crm_contacts", POOL_CONTACTS.map(([first, last, email, company, title, status]) => ({
    tenant_id: tenantId,
    first_name: first,
    last_name: last,
    email,
    company,
    title,
    status,
    tags: ["pool-service", status],
    custom_fields: {
      service_area: "Orange County",
      lead_source: "Web / Referral"
    }
  })));

  const stageProbability = {
    new: 10,
    qualified: 25,
    demo: 40,
    proposal: 60,
    negotiation: 80,
    won: 100,
    lost: 0
  };

  const deals = await sbInsert("crm_deals", POOL_DEALS.map(([title, contactIndex, amount, stage, source]) => ({
    tenant_id: tenantId,
    contact_id: contacts[contactIndex] ? contacts[contactIndex].id : null,
    owner_id: ownerUserId || null,
    title,
    stage,
    amount,
    currency: "USD",
    probability: stageProbability[stage] || 0,
    expected_close_date: new Date(Date.now() + (7 + contactIndex * 3) * 86400000).toISOString().slice(0, 10),
    custom_fields: { source }
  })));

  const activities = [];
  deals.forEach((deal, index) => {
    const size = 2 + (index % 3);
    POOL_ACTIVITIES.slice(0, size).forEach(([type, subject, body]) => {
      activities.push({
        tenant_id: tenantId,
        contact_id: deal.contact_id,
        deal_id: deal.id,
        user_id: ownerUserId || null,
        type,
        subject,
        body
      });
    });
  });

  if (activities.length) {
    await sbInsert("crm_activities", activities);
  }
}

module.exports = async function handler(req, res) {
  if (!methodGuard(req, res, ["POST"])) return;
  try {
    const body = parseBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      return json(res, 400, { error: "A valid email is required" });
    }

    const demoTenantSlug = String(process.env.DEMO_LOGIN_TENANT || "demo").trim().toLowerCase();

    const tenants = await sbSelect("crm_tenants", {
      slug: `eq.${demoTenantSlug}`,
      select: "id,slug,name,plan,status,config"
    });
    let tenant = tenants && tenants[0];
    if (!tenant) {
      tenant = await sbInsert("crm_tenants", {
        slug: demoTenantSlug,
        name: "RocketSloth Demo",
        plan: "demo",
        status: "active",
        config: {
          branding: {
            productName: "RocketSloth Demo CRM",
            accentColor: "#4f46e5",
            logoUrl: ""
          },
          pipeline: {
            stages: [
              { id: "new", label: "New", probability: 10 },
              { id: "qualified", label: "Qualified", probability: 25 },
              { id: "demo", label: "Site Visit", probability: 40 },
              { id: "proposal", label: "Proposal", probability: 60 },
              { id: "negotiation", label: "Negotiation", probability: 80 },
              { id: "won", label: "Won", probability: 100 },
              { id: "lost", label: "Lost", probability: 0 }
            ]
          },
          contactStatuses: ["lead", "prospect", "customer", "archived"]
        }
      });
    } else if (tenant.status !== "active") {
      const updated = await sbUpdate("crm_tenants", { id: `eq.${tenant.id}` }, { status: "active" });
      tenant = updated && updated[0] ? updated[0] : tenant;
    }

    const users = await sbSelect("crm_users", {
      tenant_id: `eq.${tenant.id}`,
      email: `eq.${email}`,
      select: "*"
    });
    let user = users && users[0];
    if (!user) {
      const fullName = email.split("@")[0].replace(/[._-]+/g, " ").slice(0, 80);
      user = await sbInsert("crm_users", {
        tenant_id: tenant.id,
        email,
        full_name: fullName || "Demo Viewer",
        role: "member",
        password_hash: hashPassword(crypto.randomBytes(24).toString("hex"))
      });
    }

    await ensureDemoData(tenant.id, user.id);

    const { token, expiresAt } = await createSession(user);
    setSessionCookie(res, token, expiresAt);
    return json(res, 200, { ok: true, redirectTo: "/crm" });
  } catch (err) {
    return handleError(res, err);
  }
};
