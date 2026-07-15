// Thin API client for the P3 May Calls backend.
const BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
const KEY = import.meta.env.VITE_API_KEY || "";

function headers(extra = {}) {
  return { "X-API-Key": KEY, ...extra };
}

async function handle(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = j.detail || JSON.stringify(j);
    } catch (_) {}
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json();
}

function qs(params) {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.append(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const api = {
  base: BASE,

  health: () => fetch(`${BASE}/health`).then(handle),
  meta: () => fetch(`${BASE}/api/meta`, { headers: headers() }).then(handle),

  // worker
  worker: () => fetch(`${BASE}/api/worker`, { headers: headers() }).then(handle),
  workerStart: () => fetch(`${BASE}/api/worker/start`, { method: "POST", headers: headers() }).then(handle),
  workerPause: () => fetch(`${BASE}/api/worker/pause`, { method: "POST", headers: headers() }).then(handle),
  workerStop: () => fetch(`${BASE}/api/worker/stop`, { method: "POST", headers: headers() }).then(handle),
  setConcurrency: (n) =>
    fetch(`${BASE}/api/worker?concurrency=${n}`, { method: "PATCH", headers: headers() }).then(handle),
  scan: () => fetch(`${BASE}/api/scan`, { method: "POST", headers: headers() }).then(handle),

  // ingestion
  // files: File[]; folder: optional prefix; paths: optional relative paths
  // (aligned with files) to preserve a nested folder hierarchy; stripRoot drops
  // the selected top-level wrapper folder from each path.
  upload: (files, folder, paths, stripRoot) => {
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    if (folder) fd.append("folder", folder);
    if (paths && paths.length) fd.append("paths", JSON.stringify(paths));
    if (stripRoot) fd.append("strip_root", "true");
    return fetch(`${BASE}/api/upload`, { method: "POST", headers: headers(), body: fd }).then(handle);
  },
  trigger: (prefix) =>
    fetch(`${BASE}/api/trigger`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefix }),
    }).then(handle),

  // results + analytics
  results: (params) => fetch(`${BASE}/api/results${qs(params)}`, { headers: headers() }).then(handle),
  result: (id) => fetch(`${BASE}/api/results/${encodeURIComponent(id)}`, { headers: headers() }).then(handle),
  stats: () => fetch(`${BASE}/api/stats`, { headers: headers() }).then(handle),
  progress: () => fetch(`${BASE}/api/progress`, { headers: headers() }).then(handle),
  agents: () => fetch(`${BASE}/api/agents`, { headers: headers() }).then(handle),
  reprocess: (id) =>
    fetch(`${BASE}/api/results/${encodeURIComponent(id)}/reprocess`, {
      method: "POST",
      headers: headers(),
    }).then(handle),

  // downloads (structured ZIP) — fetch with auth header, then save the blob
  downloadCallZip: (id) =>
    fetch(`${BASE}/api/download/${encodeURIComponent(id)}`, { headers: headers() })
      .then((r) => saveZip(r, `${id}.zip`)),
  downloadAllZip: (params) =>
    fetch(`${BASE}/api/download${qs(params)}`, { headers: headers() })
      .then((r) => saveZip(r, "p3_calls.zip")),
};

// Turn a fetch Response into a client-side file download.
async function saveZip(res, fallbackName) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = j.detail || detail;
    } catch (_) {}
    throw new Error(`${res.status}: ${detail}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
