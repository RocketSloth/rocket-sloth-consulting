#!/usr/bin/env node
// Seeds the public "demo" tenant with realistic-looking sample data so the
// landing page "Live demo" CTA always lands on a populated CRM.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... CRM_ADMIN_TOKEN=... \
//   CRM_BASE_URL=https://rocketsloth.space \
//   node scripts/seed-demo.js
//
// What it does:
//   1. Calls /api/crm/provision to create (or reuse) tenant slug "demo"
//      with branded config and a known owner login.
//   2. Talks directly to Supabase REST to bulk-insert ~30 contacts,
//      ~15 deals across stages, and a few activities.
//   3. Prints the demo login URL and credentials at the end.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_TOKEN = process.env.CRM_ADMIN_TOKEN;
const BASE_URL = process.env.CRM_BASE_URL || "http://localhost:3000";

if (!SUPABASE_URL || !SUPABASE_KEY || !ADMIN_TOKEN) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CRM_ADMIN_TOKEN");
  process.exit(1);
}

const DEMO_SLUG = "demo";
const DEMO_EMAIL = "demo@rocketsloth.space";
const DEMO_PASSWORD = "demo-rocketsloth-2026";

const DEMO_CONFIG = {
  branding: {
    productName: "RocketSloth Demo CRM",
    accentColor: "#f58f4c",
    logoUrl: ""
  },
  pipeline: {
    stages: [
      { id: "new", label: "New Lead", probability: 10 },
      { id: "qualified", label: "Qualified", probability: 25 },
      { id: "demo", label: "Demo Booked", probability: 40 },
      { id: "proposal", label: "Proposal Sent", probability: 60 },
      { id: "negotiation", label: "Negotiation", probability: 80 },
      { id: "won", label: "Closed Won", probability: 100 },
      { id: "lost", label: "Closed Lost", probability: 0 }
    ]
  },
  contactStatuses: ["lead", "prospect", "customer", "churned", "archived"],
  customFields: {
    contact: [
      { id: "linkedin", label: "LinkedIn", type: "text" },
      { id: "industry", label: "Industry", type: "text" }
    ],
    deal: [{ id: "source", label: "Lead source", type: "text" }]
  },
  modules: { contacts: true, deals: true, activities: true }
};

