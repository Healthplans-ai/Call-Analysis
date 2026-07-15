import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";
import { Loading, Glyph } from "../ui.jsx";
import CallDetail from "./CallDetail.jsx";

// Operations view: every failed call with its error message and one-click
// reprocessing (individually or all at once).
export default function Errors({ notify }) {
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState({});      // call_id -> true while reprocessing
  const [allBusy, setAllBusy] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.results({ status: "error", page: 1, page_size: 200 }));
    } catch (e) {
      notify(`Failed to load errors: ${e.message}`, true);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const reprocess = async (id) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const r = await api.reprocess(id);
      notify(r.status === "error" ? `${id}: still failing — ${r.error}` : `${id} reprocessed → ${r.status}`, r.status === "error");
    } catch (e) {
      notify(`Reprocess failed: ${e.message}`, true);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
      load();
    }
  };

  const reprocessAll = async () => {
    const ids = data.items.map((r) => r.call_id);
    if (!ids.length) return;
    setAllBusy(true);
    let ok = 0;
    for (const id of ids) {
      try {
        const r = await api.reprocess(id);
        if (r.status !== "error") ok += 1;
      } catch (_) { /* keep going */ }
    }
    setAllBusy(false);
    notify(`Reprocessed ${ok}/${ids.length} calls successfully.`);
    load();
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div className="stat-mini" style={{ display: "grid", placeItems: "center", width: 54, height: 54, borderRadius: 14, background: data.total ? "var(--danger-bg)" : "var(--success-bg)" }}>
          <Glyph name={data.total ? "errors" : "results"} style={{ width: 24, color: data.total ? "var(--danger)" : "var(--success)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: data.total ? "var(--danger)" : "var(--success)", lineHeight: 1 }}>
            {data.total}
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {data.total ? "calls failed processing — reprocess to retry the full pipeline" : "no failed calls — everything processed cleanly"}
          </div>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={load}>Refresh</button>
          <button className="btn danger" onClick={reprocessAll} disabled={allBusy || data.total === 0}>
            {allBusy ? <span className="spin" /> : <Glyph name="refresh" />}
            {allBusy ? "Reprocessing…" : "Reprocess all"}
          </button>
        </div>
      </div>

      <div className="table-wrap" style={{ overflow: "auto" }}>
        <table>
          <thead>
            <tr><th>Call ID</th><th>Agent</th><th>Error</th><th>Updated</th><th></th></tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.call_id}>
                <td style={{ fontWeight: 600, cursor: "pointer" }} onClick={() => setSelected(r.call_id)}>{r.call_id}</td>
                <td>{r.agent}</td>
                <td className="truncate" style={{ color: "var(--danger)", maxWidth: 460 }}>{r.error || "—"}</td>
                <td className="muted">{(r.updated_at || "").replace("T", " ").slice(0, 19)}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn sm" onClick={() => reprocess(r.call_id)} disabled={busy[r.call_id] || allBusy}>
                    {busy[r.call_id] ? <span className="spin" /> : <Glyph name="refresh" />}
                    Reprocess
                  </button>
                </td>
              </tr>
            ))}
            {loading && <tr><td colSpan={5}><Loading /></td></tr>}
            {!loading && data.items.length === 0 && (
              <tr><td colSpan={5}><div className="empty">🎉 No failed calls.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && <CallDetail callId={selected} onClose={() => setSelected(null)} notify={notify} />}
    </div>
  );
}
