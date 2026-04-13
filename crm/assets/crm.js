// Rocket Sloth CRM frontend.
// Single global `CRM` object exposing initLogin() and initApp().
// Reads the tenant config object (stored alongside the session) to
// drive branding, pipeline stages, and contact statuses per customer.

(function () {
  const STORAGE_KEY = "rs_crm_session";
  const MIGRATION_FLAG_KEY = "rs_crm_cookie_auth_migrated_v1";
  const PUBLIC_DEMO_TENANT = "demo";
  const READ_ONLY_ROLES = new Set(["viewer", "demo_viewer"]);
  const state = {
    session: null,
    contacts: [],
    deals: [],
    activities: []
  };

  function runSessionMigrationGuard() {
    try {
      if (!localStorage.getItem(MIGRATION_FLAG_KEY)) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(MIGRATION_FLAG_KEY, "1");
      }
    } catch {}
  }

  function getSession() {
    return state.session;
  }

  function setSession(data) {
    state.session = data || null;
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
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.toLowerCase().includes("application/json");
    let data = text;
    if (text && isJson) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    } else if (!text) {
      data = null;
    }
    if (!response.ok) {
      const fallbackMessage = `Request failed (HTTP ${response.status})`;
      const err = new Error((data && data.error) || fallbackMessage);
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

  async function createPublicDemoSession() {
    return api("/api/crm/demo-access", {
      method: "POST",
      body: { tenant: PUBLIC_DEMO_TENANT }
    });
  }

  function applyReadOnlyUi(session) {
    const readOnly = isReadOnlyUser(session && session.user);
    document.body.classList.toggle("is-read-only", readOnly);

    const banner = document.getElementById("read-only-banner");
    if (banner) banner.hidden = !readOnly;

    const newContactBtn = document.getElementById("new-contact-btn");
    if (newContactBtn) newContactBtn.hidden = readOnly;

    const newDealBtn = document.getElementById("new-deal-btn");
    if (newDealBtn) newDealBtn.hidden = readOnly;

    const newActivityBtn = document.getElementById("new-activity-btn");
    if (newActivityBtn) newActivityBtn.hidden = readOnly;

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) logoutBtn.textContent = readOnly ? "Exit demo" : "Sign out";
  }

  // ---------- Login page ----------

  function initLogin() {
    runSessionMigrationGuard();
    const form = document.getElementById("login-form");
    const errorEl = document.getElementById("auth-error");
    const params = new URLSearchParams(window.location.search);
    const tenantInput = document.getElementById("tenant");
    const demoButton = document.getElementById("demo-access-btn");
    const demoHref = `/crm?tenant=${encodeURIComponent(PUBLIC_DEMO_TENANT)}&public=1`;

    if (params.get("tenant")) tenantInput.value = params.get("tenant");

    api("/api/crm/me")
      .then(() => { window.location.href = "/crm"; })
      .catch(() => {});

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.hidden = true;
      const data = new FormData(form);
      try {
        const result = await api("/api/crm/login", {
          method: "POST",
          body: {
            tenant: data.get("tenant"),
            email: data.get("email"),
            password: data.get("password")
          }
        });
        setSession(result);
        window.location.href = "/crm";
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
      }
    });

    if (demoButton) {
      demoButton.addEventListener("click", async () => {
        errorEl.hidden = true;
        demoButton.disabled = true;
        try {
          await createPublicDemoSession();
          window.location.href = demoHref;
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.hidden = false;
          demoButton.disabled = false;
        }
      });
    }
  }

  // ---------- App shell ----------

  async function initApp() {
    runSessionMigrationGuard();
    const routeContext = getRouteContext();
    let session = getSession();

    if (routeContext.wantsPublicDemo) {
      try {
        session = await api("/api/crm/me");
      } catch {}

      if (
        !session ||
        normalizeTenant(session.tenant && session.tenant.slug) !== PUBLIC_DEMO_TENANT ||
        !isReadOnlyUser(session.user)
      ) {
        try {
          session = await createPublicDemoSession();
        } catch {
          session = null;
        }
      }
    } else if (!session) {
      try {
        session = await api("/api/crm/me");
      } catch {}
    }

    if (!session || !session.user || !session.tenant) {
      clearSession();
      const tenantQs = routeContext.requestedTenant ? `?tenant=${encodeURIComponent(routeContext.requestedTenant)}` : "";
      window.location.href = `/crm/login${tenantQs}`;
      return;
    }

    setSession(session);
    applyBranding(session.tenant && session.tenant.config);
    applyReadOnlyUi(session);

    const userLabel = document.getElementById("user-label");
    if (userLabel) {
      userLabel.textContent = isReadOnlyUser(session.user)
        ? "Viewing public demo"
        : (session.user.fullName || session.user.email);
    }

    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });

    document.getElementById("logout-btn").addEventListener("click", async () => {
      try { await api("/api/crm/me", { method: "DELETE" }); } catch {}
      clearSession();
      window.location.href = routeContext.wantsPublicDemo ? "/" : "/crm/login";
    });

    const newContactBtn = document.getElementById("new-contact-btn");
    if (newContactBtn) newContactBtn.addEventListener("click", () => openContactModal());

    const newDealBtn = document.getElementById("new-deal-btn");
    if (newDealBtn) newDealBtn.addEventListener("click", () => openDealModal());

    const newActivityBtn = document.getElementById("new-activity-btn");
    if (newActivityBtn) newActivityBtn.addEventListener("click", () => openActivityModal());

    const searchInput = document.getElementById("contact-search");
    let searchTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => loadContacts(searchInput.value), 200);
    });

    loadAll();
  }

  function switchView(view) {
    document.querySelectorAll(".nav-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === view);
    });
    document.querySelectorAll(".view").forEach((panel) => {
      panel.hidden = panel.id !== `view-${view}`;
    });
  }

  async function loadAll() {
    await Promise.all([loadContacts(), loadDeals(), loadActivities()]);
    renderDashboard();
  }

  async function loadContacts(search) {
    const qs = search ? `?q=${encodeURIComponent(search)}` : "";
    const data = await api(`/api/crm/contacts${qs}`);
    state.contacts = data.contacts || [];
    renderContacts();
  }

  async function loadDeals() {
    const data = await api("/api/crm/deals");
    state.deals = data.deals || [];
    renderPipeline();
  }

  async function loadActivities() {
    const data = await api("/api/crm/activities");
    state.activities = data.activities || [];
    renderActivities();
  }

  // ---------- Dashboard ----------

  function renderDashboard() {
    document.getElementById("stat-contacts").textContent = state.contacts.length;
    const openDeals = state.deals.filter((deal) => deal.stage !== "won" && deal.stage !== "lost");
    document.getElementById("stat-open").textContent = openDeals.length;
    const total = openDeals.reduce((sum, deal) => sum + Number(deal.amount || 0), 0);
    document.getElementById("stat-value").textContent = formatMoney(total, openDeals[0] && openDeals[0].currency);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const wonThisMonth = state.deals.filter(
      (deal) => deal.stage === "won" && new Date(deal.updated_at) >= startOfMonth
    );
    const wonTotal = wonThisMonth.reduce((sum, deal) => sum + Number(deal.amount || 0), 0);
    document.getElementById("stat-won").textContent = formatMoney(wonTotal);

    const recent = state.activities
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    const list = document.getElementById("recent-activities");
    list.innerHTML = "";
    if (recent.length === 0) {
      list.innerHTML = '<li class="empty">No activity yet.</li>';
      return;
    }
    recent.forEach((activity) => list.appendChild(renderActivityItem(activity)));
  }

  // ---------- Contacts ----------

  function renderContacts() {
    const tbody = document.getElementById("contacts-tbody");
    const readOnly = isReadOnlySession();
    tbody.innerHTML = "";
    if (state.contacts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">No contacts yet.</td></tr>';
      return;
    }

    state.contacts.forEach((contact) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(getContactName(contact))}</td>
        <td>${escapeHtml(contact.email || "")}</td>
        <td>${escapeHtml(contact.company || "")}</td>
        <td><span class="status-pill ${escapeHtml(contact.status || "lead")}">${escapeHtml(contact.status || "lead")}</span></td>
        <td><button class="ghost-btn">${readOnly ? "View" : "Edit"}</button></td>
      `;
      tr.addEventListener("click", () => openContactModal(contact));
      tbody.appendChild(tr);
    });
  }

  function openContactModal(contact) {
    const statuses = getTenantConfig().contactStatuses || ["lead", "customer", "archived"];
    const customFields = getCustomFieldDefs("contact");
    const isEdit = Boolean(contact);
    const readOnly = isReadOnlySession();
    const current = contact || {};

    if (readOnly && !isEdit) return;

    const disabledAttr = readOnly ? "disabled" : "";
    const relatedDeals = state.deals
      .filter((deal) => deal.contact_id === current.id)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 5);
    const relatedActivities = state.activities
      .filter((activity) => activity.contact_id === current.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
    const contactDetails = isEdit ? renderDetailSection("Service snapshot", [
      { label: "Phone", value: current.phone || "-" },
      { label: "Address", value: getCustomFieldValue(current, "service_address") || "-" },
      { label: "Pool type", value: getCustomFieldValue(current, "pool_type") || "-" },
      { label: "Route day", value: getCustomFieldValue(current, "route_day") || "-" },
      { label: "Service plan", value: getCustomFieldValue(current, "service_plan") || "-" }
    ]) : "";

    openModal(`
      <h2>${readOnly ? "Contact details" : isEdit ? "Edit contact" : "New contact"}</h2>
      ${readOnly ? '<div class="readonly-note">Public demo mode is view-only.</div>' : ""}
      <label>First name<input name="first_name" value="${escapeAttr(current.first_name)}" ${disabledAttr}/></label>
      <label>Last name<input name="last_name" value="${escapeAttr(current.last_name)}" ${disabledAttr}/></label>
      <label>Email<input name="email" type="email" value="${escapeAttr(current.email)}" ${disabledAttr}/></label>
      <label>Phone<input name="phone" value="${escapeAttr(current.phone)}" ${disabledAttr}/></label>
      <label>Company<input name="company" value="${escapeAttr(current.company)}" ${disabledAttr}/></label>
      <label>Title<input name="title" value="${escapeAttr(current.title)}" ${disabledAttr}/></label>
      <label>Status<select name="status" ${disabledAttr}>${statuses
        .map((status) => `<option value="${escapeAttr(status)}" ${(current.status || "lead") === status ? "selected" : ""}>${escapeHtml(status)}</option>`)
        .join("")}</select></label>
      ${renderCustomFieldInputs(customFields, current.custom_fields || {}, disabledAttr)}
      ${contactDetails}
      ${isEdit ? renderRelatedDeals(relatedDeals, "Linked jobs") : ""}
      ${isEdit ? renderActivityFeed(relatedActivities, "No activity logged for this contact yet.") : ""}
      <div class="modal-actions">
        ${readOnly
          ? '<button type="button" class="ghost-btn" data-action="cancel">Close</button>'
          : `${isEdit ? '<button type="button" class="ghost-btn" data-action="delete">Delete</button>' : ""}
        <button type="button" class="ghost-btn" data-action="cancel">Cancel</button>
        <button type="button" class="primary-btn" data-action="save">Save</button>`}
      </div>
    `, async (modal, action) => {
      if (action === "cancel") return true;
      if (readOnly) return true;
      if (action === "delete" && isEdit) {
        await api(`/api/crm/contacts?id=${current.id}`, { method: "DELETE" });
        await loadContacts();
        renderDashboard();
        return true;
      }
      if (action === "save") {
        const body = collectForm(modal);
        if (isEdit) {
          await api(`/api/crm/contacts?id=${current.id}`, { method: "PATCH", body });
        } else {
          await api("/api/crm/contacts", { method: "POST", body });
        }
        await loadContacts();
        renderDashboard();
        return true;
      }
    });
  }

  // ---------- Deals ----------

  function renderPipeline() {
    const board = document.getElementById("pipeline-board");
    board.innerHTML = "";
    const config = getTenantConfig();
    const stages = (config.pipeline && config.pipeline.stages) || [
      { id: "new", label: "New" },
      { id: "won", label: "Won" },
      { id: "lost", label: "Lost" }
    ];

    stages.forEach((stage) => {
      const column = document.createElement("div");
      column.className = "pipeline-col";
      const dealsInStage = state.deals.filter((deal) => deal.stage === stage.id);
      const total = dealsInStage.reduce((sum, deal) => sum + Number(deal.amount || 0), 0);
      column.innerHTML = `<h3><span>${escapeHtml(stage.label)}</span><span>${dealsInStage.length}</span></h3>
        <div class="stage-total">${formatMoney(total, dealsInStage[0] && dealsInStage[0].currency)}</div>`;

      dealsInStage.forEach((deal) => {
        const linkedContact = getContactById(deal.contact_id);
        const metaBits = [];
        const serviceType = getCustomFieldValue(deal, "service_type");
        if (serviceType) metaBits.push(serviceType);
        if (linkedContact) metaBits.push(getContactName(linkedContact));
        if (deal.expected_close_date) metaBits.push(`Closes ${formatDate(deal.expected_close_date)}`);

        const card = document.createElement("div");
        card.className = "deal-card";
        card.innerHTML = `<div class="deal-title">${escapeHtml(deal.title)}</div>
          <div class="deal-meta">${escapeHtml(metaBits.join(" / ") || "Open deal")}</div>
          <div class="deal-amount">${formatMoney(deal.amount, deal.currency)}</div>`;
        card.addEventListener("click", () => openDealModal(deal));
        column.appendChild(card);
      });

      board.appendChild(column);
    });
  }

  function openDealModal(deal) {
    const config = getTenantConfig();
    const stages = (config.pipeline && config.pipeline.stages) || [{ id: "new", label: "New" }];
    const customFields = getCustomFieldDefs("deal");
    const isEdit = Boolean(deal);
    const readOnly = isReadOnlySession();
    const current = deal || {};
    const linkedContact = getContactById(current.contact_id);

    if (readOnly && !isEdit) return;

    const contactOptions = ['<option value="">-</option>']
      .concat(
        state.contacts.map((contact) => {
          return `<option value="${escapeAttr(contact.id)}" ${current.contact_id === contact.id ? "selected" : ""}>${escapeHtml(getContactName(contact))}</option>`;
        })
      )
      .join("");

    const disabledAttr = readOnly ? "disabled" : "";
    const dealActivities = state.activities
      .filter((activity) => activity.deal_id === current.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 6);
    const dealDetails = isEdit ? renderDetailSection("Job snapshot", [
      { label: "Expected close", value: current.expected_close_date ? formatDate(current.expected_close_date) : "-" },
      { label: "Service type", value: getCustomFieldValue(current, "service_type") || "-" },
      { label: "Volume", value: getCustomFieldValue(current, "volume_gallons") || "-" },
      { label: "Assigned tech", value: getCustomFieldValue(current, "technician") || "-" },
      { label: "Equipment", value: getCustomFieldValue(current, "equipment") || "-" }
    ]) : "";

    openModal(`
      <h2>${readOnly ? "Deal details" : isEdit ? "Edit deal" : "New deal"}</h2>
      ${readOnly ? '<div class="readonly-note">Public demo mode is view-only.</div>' : ""}
      <label>Title<input name="title" value="${escapeAttr(current.title)}" required ${disabledAttr}/></label>
      <label>Contact<select name="contact_id" ${disabledAttr}>${contactOptions}</select></label>
      <label>Stage<select name="stage" ${disabledAttr}>${stages
        .map((stage) => `<option value="${escapeAttr(stage.id)}" ${(current.stage || stages[0].id) === stage.id ? "selected" : ""}>${escapeHtml(stage.label)}</option>`)
        .join("")}</select></label>
      <label>Amount<input name="amount" type="number" step="0.01" value="${escapeAttr(current.amount || 0)}" ${disabledAttr}/></label>
      <label>Currency<input name="currency" value="${escapeAttr(current.currency || "USD")}" ${disabledAttr}/></label>
      <label>Expected close<input name="expected_close_date" type="date" value="${escapeAttr(current.expected_close_date || "")}" ${disabledAttr}/></label>
      ${renderCustomFieldInputs(customFields, current.custom_fields || {}, disabledAttr)}
      ${dealDetails}
      ${isEdit ? renderLinkedContact(linkedContact) : ""}
      ${isEdit ? renderActivityFeed(dealActivities, "No activity logged for this job yet.") : ""}
      ${isEdit ? `
        <div class="ai-panel">
          <button type="button" class="primary-btn" data-action="ai-summary">Summarize with AI</button>
          <div class="ai-result" id="ai-result" hidden></div>
        </div>
      ` : ""}
      <div class="modal-actions">
        ${readOnly
          ? '<button type="button" class="ghost-btn" data-action="cancel">Close</button>'
          : `${isEdit ? '<button type="button" class="ghost-btn" data-action="delete">Delete</button>' : ""}
        <button type="button" class="ghost-btn" data-action="cancel">Cancel</button>
        <button type="button" class="primary-btn" data-action="save">Save</button>`}
      </div>
    `, async (modal, action) => {
      if (action === "cancel") return true;
      if (action === "ai-summary" && isEdit) {
        const result = modal.querySelector("#ai-result");
        result.hidden = false;
        result.innerHTML = "<em>Generating summary...</em>";
        try {
          const data = await api(`/api/crm/ai-summary?deal_id=${current.id}`, { method: "POST" });
          const actions = (data.nextActions || []).map((entry) => `<li>${escapeHtml(entry)}</li>`).join("");
          const stub = data.stub ? '<div class="ai-stub-warning">Demo mode: set ANTHROPIC_API_KEY for live AI.</div>' : "";
          result.innerHTML = `
            ${stub}
            <div class="ai-summary-text">${escapeHtml(data.summary || "(no summary)")}</div>
            <div class="ai-risk">Risk score: <strong>${data.riskScore || 0}</strong>/100</div>
            <div class="ai-actions-label">Suggested next actions</div>
            <ul class="ai-actions">${actions}</ul>
          `;
        } catch (err) {
          result.innerHTML = `<div class="ai-error">${escapeHtml(err.message)}</div>`;
        }
        return false;
      }
      if (readOnly) return true;
      if (action === "delete" && isEdit) {
        await api(`/api/crm/deals?id=${current.id}`, { method: "DELETE" });
        await loadDeals();
        renderDashboard();
        return true;
      }
      if (action === "save") {
        const body = collectForm(modal);
        if (isEdit) {
          await api(`/api/crm/deals?id=${current.id}`, { method: "PATCH", body });
        } else {
          await api("/api/crm/deals", { method: "POST", body });
        }
        await loadDeals();
        renderDashboard();
        return true;
      }
    });
  }

  // ---------- Activities ----------

  function renderActivities() {
    const list = document.getElementById("activities-list");
    list.innerHTML = "";
    if (state.activities.length === 0) {
      list.innerHTML = '<li class="empty">No activities logged yet.</li>';
      return;
    }

    state.activities
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .forEach((activity) => list.appendChild(renderActivityItem(activity)));
  }

  function renderActivityItem(activity) {
    const li = document.createElement("li");
    const contact = getContactById(activity.contact_id);
    const deal = getDealById(activity.deal_id);
    const meta = [contact ? getContactName(contact) : "", deal ? deal.title : ""].filter(Boolean).join(" / ");
    li.innerHTML = `
      <div class="t-head"><span>${escapeHtml(activity.type || "note")}</span><span>${escapeHtml(formatDateTime(activity.created_at))}</span></div>
      <div class="t-subject">${escapeHtml(activity.subject || "(no subject)")}</div>
      ${meta ? `<div class="t-meta">${escapeHtml(meta)}</div>` : ""}
      <div class="t-body">${escapeHtml(activity.body || "")}</div>
    `;
    return li;
  }

  function openActivityModal() {
    if (isReadOnlySession()) return;

    const contactOptions = ['<option value="">-</option>']
      .concat(
        state.contacts.map((contact) => {
          return `<option value="${escapeAttr(contact.id)}">${escapeHtml(getContactName(contact))}</option>`;
        })
      )
      .join("");

    const dealOptions = ['<option value="">-</option>']
      .concat(
        state.deals.map((deal) => `<option value="${escapeAttr(deal.id)}">${escapeHtml(deal.title)}</option>`)
      )
      .join("");

    openModal(`
      <h2>Log activity</h2>
      <label>Type<select name="type">
        <option value="note">Note</option>
        <option value="call">Call</option>
        <option value="email">Email</option>
        <option value="meeting">Meeting</option>
        <option value="task">Task</option>
      </select></label>
      <label>Contact<select name="contact_id">${contactOptions}</select></label>
      <label>Deal<select name="deal_id">${dealOptions}</select></label>
      <label>Subject<input name="subject"/></label>
      <label>Details<textarea name="body" rows="4"></textarea></label>
      <div class="modal-actions">
        <button type="button" class="ghost-btn" data-action="cancel">Cancel</button>
        <button type="button" class="primary-btn" data-action="save">Save</button>
      </div>
    `, async (modal, action) => {
      if (action === "cancel") return true;
      if (action === "save") {
        const body = collectForm(modal);
        await api("/api/crm/activities", { method: "POST", body });
        await loadActivities();
        renderDashboard();
        return true;
      }
    });
  }

  // ---------- Modal helpers ----------

  function openModal(html, onAction) {
    const root = document.getElementById("modal-root");
    root.hidden = false;
    root.innerHTML = `<div class="modal">${html}</div>`;
    const modal = root.querySelector(".modal");

    modal.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          const done = await onAction(modal, button.dataset.action);
          if (done) closeModal();
        } catch (err) {
          alert(err.message);
        }
      });
    });

    wireLinkedRecordButtons(modal);
  }

  function closeModal() {
    const root = document.getElementById("modal-root");
    root.hidden = true;
    root.innerHTML = "";
  }

  function collectForm(modal) {
    const result = {};
    const custom = {};
    modal.querySelectorAll("input[name], select[name], textarea[name]").forEach((element) => {
      if (element.type === "number") {
        result[element.name] = element.value === "" ? null : Number(element.value);
      } else {
        result[element.name] = element.value;
      }
    });
    modal.querySelectorAll("[data-custom]").forEach((element) => {
      custom[element.dataset.custom] = element.value;
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

  window.CRM = { initLogin, initApp };
})();
