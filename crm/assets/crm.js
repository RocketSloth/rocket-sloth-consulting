// Rocket Sloth CRM frontend.
// Single global `CRM` object exposing initLogin(), initAuth(), and initApp().
// Reads the tenant config object (stored alongside the session) to
// drive branding, pipeline stages, and contact statuses per customer.

(function () {
  const STORAGE_KEY = "rs_crm_session";
  const TENANT_KEY = "rs_crm_last_tenant";
  const MIGRATION_FLAG_KEY = "rs_crm_session_migrated_v1";
  const PUBLIC_DEMO_TENANT = "demo";
  const READ_ONLY_ROLES = new Set(["viewer", "read_only", "readonly"]);

  // ---------- Client-side demo mode ----------
  // When the backend isn't configured, the demo runs entirely in the browser
  // with mock data. All CRUD operations work against in-memory arrays.

  var demoIdCounter = 100;
  function demoId() { return "demo-" + (++demoIdCounter); }

  var DEMO_CONFIG = {
    branding: { productName: "Rocket Sloth CRM", accentColor: "#4f46e5", logoUrl: "" },
    pipeline: {
      stages: [
        { id: "new", label: "New", probability: 10 },
        { id: "qualified", label: "Qualified", probability: 25 },
        { id: "proposal", label: "Proposal", probability: 50 },
        { id: "negotiation", label: "Negotiation", probability: 75 },
        { id: "won", label: "Won", probability: 100 },
        { id: "lost", label: "Lost", probability: 0 }
      ]
    },
    contactStatuses: ["lead", "customer", "partner", "archived"],
    customFields: { contact: [], deal: [] },
    modules: { contacts: true, deals: true, activities: true }
  };

  function buildDemoData() {
    var now = new Date();
    var day = 86400000;

    var contacts = [
      { id: demoId(), first_name: "Sarah", last_name: "Chen", email: "sarah@techvault.io", phone: "(415) 555-0101", company: "TechVault", title: "VP Engineering", status: "customer", custom_fields: {}, created_at: new Date(now - 30 * day).toISOString() },
      { id: demoId(), first_name: "Marcus", last_name: "Rivera", email: "marcus@greenleaf.co", phone: "(512) 555-0202", company: "GreenLeaf Analytics", title: "CEO", status: "customer", custom_fields: {}, created_at: new Date(now - 28 * day).toISOString() },
      { id: demoId(), first_name: "Priya", last_name: "Patel", email: "priya@novahealth.com", phone: "(646) 555-0303", company: "NovaHealth", title: "Director of Data", status: "lead", custom_fields: {}, created_at: new Date(now - 25 * day).toISOString() },
      { id: demoId(), first_name: "James", last_name: "O'Brien", email: "james@coastalmfg.com", phone: "(619) 555-0404", company: "Coastal Manufacturing", title: "COO", status: "lead", custom_fields: {}, created_at: new Date(now - 22 * day).toISOString() },
      { id: demoId(), first_name: "Aisha", last_name: "Williams", email: "aisha@brightedu.org", phone: "(312) 555-0505", company: "BrightPath Education", title: "Head of IT", status: "prospect", custom_fields: {}, created_at: new Date(now - 20 * day).toISOString() },
      { id: demoId(), first_name: "Erik", last_name: "Johansson", email: "erik@nordicfin.se", phone: "+46 70 555 0606", company: "Nordic Finance Group", title: "CTO", status: "customer", custom_fields: {}, created_at: new Date(now - 18 * day).toISOString() },
      { id: demoId(), first_name: "Maria", last_name: "Santos", email: "maria@solarbright.com", phone: "(305) 555-0707", company: "SolarBright Energy", title: "VP Operations", status: "lead", custom_fields: {}, created_at: new Date(now - 15 * day).toISOString() },
      { id: demoId(), first_name: "David", last_name: "Kim", email: "david@apexlogistics.com", phone: "(213) 555-0808", company: "Apex Logistics", title: "Director of Strategy", status: "lead", custom_fields: {}, created_at: new Date(now - 12 * day).toISOString() },
      { id: demoId(), first_name: "Lauren", last_name: "Mitchell", email: "lauren@crestview.io", phone: "(617) 555-0909", company: "Crestview Software", title: "Product Manager", status: "customer", custom_fields: {}, created_at: new Date(now - 10 * day).toISOString() },
      { id: demoId(), first_name: "Raj", last_name: "Gupta", email: "raj@quantumleap.ai", phone: "(408) 555-1010", company: "QuantumLeap AI", title: "Founder", status: "lead", custom_fields: {}, created_at: new Date(now - 8 * day).toISOString() },
      { id: demoId(), first_name: "Nina", last_name: "Volkov", email: "nina@stratoscloud.com", phone: "(720) 555-1111", company: "Stratos Cloud", title: "VP Sales", status: "prospect", custom_fields: {}, created_at: new Date(now - 5 * day).toISOString() },
      { id: demoId(), first_name: "Tom", last_name: "Fischer", email: "tom@blueridgehvac.com", phone: "(704) 555-1212", company: "BlueRidge HVAC", title: "Owner", status: "archived", custom_fields: {}, created_at: new Date(now - 45 * day).toISOString() }
    ];

    var deals = [
      { id: demoId(), title: "TechVault BI Dashboard", contact_id: contacts[0].id, stage: "won", amount: 48000, currency: "USD", expected_close_date: new Date(now - 5 * day).toISOString().slice(0, 10), created_at: new Date(now - 25 * day).toISOString(), updated_at: new Date(now - 2 * day).toISOString() },
      { id: demoId(), title: "GreenLeaf Data Pipeline", contact_id: contacts[1].id, stage: "negotiation", amount: 72000, currency: "USD", expected_close_date: new Date(now + 14 * day).toISOString().slice(0, 10), created_at: new Date(now - 20 * day).toISOString(), updated_at: new Date(now - 1 * day).toISOString() },
      { id: demoId(), title: "NovaHealth AI Integration", contact_id: contacts[2].id, stage: "proposal", amount: 95000, currency: "USD", expected_close_date: new Date(now + 30 * day).toISOString().slice(0, 10), created_at: new Date(now - 18 * day).toISOString(), updated_at: new Date(now - 3 * day).toISOString() },
      { id: demoId(), title: "Coastal Mfg Inventory System", contact_id: contacts[3].id, stage: "qualified", amount: 35000, currency: "USD", expected_close_date: new Date(now + 45 * day).toISOString().slice(0, 10), created_at: new Date(now - 15 * day).toISOString(), updated_at: new Date(now - 4 * day).toISOString() },
      { id: demoId(), title: "BrightPath LMS Analytics", contact_id: contacts[4].id, stage: "new", amount: 28000, currency: "USD", expected_close_date: new Date(now + 60 * day).toISOString().slice(0, 10), created_at: new Date(now - 10 * day).toISOString(), updated_at: new Date(now - 5 * day).toISOString() },
      { id: demoId(), title: "Nordic Finance Compliance Tool", contact_id: contacts[5].id, stage: "proposal", amount: 110000, currency: "USD", expected_close_date: new Date(now + 20 * day).toISOString().slice(0, 10), created_at: new Date(now - 22 * day).toISOString(), updated_at: new Date(now - 2 * day).toISOString() },
      { id: demoId(), title: "SolarBright Reporting Suite", contact_id: contacts[6].id, stage: "new", amount: 42000, currency: "USD", expected_close_date: new Date(now + 50 * day).toISOString().slice(0, 10), created_at: new Date(now - 8 * day).toISOString(), updated_at: new Date(now - 6 * day).toISOString() },
      { id: demoId(), title: "Apex Route Optimization AI", contact_id: contacts[7].id, stage: "qualified", amount: 65000, currency: "USD", expected_close_date: new Date(now + 35 * day).toISOString().slice(0, 10), created_at: new Date(now - 12 * day).toISOString(), updated_at: new Date(now - 3 * day).toISOString() },
      { id: demoId(), title: "Crestview CRM Customization", contact_id: contacts[8].id, stage: "won", amount: 18000, currency: "USD", expected_close_date: new Date(now - 10 * day).toISOString().slice(0, 10), created_at: new Date(now - 30 * day).toISOString(), updated_at: new Date(now - 8 * day).toISOString() },
      { id: demoId(), title: "QuantumLeap ML Platform", contact_id: contacts[9].id, stage: "negotiation", amount: 150000, currency: "USD", expected_close_date: new Date(now + 10 * day).toISOString().slice(0, 10), created_at: new Date(now - 14 * day).toISOString(), updated_at: new Date(now - 1 * day).toISOString() },
      { id: demoId(), title: "BlueRidge Legacy Migration", contact_id: contacts[11].id, stage: "lost", amount: 22000, currency: "USD", expected_close_date: new Date(now - 20 * day).toISOString().slice(0, 10), created_at: new Date(now - 40 * day).toISOString(), updated_at: new Date(now - 15 * day).toISOString() }
    ];

    var activities = [
      { id: demoId(), type: "meeting", contact_id: contacts[1].id, deal_id: deals[1].id, subject: "Contract review with GreenLeaf", body: "Walked through SOW and pricing. They want to start in Q2. Follow up with revised timeline.", created_at: new Date(now - 1 * day).toISOString() },
      { id: demoId(), type: "call", contact_id: contacts[9].id, deal_id: deals[9].id, subject: "QuantumLeap budget discussion", body: "Raj confirmed budget approval from board. Need to send final proposal by Friday.", created_at: new Date(now - 1.5 * day).toISOString() },
      { id: demoId(), type: "email", contact_id: contacts[2].id, deal_id: deals[2].id, subject: "NovaHealth proposal sent", body: "Sent the technical proposal for the AI integration project. Includes timeline and team allocation.", created_at: new Date(now - 2 * day).toISOString() },
      { id: demoId(), type: "note", contact_id: contacts[5].id, deal_id: deals[5].id, subject: "Nordic Finance compliance requirements", body: "They need GDPR and SOC2 compliance documentation before signing. Legal is reviewing.", created_at: new Date(now - 3 * day).toISOString() },
      { id: demoId(), type: "call", contact_id: contacts[3].id, deal_id: deals[3].id, subject: "Coastal Mfg discovery call", body: "Discussed pain points with current inventory tracking. They're using spreadsheets for everything.", created_at: new Date(now - 4 * day).toISOString() },
      { id: demoId(), type: "meeting", contact_id: contacts[0].id, deal_id: deals[0].id, subject: "TechVault dashboard launch", body: "Successful launch meeting! Dashboard is live. Sarah's team is thrilled with the real-time metrics.", created_at: new Date(now - 5 * day).toISOString() },
      { id: demoId(), type: "email", contact_id: contacts[6].id, deal_id: deals[6].id, subject: "SolarBright intro follow-up", body: "Maria responded to our outreach. Interested in automated reporting for their solar farm data.", created_at: new Date(now - 6 * day).toISOString() },
      { id: demoId(), type: "task", contact_id: contacts[7].id, deal_id: deals[7].id, subject: "Prepare Apex demo environment", body: "Set up sandbox with sample route data for the optimization demo next week.", created_at: new Date(now - 7 * day).toISOString() },
      { id: demoId(), type: "note", contact_id: contacts[4].id, deal_id: deals[4].id, subject: "BrightPath budget cycle", body: "Aisha mentioned their fiscal year starts July. Timing works well for a summer kickoff.", created_at: new Date(now - 8 * day).toISOString() },
      { id: demoId(), type: "call", contact_id: contacts[8].id, deal_id: deals[8].id, subject: "Crestview post-launch check-in", body: "Lauren reported positive feedback from her sales team. Considering phase 2 expansion.", created_at: new Date(now - 10 * day).toISOString() }
    ];

    return { contacts: contacts, deals: deals, activities: activities };
  }

  // In-memory store for demo mode.
  var demoStore = null;

  function startDemoMode() {
    demoStore = buildDemoData();
    var session = {
      demo: true,
      token: "demo-token",
      user: { id: "demo-user", email: "demo@rocketsloth.space", fullName: "Demo User", role: "owner" },
      tenant: { id: "demo-tenant", slug: "demo", name: "Demo Company", plan: "starter", config: DEMO_CONFIG }
    };
    setSession(session);
    return session;
  }

  // Mock API handler for demo mode — intercepts all CRUD calls.
  function mockApi(path, options) {
    var method = (options && options.method) || "GET";
    var body = (options && options.body) || {};

    // --- Contacts ---
    if (path.indexOf("/api/crm/contacts") === 0) {
      if (method === "GET") {
        var qMatch = path.match(/[?&]q=([^&]*)/);
        var search = qMatch ? decodeURIComponent(qMatch[1]).toLowerCase() : "";
        var filtered = demoStore.contacts;
        if (search) {
          filtered = demoStore.contacts.filter(function (c) {
            return (c.first_name + " " + c.last_name + " " + c.email + " " + c.company).toLowerCase().indexOf(search) !== -1;
          });
        }
        return { contacts: filtered };
      }
      if (method === "POST") {
        var newContact = Object.assign({ id: demoId(), status: "lead", custom_fields: {}, created_at: new Date().toISOString() }, body);
        demoStore.contacts.push(newContact);
        return { contact: newContact };
      }
      var idMatch = path.match(/[?&]id=([^&]*)/);
      var cid = idMatch ? idMatch[1] : null;
      if (method === "PATCH" && cid) {
        demoStore.contacts = demoStore.contacts.map(function (c) {
          return c.id === cid ? Object.assign({}, c, body) : c;
        });
        return { ok: true };
      }
      if (method === "DELETE" && cid) {
        demoStore.contacts = demoStore.contacts.filter(function (c) { return c.id !== cid; });
        return { ok: true };
      }
    }

    // --- Deals ---
    if (path.indexOf("/api/crm/deals") === 0) {
      if (method === "GET") {
        return { deals: demoStore.deals };
      }
      if (method === "POST") {
        var newDeal = Object.assign({ id: demoId(), currency: "USD", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, body);
        demoStore.deals.push(newDeal);
        return { deal: newDeal };
      }
      var didMatch = path.match(/[?&]id=([^&]*)/);
      var did = didMatch ? didMatch[1] : null;
      if (method === "PATCH" && did) {
        demoStore.deals = demoStore.deals.map(function (d) {
          return d.id === did ? Object.assign({}, d, body, { updated_at: new Date().toISOString() }) : d;
        });
        return { ok: true };
      }
      if (method === "DELETE" && did) {
        demoStore.deals = demoStore.deals.filter(function (d) { return d.id !== did; });
        return { ok: true };
      }
    }

    // --- Activities ---
    if (path.indexOf("/api/crm/activities") === 0) {
      if (method === "GET") {
        return { activities: demoStore.activities };
      }
      if (method === "POST") {
        var newAct = Object.assign({ id: demoId(), created_at: new Date().toISOString() }, body);
        demoStore.activities.unshift(newAct);
        return { activity: newAct };
      }
    }

    // --- AI Summary ---
    if (path.indexOf("/api/crm/ai-summary") === 0) {
      var dealIdMatch = path.match(/[?&]deal_id=([^&]*)/);
      var dealId = dealIdMatch ? dealIdMatch[1] : null;
      var deal = demoStore.deals.find(function (d) { return d.id === dealId; });
      var contact = deal ? demoStore.contacts.find(function (c) { return c.id === deal.contact_id; }) : null;
      var contactName = contact ? (contact.first_name + " " + contact.last_name) : "the contact";
      var dealTitle = deal ? deal.title : "this deal";
      return {
        stub: true,
        summary: dealTitle + " is progressing well. " + contactName + " has shown strong interest and engagement throughout the sales process. Key decision-makers are aligned and the technical requirements are well-understood by both teams.",
        nextActions: [
          "Schedule a follow-up call with " + contactName + " to discuss timeline",
          "Prepare a detailed implementation roadmap",
          "Send case studies from similar projects for reference"
        ],
        riskScore: deal && deal.stage === "negotiation" ? 35 : deal && deal.stage === "proposal" ? 45 : 25
      };
    }

    // --- Logout (DELETE /api/crm/me) ---
    if (path.indexOf("/api/crm/me") === 0 && method === "DELETE") {
      demoStore = null;
      return { ok: true };
    }

    return { ok: true };
  }

  function isDemo() {
    return state.session && state.session.demo === true && demoStore !== null;
  }

  function runSessionMigrationGuard() {
    try {
      if (!localStorage.getItem(MIGRATION_FLAG_KEY)) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(MIGRATION_FLAG_KEY, "1");
      }
    } catch {}
  }

  function getSession() {
    if (!state.session) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          state.session = JSON.parse(raw);
        }
      } catch {}
    }
    return state.session;
  }

  function setSession(data) {
    state.session = data || null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (data && data.tenant && data.tenant.slug) {
      localStorage.setItem(TENANT_KEY, data.tenant.slug);
    }
  }

  function clearSession() {
    state.session = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  function normalizeTenant(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getRouteContext() {
    const params = new URLSearchParams(window.location.search);
    const requestedTenant = normalizeTenant(params.get("tenant"));
    return {
      requestedTenant,
      wantsPublicDemo: params.get("public") === "1" && requestedTenant === PUBLIC_DEMO_TENANT
    };
  }

  function isReadOnlyUser(user) {
    return READ_ONLY_ROLES.has(String((user && user.role) || "").trim().toLowerCase());
  }

  function isReadOnlySession() {
    return isReadOnlyUser(state.session && state.session.user);
  }

  function getLastTenant() {
    try { return localStorage.getItem(TENANT_KEY) || ""; } catch { return ""; }
  }

  async function api(path, options = {}) {
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      options.headers || {}
    );
    const response = await fetch(path, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin"
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!response.ok) {
      if (response.status === 401 && !options.skipAuthRedirect) {
        clearSession();
        window.location.href = "/crm/login";
        return;
      }
      const err = new Error((data && data.error) || "Request failed");
      err.status = response.status;
      throw err;
    }
    return data;
  }

  function formatMoney(amount, currency) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 0
      }).format(amount || 0);
    } catch {
      return `${currency || "USD"} ${amount || 0}`;
    }
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function getTenantConfig() {
    return (state.session && state.session.tenant && state.session.tenant.config) || {};
  }

  function getContactName(contact) {
    if (!contact) return "Unknown contact";
    return [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email || "Unnamed";
  }

  function getContactById(id) {
    return state.contacts.find((contact) => contact.id === id) || null;
  }

  function getDealById(id) {
    return state.deals.find((deal) => deal.id === id) || null;
  }

  function getCustomFieldDefs(kind) {
    const config = getTenantConfig();
    return (config.customFields && config.customFields[kind]) || [];
  }

  function getCustomFieldValue(record, fieldId) {
    return record && record.custom_fields ? record.custom_fields[fieldId] : "";
  }

  function renderCustomFieldInputs(fields, values, disabledAttr) {
    return fields.map((field) => {
      const value = values && values[field.id] ? values[field.id] : "";
      return `<label>${escapeHtml(field.label)}<input data-custom="${escapeAttr(field.id)}" value="${escapeAttr(value)}" ${disabledAttr}/></label>`;
    }).join("");
  }

  function renderDetailSection(title, items) {
    const safeItems = items.filter((item) => item && item.label);
    if (!safeItems.length) return "";
    return `
      <section class="modal-section">
        <h3>${escapeHtml(title)}</h3>
        <div class="detail-grid">
          ${safeItems.map((item) => `
            <div class="detail-card">
              <span class="detail-label">${escapeHtml(item.label)}</span>
              <strong class="detail-value">${escapeHtml(item.value || "-")}</strong>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderActivityFeed(activities, emptyMessage) {
    if (!activities.length) {
      return `
        <section class="modal-section">
          <h3>Recent activity</h3>
          <p class="section-empty">${escapeHtml(emptyMessage)}</p>
        </section>
      `;
    }

    return `
      <section class="modal-section">
        <h3>Recent activity</h3>
        <ul class="timeline compact">
          ${activities.map((activity) => `
            <li>
              <div class="t-head">
                <span>${escapeHtml(activity.type || "note")}</span>
                <span>${escapeHtml(formatDateTime(activity.created_at))}</span>
              </div>
              <div class="t-subject">${escapeHtml(activity.subject || "(no subject)")}</div>
              <div class="t-body">${escapeHtml(activity.body || "")}</div>
            </li>
          `).join("")}
        </ul>
      </section>
    `;
  }

  function renderRelatedDeals(deals, title) {
    if (!deals.length) return "";
    return `
      <section class="modal-section">
        <h3>${escapeHtml(title)}</h3>
        <div class="linked-list">
          ${deals.map((deal) => `
            <button type="button" class="linked-item" data-open-deal-id="${escapeAttr(deal.id)}">
              <span class="linked-main">${escapeHtml(deal.title)}</span>
              <span class="linked-meta">${escapeHtml(formatMoney(deal.amount, deal.currency))} / ${escapeHtml(deal.stage || "-")}</span>
            </button>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderLinkedContact(contact) {
    if (!contact) return "";
    return `
      <section class="modal-section">
        <div class="section-head-inline">
          <h3>Linked contact</h3>
          <button type="button" class="link-btn" data-open-contact-id="${escapeAttr(contact.id)}">Open contact</button>
        </div>
        <div class="detail-grid">
          <div class="detail-card">
            <span class="detail-label">Name</span>
            <strong class="detail-value">${escapeHtml(getContactName(contact))}</strong>
          </div>
          <div class="detail-card">
            <span class="detail-label">Company</span>
            <strong class="detail-value">${escapeHtml(contact.company || "-")}</strong>
          </div>
          <div class="detail-card">
            <span class="detail-label">Phone</span>
            <strong class="detail-value">${escapeHtml(contact.phone || "-")}</strong>
          </div>
          <div class="detail-card">
            <span class="detail-label">Service plan</span>
            <strong class="detail-value">${escapeHtml(getCustomFieldValue(contact, "service_plan") || "-")}</strong>
          </div>
        </div>
      </section>
    `;
  }

  function wireLinkedRecordButtons(modal) {
    modal.querySelectorAll("[data-open-contact-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const contact = getContactById(button.dataset.openContactId);
        if (contact) openContactModal(contact);
      });
    });

    modal.querySelectorAll("[data-open-deal-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const deal = getDealById(button.dataset.openDealId);
        if (deal) openDealModal(deal);
      });
    });
  }

  function applyBranding(config) {
    const branding = (config && config.branding) || {};
    if (branding.accentColor) {
      document.documentElement.style.setProperty("--accent", branding.accentColor);
    }
    const nameEl = document.getElementById("brand-name");
    if (nameEl) nameEl.textContent = branding.productName || "CRM";
    const logo = document.getElementById("brand-logo");
    if (logo && branding.logoUrl) {
      logo.src = branding.logoUrl;
      logo.hidden = false;
    }
    if (branding.productName) {
      document.title = branding.productName;
    }
  }

  // Helper: resolve the tenant slug from URL path or query string.
  // Supports /crm/t/<slug>, ?tenant=<slug>, or localStorage fallback.
  function resolveTenant() {
    const pathMatch = window.location.pathname.match(/^\/crm\/t\/([a-z0-9_-]+)/i);
    if (pathMatch) return pathMatch[1].toLowerCase();
    const params = new URLSearchParams(window.location.search);
    if (params.get("tenant")) return params.get("tenant").toLowerCase();
    const rememberedTenant = getLastTenant();
    return rememberedTenant || PUBLIC_DEMO_TENANT;
  }

  // ---------- Login page ----------

  function initLogin() {
    runSessionMigrationGuard();

    if (getSession()) {
      window.location.href = "/crm";
      return;
    }

    const tenant = resolveTenant();
    const isDemo = (tenant === "demo");
    const magicForm = document.getElementById("magic-form");
    const pwForm = document.getElementById("password-form");
    const demoEntry = document.getElementById("demo-entry");
    const toggle = document.getElementById("toggle-mode");
    const toggleRow = document.getElementById("toggle-row");
    const magicError = document.getElementById("magic-error");
    const magicStatus = document.getElementById("magic-status");
    const pwError = document.getElementById("pw-error");

    document.getElementById("tenant").value = tenant;
    document.getElementById("pw-tenant").value = tenant;

    if (isDemo) {
      // Demo tenant: show one-click entry, hide email form.
      demoEntry.hidden = false;
      magicForm.hidden = true;
      toggleRow.hidden = true;

      document.getElementById("demo-btn").addEventListener("click", async function () {
        var btn = document.getElementById("demo-btn");
        var errEl = document.getElementById("demo-error");
        errEl.hidden = true;
        btn.disabled = true;
        btn.textContent = "Loading demo…";
        try {
          var result = await api("/api/crm/demo-session", {
            method: "POST",
            skipAuthRedirect: true
          });
          setSession(result);
          window.location.href = "/crm";
        } catch (err) {
          // Backend not available — fall back to client-side demo mode.
          startDemoMode();
          window.location.href = "/crm";
        }
      });

      // "I have an account" — switch to magic-link form.
      document.getElementById("demo-has-account").addEventListener("click", function (e) {
        e.preventDefault();
        demoEntry.hidden = true;
        magicForm.hidden = false;
        toggleRow.hidden = false;
      });
    } else {
      // Real tenant: show email form directly.
      magicForm.hidden = false;
    }

    let showingPassword = false;
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      showingPassword = !showingPassword;
      magicForm.hidden = showingPassword;
      pwForm.hidden = !showingPassword;
      toggle.textContent = showingPassword ? "Use email link instead" : "Use password instead";
    });

    // Magic-link form
    magicForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      magicError.hidden = true;
      magicStatus.hidden = true;
      var btn = document.getElementById("magic-btn");
      btn.disabled = true;
      btn.textContent = "Sending…";
      try {
        var fd = new FormData(magicForm);
        var result = await api("/api/crm/magic-link", {
          method: "POST",
          skipAuthRedirect: true,
          body: {
            tenant: fd.get("tenant") || tenant,
            email: fd.get("email")
          }
        });
        if (result && result.link) {
          // Dev mode: Resend not configured, redirect directly.
          window.location.href = result.link;
          return;
        }
        magicStatus.textContent = "Check your email for a sign-in link.";
        magicStatus.hidden = false;
        btn.textContent = "Link sent!";
      } catch (err) {
        magicError.textContent = err.message;
        magicError.hidden = false;
        btn.disabled = false;
        btn.textContent = "Send sign-in link";
      }
    });

    // Password form (fallback)
    pwForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      pwError.hidden = true;
      var fd = new FormData(pwForm);
      try {
        var result = await api("/api/crm/login", {
          method: "POST",
          skipAuthRedirect: true,
          body: {
            tenant: fd.get("tenant") || tenant,
            email: fd.get("email"),
            password: fd.get("password")
          }
        });
        setSession(result);
        window.location.href = "/crm";
      } catch (err) {
        pwError.textContent = err.message;
        pwError.hidden = false;
      }
    });

  }

  // ---------- Auth page (magic link token exchange) ----------

  async function initAuth() {
    var params = new URLSearchParams(window.location.search);
    var token = params.get("token");
    var errorEl = document.getElementById("auth-error");
    var statusEl = document.getElementById("auth-status");

    if (!token) {
      statusEl.textContent = "";
      errorEl.textContent = "No sign-in token found. Please request a new link.";
      errorEl.hidden = false;
      return;
    }

    try {
      var result = await api("/api/crm/magic-verify", {
        method: "POST",
        skipAuthRedirect: true,
        body: { token: token }
      });
      setSession(result);
      window.location.href = "/crm";
    } catch (err) {
      statusEl.textContent = "";
      document.getElementById("auth-title").textContent = "Link expired";
      errorEl.textContent = err.message || "This link is invalid or has expired. Please request a new one.";
      errorEl.hidden = false;
    }
  }

  // ---------- App shell ----------

  var state = {
    session: null,
    contacts: [],
    deals: [],
    activities: []
  };

  function initApp() {
    runSessionMigrationGuard();
    const routeContext = getRouteContext();
    var session = getSession();
    if (!session) {
      window.location.href = "/crm/login";
      return;
    }

    // Restore in-memory demo store if returning to the CRM in demo mode.
    if (session.demo && !demoStore) {
      demoStore = buildDemoData();
    }

    applyBranding(session.tenant && session.tenant.config);
    var label = (session.user.fullName && session.user.fullName.length > 0)
      ? session.user.fullName : session.user.email;
    document.getElementById("user-label").textContent = label;

    // Show "← Home" link only for demo tenant so real customers don't accidentally leave.
    var homeLink = document.getElementById("home-link");
    if (homeLink) {
      homeLink.style.display = (session.tenant && session.tenant.slug === "demo") ? "" : "none";
    }

    document.querySelectorAll(".nav-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { switchView(btn.dataset.view); });
    });

    document.getElementById("logout-btn").addEventListener("click", async function () {
      if (isDemo()) {
        demoStore = null;
      } else {
        try { await api("/api/crm/me", { method: "DELETE" }); } catch (ignored) {}
      }
      clearSession();
      window.location.href = routeContext.wantsPublicDemo ? "/" : "/crm/login";
    });

    document.getElementById("new-contact-btn").addEventListener("click", function () { openContactModal(); });
    document.getElementById("new-deal-btn").addEventListener("click", function () { openDealModal(); });
    document.getElementById("new-activity-btn").addEventListener("click", function () { openActivityModal(); });
    var quickContact = document.getElementById("quick-add-contact");
    var quickDeal = document.getElementById("quick-add-deal");
    var quickActivity = document.getElementById("quick-add-activity");
    if (quickContact) quickContact.addEventListener("click", function () { createQuickSample("contact"); });
    if (quickDeal) quickDeal.addEventListener("click", function () { createQuickSample("deal"); });
    if (quickActivity) quickActivity.addEventListener("click", function () { createQuickSample("activity"); });

    var searchInput = document.getElementById("contact-search");
    var searchTimer;
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { loadContacts(searchInput.value); }, 200);
    });

    loadAll();
  }

  function switchView(view) {
    document.querySelectorAll(".nav-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.view === view);
    });
    document.querySelectorAll(".view").forEach(function (v) {
      v.hidden = v.id !== "view-" + view;
    });
  }

  async function loadAll() {
    try {
      await Promise.all([loadContacts(), loadDeals(), loadActivities()]);
    } catch (err) {
      // 401 already handled by api() — ignore load errors silently.
    }
    renderDashboard();
  }

  async function loadContacts(search) {
    var qs = search ? "?q=" + encodeURIComponent(search) : "";
    var data;
    if (isDemo()) {
      data = mockApi("/api/crm/contacts" + qs);
    } else {
      data = await api("/api/crm/contacts" + qs);
    }
    if (!data) return;
    state.contacts = data.contacts || [];
    renderContacts();
  }

  async function loadDeals() {
    var data;
    if (isDemo()) {
      data = mockApi("/api/crm/deals");
    } else {
      data = await api("/api/crm/deals");
    }
    if (!data) return;
    state.deals = data.deals || [];
    renderPipeline();
  }

  async function loadActivities() {
    var data;
    if (isDemo()) {
      data = mockApi("/api/crm/activities");
    } else {
      data = await api("/api/crm/activities");
    }
    if (!data) return;
    state.activities = data.activities || [];
    renderActivities();
  }

  // ---------- Dashboard ----------

  function renderDashboard() {
    document.getElementById("stat-contacts").textContent = state.contacts.length;
    var openDeals = state.deals.filter(function (d) { return d.stage !== "won" && d.stage !== "lost"; });
    document.getElementById("stat-open").textContent = openDeals.length;
    var total = openDeals.reduce(function (sum, d) { return sum + Number(d.amount || 0); }, 0);
    document.getElementById("stat-value").textContent = formatMoney(total, openDeals[0] && openDeals[0].currency);

    var now = new Date();
    var startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    var wonThisMonth = state.deals.filter(function (d) {
      return d.stage === "won" && new Date(d.updated_at) >= startOfMonth;
    });
    var wonTotal = wonThisMonth.reduce(function (sum, d) { return sum + Number(d.amount || 0); }, 0);
    document.getElementById("stat-won").textContent = formatMoney(wonTotal);

    var recent = state.activities.slice(0, 10);
    var list = document.getElementById("recent-activities");
    var emptyState = document.getElementById("dashboard-empty-state");
    if (emptyState) {
      emptyState.hidden = !(state.contacts.length === 0 && state.activities.length === 0);
    }
    list.innerHTML = "";
    if (recent.length === 0) {
      list.innerHTML = '<li class="empty">No activity yet.</li>';
      return;
    }
    recent.forEach(function (a) { list.appendChild(renderActivityItem(a)); });
  }

  async function createQuickSample(kind) {
    if (isReadOnlySession()) return;
    if (kind === "contact") {
      var contactPayload = {
        first_name: "Demo",
        last_name: "Lead",
        email: "demo.lead@sample.local",
        company: "Sample Company",
        status: "lead"
      };
      if (isDemo()) mockApi("/api/crm/contacts", { method: "POST", body: contactPayload });
      else await api("/api/crm/contacts", { method: "POST", body: contactPayload });
      await loadContacts();
      renderDashboard();
      return;
    }

    if (kind === "deal") {
      var dealPayload = {
        title: "Sample onboarding package",
        contact_id: (state.contacts[0] && state.contacts[0].id) || null,
        stage: "new",
        amount: 2500,
        currency: "USD",
        expected_close_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
      };
      if (isDemo()) mockApi("/api/crm/deals", { method: "POST", body: dealPayload });
      else await api("/api/crm/deals", { method: "POST", body: dealPayload });
      await loadDeals();
      renderDashboard();
      return;
    }

    if (kind === "activity") {
      var activityPayload = {
        type: "note",
        subject: "Sample follow-up logged",
        body: "Customer asked for service package details and timeline options.",
        contact_id: (state.contacts[0] && state.contacts[0].id) || null,
        deal_id: (state.deals[0] && state.deals[0].id) || null
      };
      if (isDemo()) mockApi("/api/crm/activities", { method: "POST", body: activityPayload });
      else await api("/api/crm/activities", { method: "POST", body: activityPayload });
      await loadActivities();
      renderDashboard();
    }
  }

  // ---------- Contacts ----------

  function renderContacts() {
    var tbody = document.getElementById("contacts-tbody");
    tbody.innerHTML = "";
    if (state.contacts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">No contacts yet.</td></tr>';
      return;
    }
    state.contacts.forEach(function (c) {
      var tr = document.createElement("tr");
      var name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "\u2014";
      tr.innerHTML =
        "<td>" + escapeHtml(name) + "</td>" +
        "<td>" + escapeHtml(c.email || "") + "</td>" +
        "<td>" + escapeHtml(c.company || "") + "</td>" +
        '<td><span class="status-pill ' + escapeHtml(c.status || "lead") + '">' + escapeHtml(c.status || "lead") + "</span></td>" +
        '<td><button class="ghost-btn">Edit</button></td>';
      tr.addEventListener("click", function () { openContactModal(c); });
      tbody.appendChild(tr);
    });
  }

  function openContactModal(contact) {
    var config = (state.session.tenant && state.session.tenant.config) || {};
    var statuses = config.contactStatuses || ["lead", "customer", "archived"];
    var customFields = (config.customFields && config.customFields.contact) || [];
    var isEdit = Boolean(contact);
    var c = contact || {};

    openModal(
      "<h2>" + (isEdit ? "Edit contact" : "New contact") + "</h2>" +
      '<label>First name<input name="first_name" value="' + escapeAttr(c.first_name) + '"/></label>' +
      '<label>Last name<input name="last_name" value="' + escapeAttr(c.last_name) + '"/></label>' +
      '<label>Email<input name="email" type="email" value="' + escapeAttr(c.email) + '"/></label>' +
      '<label>Phone<input name="phone" value="' + escapeAttr(c.phone) + '"/></label>' +
      '<label>Company<input name="company" value="' + escapeAttr(c.company) + '"/></label>' +
      '<label>Title<input name="title" value="' + escapeAttr(c.title) + '"/></label>' +
      '<label>Status<select name="status">' + statuses.map(function (s) {
        return '<option value="' + escapeAttr(s) + '"' + (c.status === s ? " selected" : "") + '>' + escapeHtml(s) + "</option>";
      }).join("") + "</select></label>" +
      customFields.map(function (f) {
        var val = (c.custom_fields && c.custom_fields[f.id]) || "";
        return '<label>' + escapeHtml(f.label) + '<input data-custom="' + escapeAttr(f.id) + '" value="' + escapeAttr(val) + '"/></label>';
      }).join("") +
      '<div class="modal-actions">' +
        (isEdit ? '<button type="button" class="ghost-btn danger-btn" data-action="delete">Delete</button>' : "") +
        '<button type="button" class="ghost-btn" data-action="cancel">Cancel</button>' +
        '<button type="button" class="primary-btn" data-action="save">Save</button>' +
      "</div>",
      async function (modal, action) {
        if (action === "cancel") return true;
        if (action === "delete" && isEdit) {
          if (!confirm("Delete this contact? This cannot be undone.")) return false;
          if (isDemo()) {
            mockApi("/api/crm/contacts?id=" + c.id, { method: "DELETE" });
          } else {
            await api("/api/crm/contacts?id=" + c.id, { method: "DELETE" });
          }
          await loadContacts();
          renderDashboard();
          return true;
        }
        if (action === "save") {
          var body = collectForm(modal);
          if (isDemo()) {
            if (isEdit) {
              mockApi("/api/crm/contacts?id=" + c.id, { method: "PATCH", body: body });
            } else {
              mockApi("/api/crm/contacts", { method: "POST", body: body });
            }
          } else {
            if (isEdit) {
              await api("/api/crm/contacts?id=" + c.id, { method: "PATCH", body: body });
            } else {
              await api("/api/crm/contacts", { method: "POST", body: body });
            }
          }
          await loadContacts();
          renderDashboard();
          return true;
        }
      }
    );
  }

  // ---------- Deals ----------

  function renderPipeline() {
    var board = document.getElementById("pipeline-board");
    board.innerHTML = "";
    var config = (state.session.tenant && state.session.tenant.config) || {};
    var stages = (config.pipeline && config.pipeline.stages) || [
      { id: "new", label: "New" },
      { id: "won", label: "Won" },
      { id: "lost", label: "Lost" }
    ];
    stages.forEach(function (stage) {
      var col = document.createElement("div");
      col.className = "pipeline-col";
      var dealsInStage = state.deals.filter(function (d) { return d.stage === stage.id; });
      var total = dealsInStage.reduce(function (sum, d) { return sum + Number(d.amount || 0); }, 0);
      col.innerHTML =
        "<h3><span>" + escapeHtml(stage.label) + "</span><span>" + dealsInStage.length + "</span></h3>" +
        '<div class="stage-total">' + formatMoney(total, dealsInStage[0] && dealsInStage[0].currency) + "</div>";
      dealsInStage.forEach(function (d) {
        var card = document.createElement("div");
        card.className = "deal-card";
        card.innerHTML =
          '<div class="deal-title">' + escapeHtml(d.title) + "</div>" +
          '<div class="deal-amount">' + formatMoney(d.amount, d.currency) + "</div>";
        card.addEventListener("click", function () { openDealModal(d); });
        col.appendChild(card);
      });

      board.appendChild(column);
    });
  }

  function openDealModal(deal) {
    var config = (state.session.tenant && state.session.tenant.config) || {};
    var stages = (config.pipeline && config.pipeline.stages) || [{ id: "new", label: "New" }];
    var isEdit = Boolean(deal);
    var d = deal || {};

    var contactOptions = '<option value="">\u2014</option>' +
      state.contacts.map(function (c) {
        var name = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "Unnamed";
        return '<option value="' + escapeAttr(c.id) + '"' + (d.contact_id === c.id ? " selected" : "") + '>' + escapeHtml(name) + "</option>";
      }).join("");

    openModal(
      "<h2>" + (isEdit ? "Edit deal" : "New deal") + "</h2>" +
      '<label>Title<input name="title" value="' + escapeAttr(d.title) + '" required/></label>' +
      '<label>Contact<select name="contact_id">' + contactOptions + "</select></label>" +
      '<label>Stage<select name="stage">' + stages.map(function (s) {
        return '<option value="' + escapeAttr(s.id) + '"' + (d.stage === s.id ? " selected" : "") + '>' + escapeHtml(s.label) + "</option>";
      }).join("") + "</select></label>" +
      '<label>Amount<input name="amount" type="number" step="0.01" value="' + escapeAttr(d.amount || 0) + '"/></label>' +
      '<label>Currency<input name="currency" value="' + escapeAttr(d.currency || "USD") + '"/></label>' +
      '<label>Expected close<input name="expected_close_date" type="date" value="' + escapeAttr(d.expected_close_date || "") + '"/></label>' +
      (isEdit ?
        '<div class="ai-panel">' +
          '<button type="button" class="primary-btn" data-action="ai-summary">Summarize with AI</button>' +
          '<div class="ai-result" id="ai-result" hidden></div>' +
        '</div>' : "") +
      '<div class="modal-actions">' +
        (isEdit ? '<button type="button" class="ghost-btn danger-btn" data-action="delete">Delete</button>' : "") +
        '<button type="button" class="ghost-btn" data-action="cancel">Cancel</button>' +
        '<button type="button" class="primary-btn" data-action="save">Save</button>' +
      "</div>",
      async function (modal, action) {
        if (action === "cancel") return true;
        if (action === "delete" && isEdit) {
          if (!confirm("Delete this deal? This cannot be undone.")) return false;
          if (isDemo()) {
            mockApi("/api/crm/deals?id=" + d.id, { method: "DELETE" });
          } else {
            await api("/api/crm/deals?id=" + d.id, { method: "DELETE" });
          }
          await loadDeals();
          renderDashboard();
          return true;
        }
        if (action === "ai-summary" && isEdit) {
          var resultEl = modal.querySelector("#ai-result");
          resultEl.hidden = false;
          resultEl.innerHTML = "<em>Asking Claude\u2026</em>";
          try {
            var data;
            if (isDemo()) {
              data = mockApi("/api/crm/ai-summary?deal_id=" + d.id, { method: "POST" });
            } else {
              data = await api("/api/crm/ai-summary?deal_id=" + d.id, { method: "POST" });
            }
            var actions = (data.nextActions || []).map(function (a) { return "<li>" + escapeHtml(a) + "</li>"; }).join("");
            var stub = data.stub ? '<div class="ai-stub-warning">Demo mode \u2014 connect the Anthropic API for live AI insights.</div>' : "";
            resultEl.innerHTML =
              stub +
              '<div class="ai-summary-text">' + escapeHtml(data.summary || "(no summary)") + "</div>" +
              '<div class="ai-risk">Risk score: <strong>' + (data.riskScore || 0) + "</strong>/100</div>" +
              '<div class="ai-actions-label">Suggested next actions</div>' +
              '<ul class="ai-actions">' + actions + "</ul>";
          } catch (err) {
            resultEl.innerHTML = '<div class="ai-error">' + escapeHtml(err.message) + "</div>";
          }
          return false;
        }
        if (action === "save") {
          var body = collectForm(modal);
          if (isDemo()) {
            if (isEdit) {
              mockApi("/api/crm/deals?id=" + d.id, { method: "PATCH", body: body });
            } else {
              mockApi("/api/crm/deals", { method: "POST", body: body });
            }
          } else {
            if (isEdit) {
              await api("/api/crm/deals?id=" + d.id, { method: "PATCH", body: body });
            } else {
              await api("/api/crm/deals", { method: "POST", body: body });
            }
          }
          await loadDeals();
          renderDashboard();
          return true;
        }
      }
    );
  }

  // ---------- Activities ----------

  function renderActivities() {
    var list = document.getElementById("activities-list");
    list.innerHTML = "";
    if (state.activities.length === 0) {
      list.innerHTML = '<li class="empty">No activities logged yet.</li>';
      return;
    }
    state.activities.forEach(function (a) { list.appendChild(renderActivityItem(a)); });
  }

  function renderActivityItem(a) {
    var li = document.createElement("li");
    var when = new Date(a.created_at).toLocaleString();
    li.innerHTML =
      '<div class="t-head"><span>' + escapeHtml(a.type || "note") + "</span><span>" + escapeHtml(when) + "</span></div>" +
      '<div class="t-subject">' + escapeHtml(a.subject || "(no subject)") + "</div>" +
      '<div class="t-body">' + escapeHtml(a.body || "") + "</div>";
    return li;
  }

  function openActivityModal() {
    var contactOptions = '<option value="">\u2014</option>' +
      state.contacts.map(function (c) {
        var name = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "Unnamed";
        return '<option value="' + escapeAttr(c.id) + '">' + escapeHtml(name) + "</option>";
      }).join("");

    var dealOptions = '<option value="">\u2014</option>' +
      state.deals.map(function (d) {
        return '<option value="' + escapeAttr(d.id) + '">' + escapeHtml(d.title) + "</option>";
      }).join("");

    openModal(
      "<h2>Log activity</h2>" +
      '<label>Type<select name="type">' +
        '<option value="note">Note</option><option value="call">Call</option>' +
        '<option value="email">Email</option><option value="meeting">Meeting</option>' +
        '<option value="task">Task</option></select></label>' +
      '<label>Contact<select name="contact_id">' + contactOptions + "</select></label>" +
      '<label>Deal<select name="deal_id">' + dealOptions + "</select></label>" +
      '<label>Subject<input name="subject"/></label>' +
      '<label>Details<textarea name="body" rows="4"></textarea></label>' +
      '<div class="modal-actions">' +
        '<button type="button" class="ghost-btn" data-action="cancel">Cancel</button>' +
        '<button type="button" class="primary-btn" data-action="save">Save</button>' +
      "</div>",
      async function (modal, action) {
        if (action === "cancel") return true;
        if (action === "save") {
          var body = collectForm(modal);
          if (isDemo()) {
            mockApi("/api/crm/activities", { method: "POST", body: body });
          } else {
            await api("/api/crm/activities", { method: "POST", body: body });
          }
          await loadActivities();
          renderDashboard();
          return true;
        }
      }
    );
  }

  // ---------- Modal helpers ----------

  function openModal(html, onAction) {
    var root = document.getElementById("modal-root");
    root.hidden = false;
    root.innerHTML = '<div class="modal" role="dialog">' + html + "</div>";
    var modal = root.querySelector(".modal");

    // Close on backdrop click.
    root.addEventListener("click", function handler(e) {
      if (e.target === root) {
        closeModal();
        root.removeEventListener("click", handler);
      }
    });

    // Close on Escape.
    function escHandler(e) {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", escHandler);
      }
    }
    document.addEventListener("keydown", escHandler);

    // Focus first input.
    var firstInput = modal.querySelector("input, select, textarea");
    if (firstInput) firstInput.focus();

    modal.querySelectorAll("[data-action]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        try {
          var done = await onAction(modal, btn.dataset.action);
          if (done) closeModal();
        } catch (err) {
          var errDiv = modal.querySelector(".modal-error");
          if (!errDiv) {
            errDiv = document.createElement("p");
            errDiv.className = "modal-error auth-error";
            modal.appendChild(errDiv);
          }
          errDiv.textContent = err.message;
        }
      });
    });

    wireLinkedRecordButtons(modal);
  }

  function closeModal() {
    var root = document.getElementById("modal-root");
    root.hidden = true;
    root.innerHTML = "";
  }

  function collectForm(modal) {
    var result = {};
    var custom = {};
    modal.querySelectorAll("input[name], select[name], textarea[name]").forEach(function (el) {
      if (el.type === "number") {
        result[el.name] = el.value === "" ? null : Number(el.value);
      } else {
        result[element.name] = element.value;
      }
    });
    modal.querySelectorAll("[data-custom]").forEach(function (el) {
      custom[el.dataset.custom] = el.value;
    });
    if (Object.keys(custom).length) result.custom_fields = custom;
    return result;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  window.CRM = { initLogin: initLogin, initAuth: initAuth, initApp: initApp };
})();