const SAMPLE_CONTACTS = [
  ["Ada", "Lovelace", "ada@analytical.io", "Analytical Engines", "CTO", "customer", ["champion"]],
  ["Grace", "Hopper", "grace@cobolworks.com", "COBOL Works", "VP Engineering", "customer", ["champion", "renewal"]],
  ["Linus", "Pauling", "linus@chemco.com", "ChemCo", "Director of Ops", "prospect", ["warm"]],
  ["Marie", "Curie", "marie@radiant.fr", "Radiant SAS", "Head of Research", "lead", ["inbound"]],
  ["Alan", "Turing", "alan@bombe.uk", "Bombe Industries", "CEO", "customer", ["expansion"]],
  ["Rosalind", "Franklin", "rosalind@helix.bio", "Helix Bio", "VP Data", "prospect", []],
  ["Katherine", "Johnson", "katherine@orbital.space", "Orbital Dynamics", "CFO", "customer", ["renewal"]],
  ["Tim", "Berners-Lee", "tim@hypertext.org", "Hypertext Co", "Founder", "lead", ["inbound"]],
  ["Hedy", "Lamarr", "hedy@spectrum.com", "Spectrum Comms", "COO", "prospect", ["warm"]],
  ["Claude", "Shannon", "claude@infotheory.io", "Info Theory Inc", "Chief Scientist", "lead", []],
  ["Margaret", "Hamilton", "margaret@apollo.dev", "Apollo Software", "VP Engineering", "customer", ["champion"]],
  ["John", "von Neumann", "john@gametheory.com", "Game Theory LLC", "CEO", "prospect", ["cold"]],
  ["Barbara", "Liskov", "barbara@substitution.io", "Substitution Co", "CTO", "lead", []],
  ["Donald", "Knuth", "don@knuth.org", "Knuth Press", "Founder", "customer", ["renewal"]],
  ["Edsger", "Dijkstra", "edsger@goto.nl", "GoToLess BV", "Principal", "prospect", []],
  ["Niklaus", "Wirth", "niklaus@pascal.ch", "Pascal AG", "CEO", "lead", []],
  ["Dennis", "Ritchie", "dennis@unix.net", "Unix Co", "VP Eng", "customer", ["expansion"]],
  ["Brian", "Kernighan", "brian@awk.io", "AWK Tools", "Engineer", "prospect", []],
  ["Bjarne", "Stroustrup", "bjarne@plusplus.com", "PlusPlus", "Architect", "lead", []],
  ["Vint", "Cerf", "vint@tcpip.net", "TCPIP Networks", "Chief", "customer", ["renewal"]],
  ["Radia", "Perlman", "radia@spanning.io", "Spanning Tree Co", "VP", "prospect", ["warm"]],
  ["Frances", "Allen", "frances@compiler.dev", "Compiler Labs", "CTO", "lead", []],
  ["Adele", "Goldberg", "adele@smalltalk.io", "Smalltalk Inc", "Founder", "customer", ["champion"]],
  ["Jean", "Sammet", "jean@cobol.org", "COBOL Council", "Director", "prospect", []],
  ["Karen", "Spärck Jones", "karen@idf.uk", "IDF Search", "Head of AI", "lead", ["inbound"]],
  ["Anita", "Borg", "anita@systers.org", "Systers", "VP", "customer", ["renewal"]],
  ["Shafi", "Goldwasser", "shafi@crypto.io", "Crypto Co", "CTO", "prospect", []],
  ["Cynthia", "Dwork", "cynthia@privacy.dev", "Privacy Tech", "Principal", "lead", []],
  ["Leslie", "Lamport", "leslie@paxos.io", "Paxos LLC", "Founder", "customer", ["expansion"]],
  ["Yoshua", "Bengio", "yoshua@deeplearn.ai", "DeepLearn AI", "Chief Scientist", "prospect", ["warm"]]
];

const SAMPLE_DEALS = [
  ["Analytical Engines - CRM rollout", 0, 48000, "won"],
  ["COBOL Works - BI dashboard build", 1, 22000, "won"],
  ["ChemCo - AI lead enrichment pilot", 2, 12000, "negotiation"],
  ["Radiant SAS - Discovery engagement", 3, 4500, "qualified"],
  ["Bombe Industries - Workflow automation", 4, 36000, "proposal"],
  ["Helix Bio - CRM + AI summaries", 5, 28000, "demo"],
  ["Orbital Dynamics - Forecasting upgrade", 6, 18000, "negotiation"],
  ["Hypertext Co - Discovery", 7, 4500, "new"],
  ["Spectrum Comms - Pilot AI agent", 8, 9500, "qualified"],
  ["Info Theory - Intro call", 9, 0, "new"],
  ["Apollo Software - Year 2 expansion", 10, 64000, "proposal"],
  ["Game Theory LLC - Cold outbound", 11, 0, "new"],
  ["Substitution Co - Eval", 12, 7500, "qualified"],
  ["Knuth Press - Renewal", 13, 14000, "won"],
  ["GoToLess - Lost to incumbent", 14, 12000, "lost"]
];

const SAMPLE_ACTIVITIES = [
  ["call", "Discovery call", "30 min intro. They're using spreadsheets, want pipeline visibility and AI assist for follow-ups."],
  ["email", "Sent proposal", "Sent the Growth tier proposal with 3-week build timeline."],
  ["meeting", "Demo session", "Walked through the live CRM. They loved the AI deal summary feature."],
  ["note", "Champion identified", "VP Eng is the internal champion. CFO is the budget owner — needs forecast model in BI view."],
  ["call", "Pricing discussion", "Confirmed Growth tier fits. Targeting Q2 launch."],
  ["email", "Follow up after demo", "Sent recap + recording. Awaiting feedback on custom field requirements."],
  ["task", "Send security questionnaire", "They need our SOC2 readiness doc by Friday."]
];

