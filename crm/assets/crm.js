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
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    document.querySelectorAll(".view").forEach((v) => v.hidden = v.id !== `view-${view}`);
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
    const openDeals = state.deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
    document.getElementById("stat-open").textContent = openDeals.length;
    const total = openDeals.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    document.getElementById("stat-value").textContent = formatMoney(total, openDeals[0] && openDeals[0].currency);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const wonThisMonth = state.deals.filter(
      (d) => d.stage === "won" && new Date(d.updated_at) >= startOfMonth
    );
    const wonTotal = wonThisMonth.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    document.getElementById("stat-won").textContent = formatMoney(wonTotal);

    const recent = state.activities.slice(0, 10);
    const list = document.getElementById("recent-activities");
    list.innerHTML = "";
    if (recent.length === 0) {
      list.innerHTML = '<li class="empty">No activity yet.</li>';
      return;
    }
    recent.forEach((a) => list.appendChild(renderActivityItem(a)));
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
    state.contacts.forEach((c) => {
      const tr = document.createElement("tr");
      const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "-";
      tr.innerHTML = `
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(c.email || "")}</td>
        <td>${escapeHtml(c.company || "")}</td>
        <td><span class="status-pill ${escapeHtml(c.status || "lead")}">${escapeHtml(c.status || "lead")}</span></td>
        <td><button class="ghost-btn">${readOnly ? "View" : "Edit"}</button></td>
      `;
      tr.addEventListener("click", () => openContactModal(c));
      tbody.appendChild(tr);
    });
  }

  function openContactModal(contact) {
    const config = (state.session.tenant && state.session.tenant.config) || {};
    const statuses = config.contactStatuses || ["lead", "customer", "archived"];
    const customFields = (config.customFields && config.customFields.contact) || [];
    const isEdit = Boolean(contact);
    const readOnly = isReadOnlySession();
    const c = contact || {};

    if (readOnly && !isEdit) {
      return;
    }

    const disabledAttr = readOnly ? "disabled" : "";

    openModal(`
      <h2>${readOnly ? "Contact details" : isEdit ? "Edit contact" : "New contact"}</h2>
      ${readOnly ? '<div class="readonly-note">Public demo mode is view-only.</div>' : ""}
      <label>First name<input name="first_name" value="${escapeAttr(c.first_name)}" ${disabledAttr}/></label>
      <label>Last name<input name="last_name" value="${escapeAttr(c.last_name)}" ${disabledAttr}/></label>
      <label>Email<input name="email" type="email" value="${escapeAttr(c.email)}" ${disabledAttr}/></label>
      <label>Phone<input name="phone" value="${escapeAttr(c.phone)}" ${disabledAttr}/></label>
      <label>Company<input name="company" value="${escapeAttr(c.company)}" ${disabledAttr}/></label>
      <label>Title<input name="title" value="${escapeAttr(c.title)}" ${disabledAttr}/></label>
      <label>Status<select name="status" ${disabledAttr}>${statuses
        .map((s) => `<option value="${escapeAttr(s)}" ${(c.status || "lead") === s ? "selected" : ""}>${escapeHtml(s)}</option>`)
        .join("")}</select></label>
      ${customFields
        .map((f) => {
          const val = (c.custom_fields && c.custom_fields[f.id]) || "";
          return `<label>${escapeHtml(f.label)}<input data-custom="${escapeAttr(f.id)}" value="${escapeAttr(val)}" ${disabledAttr}/></label>`;
        })
        .join("")}
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
        await api(`/api/crm/contacts?id=${c.id}`, { method: "DELETE" });
        await loadContacts();
        renderDashboard();
        return true;
      }
      if (action === "save") {
        const body = collectForm(modal);
        if (isEdit) {
          await api(`/api/crm/contacts?id=${c.id}`, { method: "PATCH", body });
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
    const config = (state.session.tenant && state.session.tenant.config) || {};
    const stages = (config.pipeline && config.pipeline.stages) || [
      { id: "new", label: "New" },
      { id: "won", label: "Won" },
      { id: "lost", label: "Lost" }
    ];
    stages.forEach((stage) => {
      const col = document.createElement("div");
      col.className = "pipeline-col";
      const dealsInStage = state.deals.filter((d) => d.stage === stage.id);
      const total = dealsInStage.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      col.innerHTML = `<h3><span>${escapeHtml(stage.label)}</span><span>${dealsInStage.length}</span></h3>
        <div class="stage-total">${formatMoney(total, dealsInStage[0] && dealsInStage[0].currency)}</div>`;
      dealsInStage.forEach((d) => {
        const card = document.createElement("div");
        card.className = "deal-card";
        card.innerHTML = `<div class="deal-title">${escapeHtml(d.title)}</div>
          <div class="deal-amount">${formatMoney(d.amount, d.currency)}</div>`;
        card.addEventListener("click", () => openDealModal(d));
        col.appendChild(card);
      });
      board.appendChild(col);
    });
  }

  function openDealModal(deal) {
    const config = (state.session.tenant && state.session.tenant.config) || {};
    const stages = (config.pipeline && config.pipeline.stages) || [{ id: "new", label: "New" }];
    const isEdit = Boolean(deal);
    const readOnly = isReadOnlySession();
    const d = deal || {};

    if (readOnly && !isEdit) {
      return;
    }

    const contactOptions = ['<option value="">-</option>']
      .concat(
        state.contacts.map((c) => {
          const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "Unnamed";
          return `<option value="${escapeAttr(c.id)}" ${d.contact_id === c.id ? "selected" : ""}>${escapeHtml(name)}</option>`;
        })
      )
      .join("");

    const disabledAttr = readOnly ? "disabled" : "";

    openModal(`
      <h2>${readOnly ? "Deal details" : isEdit ? "Edit deal" : "New deal"}</h2>
      ${readOnly ? '<div class="readonly-note">Public demo mode is view-only.</div>' : ""}
      <label>Title<input name="title" value="${escapeAttr(d.title)}" required ${disabledAttr}/></label>
      <label>Contact<select name="contact_id" ${disabledAttr}>${contactOptions}</select></label>
      <label>Stage<select name="stage" ${disabledAttr}>${stages
        .map((s) => `<option value="${escapeAttr(s.id)}" ${(d.stage || stages[0].id) === s.id ? "selected" : ""}>${escapeHtml(s.label)}</option>`)
        .join("")}</select></label>
      <label>Amount<input name="amount" type="number" step="0.01" value="${escapeAttr(d.amount || 0)}" ${disabledAttr}/></label>
      <label>Currency<input name="currency" value="${escapeAttr(d.currency || "USD")}" ${disabledAttr}/></label>
      <label>Expected close<input name="expected_close_date" type="date" value="${escapeAttr(d.expected_close_date || "")}" ${disabledAttr}/></label>
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
          const data = await api(`/api/crm/ai-summary?deal_id=${d.id}`, { method: "POST" });
          const actions = (data.nextActions || []).map((a) => `<li>${escapeHtml(a)}</li>`).join("");
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
        await api(`/api/crm/deals?id=${d.id}`, { method: "DELETE" });
        await loadDeals();
        renderDashboard();
        return true;
      }
      if (action === "save") {
        const body = collectForm(modal);
        if (isEdit) {
          await api(`/api/crm/deals?id=${d.id}`, { method: "PATCH", body });
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
    state.activities.forEach((a) => list.appendChild(renderActivityItem(a)));
  }

  function renderActivityItem(a) {
    const li = document.createElement("li");
    const when = new Date(a.created_at).toLocaleString();
    li.innerHTML = `
      <div class="t-head"><span>${escapeHtml(a.type || "note")}</span><span>${escapeHtml(when)}</span></div>
      <div class="t-subject">${escapeHtml(a.subject || "(no subject)")}</div>
      <div class="t-body">${escapeHtml(a.body || "")}</div>
    `;
    return li;
  }

  function openActivityModal() {
    if (isReadOnlySession()) {
      return;
    }

    const contactOptions = ['<option value="">-</option>']
      .concat(
        state.contacts.map((c) => {
          const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "Unnamed";
          return `<option value="${escapeAttr(c.id)}">${escapeHtml(name)}</option>`;
        })
      )
      .join("");

    const dealOptions = ['<option value="">-</option>']
      .concat(
        state.deals.map((d) => `<option value="${escapeAttr(d.id)}">${escapeHtml(d.title)}</option>`)
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
    modal.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const done = await onAction(modal, btn.dataset.action);
          if (done) closeModal();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  }

  function closeModal() {
    const root = document.getElementById("modal-root");
    root.hidden = true;
    root.innerHTML = "";
  }

  function collectForm(modal) {
    const result = {};
    const custom = {};
    modal.querySelectorAll("input[name], select[name], textarea[name]").forEach((el) => {
      if (el.type === "number") {
        result[el.name] = el.value === "" ? null : Number(el.value);
      } else {
        result[el.name] = el.value;
      }
    });
    modal.querySelectorAll("[data-custom]").forEach((el) => {
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

  window.CRM = { initLogin, initApp };
})();
