import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Stat, Progress, Badge, Loading, Glyph } from "../ui.jsx";

export default function Overview({ notify, go }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try { const s = await api.stats(); if (alive) setStats(s); }
      catch (e) { notify(`Failed to load stats: ${e.message}`, true); }
    };
    load();
    const t = setInterval(load, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [notify]);

  if (!stats) return <Loading label="Loading analytics…" />;

  const total = stats.total || 0;
  const ratio = total ? Math.round((stats.prior_auth / total) * 100) : 0;
  const topCats = Object.entries(stats.by_category || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const recent = stats.worker?.recent || [];

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="grid cards">
        <Stat icon="calls" value={total} label="Total calls indexed" />
        <Stat icon="results" kind="success" value={stats.done} label="Processed" />
        <Stat icon="control" value={stats.processing + stats.pending} label="Queued / in progress" />
        <Stat icon="history" kind="danger" value={stats.error} label="Errors" />
        <Stat icon="pa" kind="pa" value={stats.prior_auth} label="Prior-Auth calls" />
      </div>

      <div className="card">
        <div className="h-row"><Glyph name="spark" style={{ width: 18, color: "var(--primary)" }} /><h3>Processing progress</h3>
          <span className="muted right">{total ? Math.round((stats.done / total) * 100) : 0}% complete</span></div>
        <Progress stats={stats} />
      </div>

      <div className="grid two">
        <div className="card">
          <h3>Top categories</h3>
          {topCats.length === 0 && <div className="empty">No calls yet.</div>}
          {topCats.map(([name, count]) => {
            const max = topCats[0][1] || 1;
            return (
              <div key={name} style={{ marginBottom: 12 }}>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {name === "Prior Authorization" ? "⭐ " : ""}{name}
                  </span>
                  <span className="muted" style={{ fontSize: 13 }}>{count}</span>
                </div>
                <div className="progress-track" style={{ height: 8 }}>
                  <div className="seg" style={{ width: `${(count / max) * 100}%`, background: name === "Prior Authorization" ? "var(--pa)" : "var(--primary)" }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid" style={{ gap: 16, alignContent: "start" }}>
          <div className="pa-banner" style={{ cursor: "pointer" }} onClick={() => go?.("results")}>
            <div className="big">{stats.prior_auth}</div>
            <div>
              <div style={{ fontWeight: 700 }}>Prior-Auth spotlight</div>
              <div className="muted" style={{ fontSize: 13 }}>{ratio}% of calls are Auth-Status. Filter them in Results →</div>
            </div>
          </div>
          <div className="card">
            <div className="h-row"><h3>Recent activity</h3><button className="btn ghost sm right" onClick={() => go?.("results")}>View all</button></div>
            <div className="activity">
              {recent.length === 0 && <div className="muted">No activity yet.</div>}
              {recent.slice(0, 6).map((a, i) => (
                <div className="item" key={i}>
                  <Badge kind={a.status}>{a.status}</Badge>
                  <b style={{ fontSize: 13 }}>{a.call_id}</b>
                  {a.is_prior_auth && <Badge kind="pa">PA</Badge>}
                  <span className="muted right" style={{ fontSize: 12 }}>{a.category || a.error || ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
