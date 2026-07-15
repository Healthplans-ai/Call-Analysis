import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Stat, Badge } from "../ui.jsx";

export default function Control({ notify, worker, refresh }) {
  const [progress, setProgress] = useState(null);
  const [concurrency, setConcurrency] = useState(worker?.concurrency || 4);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (worker?.concurrency) setConcurrency(worker.concurrency); }, [worker?.concurrency]);

  useEffect(() => {
    let alive = true;
    const load = () => api.progress().then((p) => alive && setProgress(p)).catch(() => {});
    load();
    const t = setInterval(load, 4000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const act = async (fn, msg) => {
    setBusy(true);
    try { await fn(); notify(msg); refresh?.(); }
    catch (e) { notify(e.message, true); }
    finally { setBusy(false); }
  };

  const mode = worker?.mode || "offline";

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="h-row"><h3>Worker control</h3>
          <span className="status-pill right"><span className={`dot ${mode}`} /> {mode}</span>
        </div>
        <div className="row">
          <button className="btn success" disabled={busy || mode === "running"} onClick={() => act(api.workerStart, "Worker started.")}>▶ Start</button>
          <button className="btn warn" disabled={busy || mode === "paused"} onClick={() => act(api.workerPause, "Worker paused.")}>❚❚ Pause</button>
          <button className="btn danger" disabled={busy || mode === "stopped"} onClick={() => act(api.workerStop, "Worker stopped.")}>■ Stop</button>
          <button className="btn ghost right" disabled={busy} onClick={() => act(api.scan, "Scan triggered.")}>Scan now</button>
        </div>

        <hr className="div" />

        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label>Concurrency — {concurrency} call(s) in parallel</label>
            <input type="range" min="1" max="16" value={concurrency} onChange={(e) => setConcurrency(Number(e.target.value))} />
          </div>
          <button className="btn" disabled={busy} onClick={() => act(() => api.setConcurrency(concurrency), `Concurrency set to ${concurrency}.`)}>Apply</button>
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>
          Last scan: {worker?.last_scan || "—"} · Queue: {worker?.queue_size ?? 0} · In flight: {worker?.in_flight ?? 0}
        </p>
      </div>

      {progress && (
        <div className="grid cards">
          <Stat icon="calls" value={progress.total} label="Total" />
          <Stat icon="results" kind="success" value={progress.done} label="Done" />
          <Stat icon="control" value={progress.processing} label="Processing" />
          <Stat icon="history" value={progress.pending} label="Pending" />
          <Stat icon="history" kind="danger" value={progress.error} label="Errors" />
          <Stat icon="pa" kind="pa" value={progress.prior_auth} label="Prior-Auth" />
        </div>
      )}

      <div className="card">
        <h3>Recent activity</h3>
        <div className="activity">
          {(worker?.recent || []).length === 0 && <div className="muted">No activity yet.</div>}
          {(worker?.recent || []).map((a, i) => (
            <div className="item" key={i}>
              <Badge kind={a.status}>{a.status}</Badge>
              <b style={{ fontSize: 13 }}>{a.call_id}</b>
              {a.is_prior_auth && <Badge kind="pa">PA</Badge>}
              <span className="muted">{a.category || a.error || ""}</span>
              <span className="muted right" style={{ fontSize: 12 }}>{a.at?.replace("T", " ").slice(0, 19)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
