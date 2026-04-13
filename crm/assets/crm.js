// Rocket Sloth CRM frontend.
// Single global `CRM` object exposing initLogin(), initAuth(), and initApp().
// Reads the tenant config object (stored alongside the session) to
// drive branding, pipeline stages, and contact statuses per customer.

(function () {
  const STORAGE_KEY = "rs_crm_session";
  const TENANT_KEY = "rs_crm_last_tenant";

  function getSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setSession(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (data && data.tenant && data.tenant.slug) {
      localStorage.setItem(TENANT_KEY, data.tenant.slug);
    }
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function getLastTenant() {
    try { return localStorage.getItem(TENANT_KEY) || ""; } catch { return ""; }
  }

  async function api(path, options = {}) {
    const session = getSession();
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      options.headers || {}
    );
    if (session && session.token) {
      headers.Authorization = `Bearer ${session.token}`;
    }
    const response = await fetch(path, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
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
    return getLastTenant();
  }

  // ---------- Login page ----------

  function initLogin() {
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
          errEl.textContent = err.message;
          errEl.hidden = false;
          btn.disabled = false;
          btn.textContent = "Enter the live demo →";
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
    var session = getSession();
    if (!session) {
      window.location.href = "/crm/login";
      return;
    }
    state.session = session;

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
      try { await api("/api/crm/me", { method: "DELETE" }); } catch (ignored) {}
      clearSession();
      window.location.href = "/crm/login";
    });

    document.getElementById("new-contact-btn").addEventListener("click", function () { openContactModal(); });
    document.getElementById("new-deal-btn").addEventListener("click", function () { openDealModal(); });
    document.getElementById("new-activity-btn").addEventListener("click", function () { openActivityModal(); });

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
    var data = await api("/api/crm/contacts" + qs);
    if (!data) return;
    state.contacts = data.contacts || [];
    renderContacts();
  }

  async function loadDeals() {
    var data = await api("/api/crm/deals");
    if (!data) return;
    state.deals = data.deals || [];
    renderPipeline();
  }

  async function loadActivities() {
    var data = await api("/api/crm/activities");
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
    list.innerHTML = "";
    if (recent.length === 0) {
      list.innerHTML = '<li class="empty">No activity yet.</li>';
      return;
    }
    recent.forEach(function (a) { list.appendChild(renderActivityItem(a)); });
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
          await api("/api/crm/contacts?id=" + c.id, { method: "DELETE" });
          await loadContacts();
          renderDashboard();
          return true;
        }
        if (action === "save") {
          var body = collectForm(modal);
          if (isEdit) {
            await api("/api/crm/contacts?id=" + c.id, { method: "PATCH", body: body });
          } else {
            await api("/api/crm/contacts", { method: "POST", body: body });
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
      board.appendChild(col);
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
          await api("/api/crm/deals?id=" + d.id, { method: "DELETE" });
          await loadDeals();
          renderDashboard();
          return true;
        }
        if (action === "ai-summary" && isEdit) {
          var resultEl = modal.querySelector("#ai-result");
          resultEl.hidden = false;
          resultEl.innerHTML = "<em>Asking Claude\u2026</em>";
          try {
            var data = await api("/api/crm/ai-summary?deal_id=" + d.id, { method: "POST" });
            var actions = (data.nextActions || []).map(function (a) { return "<li>" + escapeHtml(a) + "</li>"; }).join("");
            var stub = data.stub ? '<div class="ai-stub-warning">Demo mode \u2014 set ANTHROPIC_API_KEY for live AI.</div>' : "";
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
          if (isEdit) {
            await api("/api/crm/deals?id=" + d.id, { method: "PATCH", body: body });
          } else {
            await api("/api/crm/deals", { method: "POST", body: body });
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
          await api("/api/crm/activities", { method: "POST", body: body });
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
        result[el.name] = el.value;
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
