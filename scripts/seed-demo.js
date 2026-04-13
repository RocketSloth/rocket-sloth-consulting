#!/usr/bin/env node
// Seeds the public "demo" tenant with realistic pool-service sample data.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... CRM_ADMIN_TOKEN=... \
//   CRM_BASE_URL=https://rocketsloth.space \
//   node scripts/seed-demo.js
//
// What it does:
//   1. Calls /api/crm/provision to create (or reuse) tenant slug "demo".
//   2. Syncs the tenant config directly in Supabase so branding and pipeline
//      update even when the tenant already exists.
//   3. Bulk-inserts contacts, deals, and activity history for a pool company.
//   4. Prints the public demo URL plus owner credentials at the end.

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
const NOW = Date.now();

const DEMO_CONFIG = {
  branding: {
    productName: "BlueCurrent Pool Service CRM",
    accentColor: "#1299b1",
    logoUrl: ""
  },
  pipeline: {
    stages: [
      { id: "new", label: "New inquiry", probability: 10 },
      { id: "site_visit", label: "Site visit", probability: 30 },
      { id: "quoted", label: "Quote sent", probability: 50 },
      { id: "follow_up", label: "Awaiting approval", probability: 65 },
      { id: "scheduled", label: "Scheduled", probability: 85 },
      { id: "won", label: "Won", probability: 100 },
      { id: "lost", label: "Lost", probability: 0 }
    ]
  },
  contactStatuses: ["lead", "quoted", "customer", "seasonal", "archived"],
  customFields: {
    contact: [
      { id: "service_address", label: "Service address", type: "text" },
      { id: "pool_type", label: "Pool type", type: "text" },
      { id: "route_day", label: "Route day", type: "text" },
      { id: "gate_notes", label: "Gate notes", type: "text" },
      { id: "service_plan", label: "Service plan", type: "text" }
    ],
    deal: [
      { id: "service_type", label: "Service type", type: "text" },
      { id: "body_of_water", label: "Body of water", type: "text" },
      { id: "volume_gallons", label: "Volume", type: "text" },
      { id: "equipment", label: "Equipment", type: "text" },
      { id: "technician", label: "Assigned tech", type: "text" },
      { id: "source", label: "Lead source", type: "text" }
    ]
  },
  modules: { contacts: true, deals: true, activities: true }
};

