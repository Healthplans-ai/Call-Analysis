import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";
import { Badge, Loading, Glyph } from "../ui.jsx";
import CallDetail from "./CallDetail.jsx";

const STATUSES = ["", "done", "processing", "pending", "error"];

/**
 * Reusable, filterable call table.
 * props:
 *   fixed     — filter values always applied & hidden (e.g. {status:'done'})
 *   features  — which filter controls to show: q, category, agent, status, priorAuth
 *   showAuthStatus — render the Auth-Status column
 *   exportable — show an "Export CSV" button for the current page
 */
export default function CallsTable({
  notify,
  fixed = {},
  features = ["q", "category", "agent", "status", "priorAuth"],
  showAuthStatus = false,
  exportable = false,
}) {
  const [meta, setMeta] = useState({ categories: [] });
  const [agents, setAgents] = useState([]);
  const [filters, setFilters] = useState({ category: "", agent: "", status: "", is_prior_auth: "", q: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1, page: 1 });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [zipping, setZipping] = useState(false);
  const [csving, setCsving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (features.includes("category")) api.meta().then(setMeta).catch(() => {});
    if (features.includes("agent")) api.stats().then((s) => setAgents(Object.keys(s.by_agent || {}).sort())).catch(() => {});
  }, []); // eslint-disable-line

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, ...fixed, page, page_size: 25 };
      if (params.is_prior_auth === "") delete params.is_prior_auth;
      const res = await api.results(params);
      setData(res);
    } catch (e) {
      notify(`Failed to load calls: ${e.message}`, true);
    } finally {
      setLoading(false);
    }
  }, [filters, page, notify]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const upd = (k, v) => { setPage(1); setFilters((f) => ({ ...f, [k]: v })); };

  const activeParams = () => {
    const params = { ...filters, ...fixed };
    if (params.is_prior_auth === "") delete params.is_prior_auth;
    return params;
  };

  const exportCsv = async () => {
    if (data.total === 0) return notify("No calls to export.", true);
    setCsving(true);
    try {
      await api.exportCsv(activeParams());
      notify(`Exporting ${data.total} call(s) to CSV (full metadata + transcripts)…`);
    } catch (e) {
      notify(`Export failed: ${e.message}`, true);
    } finally {
      setCsving(false);
    }
  };

  const downloadZip = async () => {
    setZipping(true);
    try {
      await api.downloadAllZip(activeParams());
      notify(`Downloading ${data.total} call(s) as ZIP…`);
    } catch (e) {
      notify(`Download failed: ${e.message}`, true);
    } finally {
      setZipping(false);
    }
  };

  const del = async (e, callId) => {
    e.stopPropagation();
    if (!window.confirm(`Permanently delete call ${callId}?\n\nThis removes its transcript, analysis, flow, summary and the source audio from Azure. This cannot be undone.`)) return;
    setDeleting(callId);
    try {
      await api.deleteCall(callId);
      notify(`Deleted call ${callId}.`);
      // Adjust page if we just removed the last row on it.
      if (data.items.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } catch (err) {
      notify(`Delete failed: ${err.message}`, true);
    } finally {
      setDeleting(null);
    }
  };

  const has = (f) => features.includes(f);

  return (
    <div className="grid" style={{ gap: 16 }}>
      {features.length > 0 && (
        <div className="card">
          <div className="row">
            {has("q") && (
              <div className="field" style={{ flex: 1, minWidth: 200 }}>
                <label>Search</label>
                <input placeholder="call id, summary, agent…" value={filters.q} onChange={(e) => upd("q", e.target.value)} />
              </div>
            )}
            {has("category") && (
              <div className="field">
                <label>Category</label>
                <select value={filters.category} onChange={(e) => upd("category", e.target.value)}>
                  <option value="">All</option>
                  {meta.categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            {has("agent") && (
              <div className="field">
                <label>Agent</label>
                <select value={filters.agent} onChange={(e) => upd("agent", e.target.value)}>
                  <option value="">All</option>
                  {agents.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            )}
            {has("status") && (
              <div className="field">
                <label>Status</label>
                <select value={filters.status} onChange={(e) => upd("status", e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s || "All"}</option>)}
                </select>
              </div>
            )}
            {has("priorAuth") && (
              <div className="field">
                <label>Prior-Auth</label>
                <select value={filters.is_prior_auth} onChange={(e) => upd("is_prior_auth", e.target.value)}>
                  <option value="">All</option>
                  <option value="true">Prior-Auth only</option>
                  <option value="false">Exclude Prior-Auth</option>
                </select>
              </div>
            )}
            <div className="right row">
              {exportable && (
                <button className="btn ghost" onClick={exportCsv} disabled={csving || data.total === 0}>
                  {csving ? <span className="spin" /> : null}
                  {csving ? "Exporting…" : "Export CSV"}
                </button>
              )}
              <button className="btn" onClick={downloadZip} disabled={zipping || data.total === 0}>
                {zipping ? <span className="spin" /> : <Glyph name="download" />}
                {zipping ? "Preparing…" : "Download ZIP"}
              </button>
              <button className="btn ghost" onClick={load}>Refresh</button>
            </div>
          </div>
        </div>
      )}

      <div className="table-wrap" style={{ overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Call ID</th><th>Agent</th><th>Date</th><th>Category</th>
              {showAuthStatus ? <th>Auth-Status</th> : <th>Prior-Auth</th>}
              <th>Status</th><th>Summary</th><th></th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.call_id} onClick={() => setSelected(r.call_id)}>
                <td style={{ fontWeight: 600 }}>{r.call_id}</td>
                <td>{r.agent}</td>
                <td>{r.date}</td>
                <td>{r.category ? <Badge kind="cat">{r.category}</Badge> : "—"}</td>
                <td>{r.is_prior_auth ? <Badge kind="pa">{r.auth_status || "Yes"}</Badge> : <span className="muted">—</span>}</td>
                <td><Badge kind={r.status}>{r.status}</Badge></td>
                <td className="truncate">{r.summary || "—"}</td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="icon-btn danger"
                    title="Delete call"
                    disabled={deleting === r.call_id}
                    onClick={(e) => del(e, r.call_id)}
                  >
                    {deleting === r.call_id ? <span className="spin" /> : <Glyph name="trash" />}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && data.items.length === 0 && (
              <tr><td colSpan={8}><div className="empty">No calls match these filters.</div></td></tr>
            )}
            {loading && (
              <tr><td colSpan={8}><Loading /></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <span className="muted">{data.total} calls · page {data.page} / {data.pages}</span>
        <button className="btn ghost sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <button className="btn ghost sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      {selected && <CallDetail callId={selected} onClose={() => setSelected(null)} notify={notify} />}
    </div>
  );
}
