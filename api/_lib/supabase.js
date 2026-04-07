// Thin Supabase REST helper used by every CRM API handler.
// Keeps auth + error handling in one place so individual endpoints stay small.

function getEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return { url: url.replace(/\/$/, ""), key };
}

async function sbRequest(method, path, { body, headers = {}, query } = {}) {
  const { url, key } = getEnv();
  const qs = query ? "?" + new URLSearchParams(query).toString() : "";
  const response = await fetch(`${url}/rest/v1${path}${qs}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=representation",
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data && data.message ? data.message : `Supabase ${method} ${path} failed`;
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function sbSelect(table, query) {
  return sbRequest("GET", `/${table}`, { query });
}

async function sbInsert(table, row) {
  const rows = await sbRequest("POST", `/${table}`, { body: Array.isArray(row) ? row : [row] });
  return Array.isArray(row) ? rows : rows[0];
}

async function sbUpdate(table, query, patch) {
  return sbRequest("PATCH", `/${table}`, { body: patch, query });
}

async function sbDelete(table, query) {
  return sbRequest("DELETE", `/${table}`, { query });
}

module.exports = { sbRequest, sbSelect, sbInsert, sbUpdate, sbDelete };