const SAMPLE_CONTACTS = [
  {
    firstName: "Mia",
    lastName: "Rivera",
    email: "mia@riveraresidence.com",
    phone: "(480) 555-0141",
    company: "Rivera Residence",
    title: "Homeowner",
    status: "customer",
    tags: ["weekly-route", "salt-system"],
    customFields: {
      service_address: "8142 E Palo Verde Dr, Scottsdale, AZ",
      pool_type: "Pool + spa",
      route_day: "Monday",
      gate_notes: "Side gate latch sticks after 3 pm",
      service_plan: "Weekly full service"
    }
  },
  {
    firstName: "Sonia",
    lastName: "Delgado",
    email: "sonia@eastridgehoa.com",
    phone: "(602) 555-0198",
    company: "East Ridge HOA",
    title: "Community Manager",
    status: "customer",
    tags: ["commercial", "hoa"],
    customFields: {
      service_address: "2340 N 91st Ave, Phoenix, AZ",
      pool_type: "Community pool + spa",
      route_day: "Tuesday",
      gate_notes: "Call office for pump room key",
      service_plan: "Commercial chemical and cleaning"
    }
  },
  {
    firstName: "Eric",
    lastName: "Monroe",
    email: "eric@canyonviewhotel.com",
    phone: "(480) 555-0150",
    company: "Canyon View Hotel",
    title: "General Manager",
    status: "quoted",
    tags: ["hotel", "proposal"],
    customFields: {
      service_address: "112 W Canyon View Rd, Tempe, AZ",
      pool_type: "Resort pool + spa",
      route_day: "Friday",
      gate_notes: "Check in at front desk before entering",
      service_plan: "Weekend service coverage proposal"
    }
  },
  {
    firstName: "Jordan",
    lastName: "Patel",
    email: "jordan@patelfamily.com",
    phone: "(602) 555-0187",
    company: "Patel Family Home",
    title: "Homeowner",
    status: "customer",
    tags: ["repair", "heater"],
    customFields: {
      service_address: "5221 S 14th St, Phoenix, AZ",
      pool_type: "Play pool",
      route_day: "Wednesday",
      gate_notes: "Dog in backyard, text before arrival",
      service_plan: "Chemical only plus repairs"
    }
  },
  {
    firstName: "Marisol",
    lastName: "King",
    email: "marisol@palmterraceapts.com",
    phone: "(623) 555-0132",
    company: "Palm Terrace Apartments",
    title: "Property Manager",
    status: "lead",
    tags: ["multi-family", "inspection"],
    customFields: {
      service_address: "6815 W Palm Terrace Ln, Glendale, AZ",
      pool_type: "Apartment pool",
      route_day: "Thursday",
      gate_notes: "Maintenance lead meets vendor at west gate",
      service_plan: "Bid pending"
    }
  },
  {
    firstName: "Ava",
    lastName: "Nguyen",
    email: "ava@nguyenhousehold.com",
    phone: "(480) 555-0171",
    company: "Nguyen Household",
    title: "Homeowner",
    status: "lead",
    tags: ["green-to-clean", "urgent"],
    customFields: {
      service_address: "4018 E Marigold Ave, Mesa, AZ",
      pool_type: "Pebble-tec pool",
      route_day: "Unassigned",
      gate_notes: "No gate code needed",
      service_plan: "Green-to-clean estimate"
    }
  },
  {
    firstName: "Chris",
    lastName: "Owens",
    email: "chris@coppermesafitness.com",
    phone: "(602) 555-0165",
    company: "Copper Mesa Fitness Club",
    title: "Operations Director",
    status: "customer",
    tags: ["commercial", "tile-clean"],
    customFields: {
      service_address: "1889 E Baseline Rd, Gilbert, AZ",
      pool_type: "Lap pool + spa",
      route_day: "Tuesday",
      gate_notes: "Equipment room door is badge access only",
      service_plan: "Twice weekly commercial service"
    }
  },
  {
    firstName: "Naomi",
    lastName: "Brooks",
    email: "naomi@lakesidemontessori.org",
    phone: "(480) 555-0129",
    company: "Lakeside Montessori",
    title: "Facilities Manager",
    status: "quoted",
    tags: ["school", "seasonal"],
    customFields: {
      service_address: "930 S Lakeside Ave, Chandler, AZ",
      pool_type: "Splash pad",
      route_day: "Seasonal",
      gate_notes: "Must be off campus by 2:30 pm pickup line",
      service_plan: "Startup and seasonal maintenance"
    }
  },
  {
    firstName: "Devon",
    lastName: "Brooks",
    email: "devon@brooksfamily.net",
    phone: "(480) 555-0192",
    company: "Brooks Family Home",
    title: "Homeowner",
    status: "customer",
    tags: ["renewal", "weekly-route"],
    customFields: {
      service_address: "7440 E Ironwood Pl, Scottsdale, AZ",
      pool_type: "Pool + baja shelf",
      route_day: "Thursday",
      gate_notes: "HOA gate code 7742",
      service_plan: "Weekly full service"
    }
  },
  {
    firstName: "Helen",
    lastName: "Torres",
    email: "helen@mesaverdehoa.com",
    phone: "(623) 555-0181",
    company: "Mesa Verde HOA",
    title: "Community Manager",
    status: "customer",
    tags: ["automation", "hoa"],
    customFields: {
      service_address: "1201 N Mesa Verde Pkwy, Surprise, AZ",
      pool_type: "Community pool",
      route_day: "Monday",
      gate_notes: "Pump room code 9081",
      service_plan: "Weekly commercial service"
    }
  },
  {
    firstName: "Tessa",
    lastName: "Cole",
    email: "tessa@harpercolepm.com",
    phone: "(602) 555-0136",
    company: "Harper & Cole Rentals",
    title: "Asset Manager",
    status: "lead",
    tags: ["turnover", "rental"],
    customFields: {
      service_address: "Multiple vacation homes, Scottsdale, AZ",
      pool_type: "Mixed residential",
      route_day: "Variable",
      gate_notes: "Each property has lockbox access",
      service_plan: "Turnover cleanup package"
    }
  },
  {
    firstName: "Landon",
    lastName: "Price",
    email: "landon@saguarosuites.com",
    phone: "(480) 555-0148",
    company: "Saguaro Suites",
    title: "General Manager",
    status: "seasonal",
    tags: ["hotel", "spa-upgrade"],
    customFields: {
      service_address: "77 N Saguaro Blvd, Scottsdale, AZ",
      pool_type: "Spa courtyard",
      route_day: "Seasonal",
      gate_notes: "Meet chief engineer at boiler room",
      service_plan: "Seasonal spa startup"
    }
  }
];