async function sb(method, path, body) {
  const url = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=representation"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase ${method} ${path} → ${response.status} ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function provisionDemoTenant() {
  // Best-effort provision; if 409 (already exists) we just continue.
  const response = await fetch(`${BASE_URL}/api/crm/provision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_TOKEN}`
    },
    body: JSON.stringify({
      slug: DEMO_SLUG,
      name: "RocketSloth Demo",
      ownerEmail: DEMO_EMAIL,
      ownerPassword: DEMO_PASSWORD,
      ownerName: "Demo Owner",
      plan: "demo",
      config: DEMO_CONFIG
    })
  });
  if (response.ok) {
    console.log("✓ Provisioned demo tenant.");
  } else if (response.status === 409) {
    console.log("✓ Demo tenant already exists, reusing it.");
  } else {
    const text = await response.text();
    throw new Error(`Provision failed: ${response.status} ${text}`);
  }
}

async function getTenantId() {
  const rows = await sb("GET", `/crm_tenants?slug=eq.${DEMO_SLUG}&select=id`);
  if (!rows || !rows[0]) throw new Error("Demo tenant not found after provisioning");
  return rows[0].id;
}

async function clearExistingDemoData(tenantId) {
  await sb("DELETE", `/crm_activities?tenant_id=eq.${tenantId}`);
  await sb("DELETE", `/crm_deals?tenant_id=eq.${tenantId}`);
  await sb("DELETE", `/crm_contacts?tenant_id=eq.${tenantId}`);
  console.log("✓ Cleared previous demo contacts/deals/activities.");
}

async function seedContacts(tenantId) {
  const rows = SAMPLE_CONTACTS.map(([first, last, email, company, title, status, tags]) => ({
    tenant_id: tenantId,
    first_name: first,
    last_name: last,
    email,
    company,
    title,
    status,
    tags,
    custom_fields: { industry: "Software", linkedin: `https://linkedin.com/in/${first.toLowerCase()}-${last.toLowerCase().replace(/\s/g, "-")}` }
  }));
  const inserted = await sb("POST", "/crm_contacts", rows);
  console.log(`✓ Inserted ${inserted.length} contacts.`);
  return inserted;
}

async function seedDeals(tenantId, contacts) {
  const stageProbability = {
    new: 10, qualified: 25, demo: 40, proposal: 60, negotiation: 80, won: 100, lost: 0
  };
  const rows = SAMPLE_DEALS.map(([title, contactIdx, amount, stage]) => ({
    tenant_id: tenantId,
    title,
    contact_id: contacts[contactIdx] ? contacts[contactIdx].id : null,
    stage,
    amount,
    currency: "USD",
    probability: stageProbability[stage] || 0,
    expected_close_date: new Date(Date.now() + Math.random() * 60 * 86400000).toISOString().slice(0, 10),
    custom_fields: { source: ["Inbound", "Outbound", "Referral", "Event"][Math.floor(Math.random() * 4)] }
  }));
  const inserted = await sb("POST", "/crm_deals", rows);
  console.log(`✓ Inserted ${inserted.length} deals.`);
  return inserted;
}

async function seedActivities(tenantId, contacts, deals) {
  const rows = [];
  deals.forEach((deal, i) => {
    const activitiesForDeal = SAMPLE_ACTIVITIES.slice(0, 2 + (i % 4));
    activitiesForDeal.forEach(([type, subject, body]) => {
      rows.push({
        tenant_id: tenantId,
        deal_id: deal.id,
        contact_id: deal.contact_id,
        type,
        subject,
        body
      });
    });
  });
  const inserted = await sb("POST", "/crm_activities", rows);
  console.log(`✓ Inserted ${inserted.length} activities.`);
}

async function main() {
  console.log(`Seeding demo tenant against ${BASE_URL} …\n`);
  await provisionDemoTenant();
  const tenantId = await getTenantId();
  await clearExistingDemoData(tenantId);
  const contacts = await seedContacts(tenantId);
  const deals = await seedDeals(tenantId, contacts);
  await seedActivities(tenantId, contacts, deals);
  console.log(`\n✅ Demo ready.`);
  console.log(`   URL:      ${BASE_URL}/crm/login?tenant=${DEMO_SLUG}`);
  console.log(`   Email:    ${DEMO_EMAIL}`);
  console.log(`   Password: ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error("\n❌ Seed failed:", err.message);
  process.exit(1);
});