const SAMPLE_DEALS = [
  {
    contactEmail: "mia@riveraresidence.com",
    title: "Rivera residence automation upgrade",
    amount: 4200,
    stage: "quoted",
    expectedCloseInDays: 9,
    updatedDaysAgo: 1,
    customFields: {
      service_type: "Automation and lighting",
      body_of_water: "Pool + spa",
      volume_gallons: "18,500 gal",
      equipment: "Pentair EasyTouch, IntelliFlo, LED lights",
      technician: "Luis M.",
      source: "Existing customer"
    },
    activities: [
      { daysAgo: 9, type: "call", subject: "Requested smarter spa controls", body: "Homeowner wants one-tap spa mode, app control, and new color lighting before summer guests arrive." },
      { daysAgo: 6, type: "meeting", subject: "On-site automation walkthrough", body: "Confirmed panel location, existing conduit path, and compatibility with current variable-speed pump." },
      { daysAgo: 2, type: "email", subject: "Quote sent", body: "Sent upgrade quote with automation panel, wiring labor, and startup training." },
      { daysAgo: 1, type: "task", subject: "Follow up Friday", body: "Check whether they want the mid-tier controller or full app-enabled bundle." }
    ]
  },
  {
    contactEmail: "sonia@eastridgehoa.com",
    title: "East Ridge HOA summer opening contract",
    amount: 12800,
    stage: "won",
    expectedCloseInDays: -12,
    updatedDaysAgo: 4,
    customFields: {
      service_type: "Season opening and route coverage",
      body_of_water: "Community pool + spa",
      volume_gallons: "54,000 gal",
      equipment: "Commercial sand filters, chemical controller",
      technician: "Brandon R.",
      source: "Referral from board member"
    },
    activities: [
      { daysAgo: 20, type: "call", subject: "Board requested seasonal proposal", body: "HOA needs opening chemicals, deck cleanup, and eight weeks of extra weekend checks." },
      { daysAgo: 14, type: "meeting", subject: "Pump room inspection", body: "Verified feeder condition, backwash timing, and heater lockout before opening weekend." },
      { daysAgo: 7, type: "email", subject: "Signed contract received", body: "Received approved summer service agreement and added site to May route expansion." }
    ]
  },
  {
    contactEmail: "eric@canyonviewhotel.com",
    title: "Canyon View Hotel weekend service coverage",
    amount: 18600,
    stage: "follow_up",
    expectedCloseInDays: 13,
    updatedDaysAgo: 2,
    customFields: {
      service_type: "Weekend resort service coverage",
      body_of_water: "Resort pool + spa",
      volume_gallons: "42,000 gal",
      equipment: "Commercial pumps, UV sanitation, spa jets",
      technician: "Marcos T.",
      source: "Inbound web lead"
    },
    activities: [
      { daysAgo: 12, type: "call", subject: "Weekend guest complaints", body: "Hotel is missing chemistry checks on Saturdays and wants faster response before peak occupancy weekends." },
      { daysAgo: 8, type: "meeting", subject: "Site visit with chief engineer", body: "Reviewed staffing gaps, spa turnover volume, and current hotel SOP for closures." },
      { daysAgo: 5, type: "email", subject: "Coverage plan delivered", body: "Sent staffing plan with Friday through Sunday visits, emergency escalation, and holiday pricing." },
      { daysAgo: 2, type: "task", subject: "Follow up after ownership review", body: "Ownership group reviews proposals on Thursday. Call Eric Friday morning." }
    ]
  },
  {
    contactEmail: "jordan@patelfamily.com",
    title: "Patel family heater replacement",
    amount: 5400,
    stage: "scheduled",
    expectedCloseInDays: 5,
    updatedDaysAgo: 1,
    customFields: {
      service_type: "Heater replacement",
      body_of_water: "Play pool",
      volume_gallons: "16,000 gal",
      equipment: "400k BTU heater, automation tie-in",
      technician: "Nate C.",
      source: "Existing repair customer"
    },
    activities: [
      { daysAgo: 11, type: "call", subject: "Heater no longer igniting", body: "Unit is short cycling and throwing ignition fault. Customer wants replacement before spring break." },
      { daysAgo: 7, type: "note", subject: "Equipment findings", body: "Confirmed corrosion in exchanger, manifold damage, and poor combustion readings. Replacement recommended." },
      { daysAgo: 3, type: "email", subject: "Install date confirmed", body: "Customer approved quote. Install scheduled for next Tuesday with same-day startup." }
    ]
  },
  {
    contactEmail: "marisol@palmterraceapts.com",
    title: "Palm Terrace Apartments leak detection",
    amount: 7200,
    stage: "site_visit",
    expectedCloseInDays: 16,
    updatedDaysAgo: 3,
    customFields: {
      service_type: "Leak detection and repair scope",
      body_of_water: "Apartment pool",
      volume_gallons: "32,000 gal",
      equipment: "Auto-fill, skimmer line, main drain",
      technician: "Luis M.",
      source: "Property manager referral"
    },
    activities: [
      { daysAgo: 8, type: "call", subject: "Water loss concern", body: "Property manager reports unusually high refill usage and soft soil near equipment pad." },
      { daysAgo: 5, type: "task", subject: "Pressure test scheduled", body: "Booked line pressure test for Thursday morning and requested utility shutoff access." },
      { daysAgo: 3, type: "meeting", subject: "Initial site walk", body: "Observed cracked autofill lid, wet expansion joint, and possible skimmer throat leak." }
    ]
  },
  {
    contactEmail: "ava@nguyenhousehold.com",
    title: "Nguyen household green-to-clean recovery",
    amount: 1450,
    stage: "new",
    expectedCloseInDays: 4,
    updatedDaysAgo: 0,
    customFields: {
      service_type: "Green-to-clean recovery",
      body_of_water: "Pebble-tec pool",
      volume_gallons: "14,000 gal",
      equipment: "Cartridge filter, booster pump",
      technician: "Open",
      source: "Google Local Services"
    },
    activities: [
      { daysAgo: 1, type: "call", subject: "Urgent algae cleanup request", body: "Customer's regular cleaner stopped showing up. Water is opaque green and they have a party in ten days." },
      { daysAgo: 0, type: "task", subject: "Send same-day estimate", body: "Prepare chemistry plan, filter cleanup estimate, and expected recovery timeline." }
    ]
  },
  {
    contactEmail: "chris@coppermesafitness.com",
    title: "Copper Mesa tile clean and acid wash",
    amount: 9800,
    stage: "quoted",
    expectedCloseInDays: 18,
    updatedDaysAgo: 2,
    customFields: {
      service_type: "Acid wash and tile clean",
      body_of_water: "Lap pool + spa",
      volume_gallons: "47,000 gal",
      equipment: "Commercial circulation and ozone system",
      technician: "Brandon R.",
      source: "Existing commercial customer"
    },
    activities: [
      { daysAgo: 15, type: "meeting", subject: "Surface inspection", body: "Calcium line is heavy on both vessels. Club wants shutdown coordinated with a three-day holiday closure." },
      { daysAgo: 6, type: "note", subject: "Operations constraints logged", body: "Need overnight drain permit, deck barricades, and refill staged before 5 am reopening." },
      { daysAgo: 2, type: "email", subject: "Detailed scope sent", body: "Shared tile clean, acid wash, refill chemistry, and startup schedule with optional lighting niche repair." }
    ]
  },
  {
    contactEmail: "naomi@lakesidemontessori.org",
    title: "Lakeside Montessori splash pad startup",
    amount: 3200,
    stage: "site_visit",
    expectedCloseInDays: 21,
    updatedDaysAgo: 4,
    customFields: {
      service_type: "Seasonal startup and training",
      body_of_water: "Splash pad",
      volume_gallons: "6,500 gal reservoir",
      equipment: "UV, circulation booster, feature nozzles",
      technician: "Marcos T.",
      source: "Repeat seasonal client"
    },
    activities: [
      { daysAgo: 13, type: "email", subject: "Requested startup window", body: "School wants the splash pad operational the week after graduation events." },
      { daysAgo: 9, type: "task", subject: "Schedule feature inspection", body: "Inspect nozzles, vault drains, and controller before sending final startup quote." },
      { daysAgo: 4, type: "meeting", subject: "Campus walk completed", body: "Confirmed winterization held up well. One nozzle bank needs replacement before opening." }
    ]
  },
  {
    contactEmail: "devon@brooksfamily.net",
    title: "Brooks family weekly service renewal",
    amount: 2400,
    stage: "won",
    expectedCloseInDays: -6,
    updatedDaysAgo: 6,
    customFields: {
      service_type: "Annual weekly service renewal",
      body_of_water: "Pool + baja shelf",
      volume_gallons: "17,200 gal",
      equipment: "Salt cell, VS pump, in-floor cleaner",
      technician: "Luis M.",
      source: "Existing customer"
    },
    activities: [
      { daysAgo: 18, type: "email", subject: "Renewal reminder sent", body: "Shared annual service renewal with option to add filter cleans every quarter." },
      { daysAgo: 10, type: "call", subject: "Reviewed route timing", body: "Customer wants same Thursday service window and text alerts before arrival." },
      { daysAgo: 6, type: "note", subject: "Renewal approved", body: "Annual agreement accepted. Added automatic billing and updated route notes." }
    ]
  },
  {
    contactEmail: "helen@mesaverdehoa.com",
    title: "Mesa Verde HOA chemical automation retrofit",
    amount: 15600,
    stage: "scheduled",
    expectedCloseInDays: 12,
    updatedDaysAgo: 1,
    customFields: {
      service_type: "Chemical automation retrofit",
      body_of_water: "Community pool",
      volume_gallons: "61,000 gal",
      equipment: "ORP controller, acid tank, feeder room",
      technician: "Nate C.",
      source: "Board-requested capital project"
    },
    activities: [
      { daysAgo: 17, type: "meeting", subject: "Board capital review", body: "Presented manual-dosing risk, labor savings, and closure prevention benefits for automation retrofit." },
      { daysAgo: 6, type: "email", subject: "Install schedule shared", body: "Board approved project. Coordinating trenching, controller install, and startup training." },
      { daysAgo: 1, type: "task", subject: "Confirm electrical subcontractor", body: "Need final breaker schedule and trench permit before Monday kickoff." }
    ]
  },
  {
    contactEmail: "tessa@harpercolepm.com",
    title: "Harper & Cole turnover cleanup package",
    amount: 3900,
    stage: "new",
    expectedCloseInDays: 10,
    updatedDaysAgo: 0,
    customFields: {
      service_type: "Vacation rental turnover cleanups",
      body_of_water: "Residential pool portfolio",
      volume_gallons: "Multiple sites",
      equipment: "Mixed equipment sets across homes",
      technician: "Open",
      source: "Partner referral"
    },
    activities: [
      { daysAgo: 1, type: "call", subject: "Portfolio cleanup request", body: "Asset manager wants a reliable vendor for post-guest cleanups, chemistry resets, and before/after photos." },
      { daysAgo: 0, type: "task", subject: "Draft service bundle", body: "Build package with emergency cleanup pricing, algae response, and photo documentation." }
    ]
  },
  {
    contactEmail: "landon@saguarosuites.com",
    title: "Saguaro Suites spa pump room upgrade",
    amount: 11200,
    stage: "lost",
    expectedCloseInDays: -18,
    updatedDaysAgo: 9,
    customFields: {
      service_type: "Pump room upgrade",
      body_of_water: "Spa courtyard",
      volume_gallons: "8,200 gal",
      equipment: "Booster pumps, automation relay, heater loop",
      technician: "Marcos T.",
      source: "Inbound referral"
    },
    activities: [
      { daysAgo: 24, type: "meeting", subject: "Spa equipment audit", body: "Found undersized circulation pump and corroded check valves limiting turnover." },
      { daysAgo: 16, type: "email", subject: "Upgrade proposal sent", body: "Included pump swap, control relay updates, and startup training for engineering staff." },
      { daysAgo: 9, type: "note", subject: "Closed lost", body: "Property delayed capital spend until next budget cycle. Revisit in Q4." }
    ]
  }
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
    throw new Error(`Supabase ${method} ${path} -> ${response.status} ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

function isoDaysAgo(daysAgo, hour) {
  const offsetHours = hour == null ? 10 : hour;
  return new Date(NOW - daysAgo * 86400000 + offsetHours * 3600000).toISOString();
}

function isoDateFromOffset(daysFromNow) {
  return new Date(NOW + daysFromNow * 86400000).toISOString().slice(0, 10);
}

async function provisionDemoTenant() {
  const response = await fetch(`${BASE_URL}/api/crm/provision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_TOKEN}`
    },
    body: JSON.stringify({
      slug: DEMO_SLUG,
      name: "BlueCurrent Pool Service",
      ownerEmail: DEMO_EMAIL,
      ownerPassword: DEMO_PASSWORD,
      ownerName: "Demo Owner",
      plan: "demo",
      config: DEMO_CONFIG
    })
  });

  if (response.ok) {
    console.log("Provisioned demo tenant.");
  } else if (response.status === 409) {
    console.log("Demo tenant already exists, reusing it.");
  } else {
    const text = await response.text();
    throw new Error(`Provision failed: ${response.status} ${text}`);
  }
}

async function getTenant() {
  const rows = await sb("GET", `/crm_tenants?slug=eq.${DEMO_SLUG}&select=id,name`);
  if (!rows || !rows[0]) throw new Error("Demo tenant not found after provisioning");
  return rows[0];
}

async function syncTenantConfig(tenantId) {
  await sb("PATCH", `/crm_tenants?id=eq.${tenantId}`, {
    name: "BlueCurrent Pool Service",
    plan: "demo",
    status: "active",
    config: DEMO_CONFIG
  });
  console.log("Synced demo tenant branding and pipeline config.");
}

async function clearExistingDemoData(tenantId) {
  await sb("DELETE", `/crm_activities?tenant_id=eq.${tenantId}`);
  await sb("DELETE", `/crm_deals?tenant_id=eq.${tenantId}`);
  await sb("DELETE", `/crm_contacts?tenant_id=eq.${tenantId}`);
  console.log("Cleared previous demo contacts, deals, and activities.");
}

async function seedContacts(tenantId) {
  const rows = SAMPLE_CONTACTS.map((contact, index) => ({
    tenant_id: tenantId,
    first_name: contact.firstName,
    last_name: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    company: contact.company,
    title: contact.title,
    status: contact.status,
    tags: contact.tags,
    custom_fields: contact.customFields,
    created_at: isoDaysAgo(45 - index * 2, 9),
    updated_at: isoDaysAgo(Math.max(1, 10 - (index % 7)), 11)
  }));

  const inserted = await sb("POST", "/crm_contacts", rows);
  console.log(`Inserted ${inserted.length} contacts.`);
  return inserted;
}

function stageProbability(stage) {
  return {
    new: 10,
    site_visit: 30,
    quoted: 50,
    follow_up: 65,
    scheduled: 85,
    won: 100,
    lost: 0
  }[stage] || 0;
}

async function seedDeals(tenantId, contacts) {
  const contactByEmail = new Map(contacts.map((contact) => [String(contact.email).toLowerCase(), contact]));

  const rows = SAMPLE_DEALS.map((deal, index) => {
    const linkedContact = contactByEmail.get(String(deal.contactEmail).toLowerCase());
    return {
      tenant_id: tenantId,
      title: deal.title,
      contact_id: linkedContact ? linkedContact.id : null,
      stage: deal.stage,
      amount: deal.amount,
      currency: "USD",
      probability: stageProbability(deal.stage),
      expected_close_date: isoDateFromOffset(deal.expectedCloseInDays),
      custom_fields: deal.customFields,
      created_at: isoDaysAgo(28 - index, 8),
      updated_at: isoDaysAgo(deal.updatedDaysAgo, 12)
    };
  });

  const inserted = await sb("POST", "/crm_deals", rows);
  console.log(`Inserted ${inserted.length} deals.`);
  return inserted;
}

async function seedActivities(tenantId, contacts, deals) {
  const contactByEmail = new Map(contacts.map((contact) => [String(contact.email).toLowerCase(), contact]));
  const dealByTitle = new Map(deals.map((deal) => [deal.title, deal]));

  const rows = [];
  SAMPLE_DEALS.forEach((deal) => {
    const insertedDeal = dealByTitle.get(deal.title);
    const insertedContact = contactByEmail.get(String(deal.contactEmail).toLowerCase());
    if (!insertedDeal) return;

    deal.activities.forEach((activity, index) => {
      rows.push({
        tenant_id: tenantId,
        deal_id: insertedDeal.id,
        contact_id: insertedContact ? insertedContact.id : null,
        type: activity.type,
        subject: activity.subject,
        body: activity.body,
        created_at: isoDaysAgo(activity.daysAgo, 9 + index)
      });
    });
  });

  const inserted = await sb("POST", "/crm_activities", rows);
  console.log(`Inserted ${inserted.length} activities.`);
  return inserted;
}

async function main() {
  console.log(`Seeding demo tenant against ${BASE_URL}...\n`);
  await provisionDemoTenant();
  const tenant = await getTenant();
  await syncTenantConfig(tenant.id);
  await clearExistingDemoData(tenant.id);
  const contacts = await seedContacts(tenant.id);
  const deals = await seedDeals(tenant.id, contacts);
  await seedActivities(tenant.id, contacts, deals);
  console.log("\nDemo ready.");
  console.log(`   Public URL: ${BASE_URL}/crm?tenant=${DEMO_SLUG}&public=1`);
  console.log(`   Owner URL:  ${BASE_URL}/crm/login?tenant=${DEMO_SLUG}`);
  console.log(`   Email:      ${DEMO_EMAIL}`);
  console.log(`   Password:   ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
