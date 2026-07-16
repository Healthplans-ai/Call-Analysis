// Shared UI building blocks + inline icon set (no icon dependency).

export const Icon = {
  overview: <path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z" />,
  upload: <path d="M12 16V4m0 0 4 4m-4-4L8 8M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />,
  analytics: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />,
  calls: <path d="M4 5h16M4 12h16M4 19h10" />,
  control: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />,
  history: <path d="M3 3v5h5 M3.05 13A9 9 0 1 0 6 5.3L3 8 M12 7v5l4 2" />,
  results: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z M14 2v6h6 M9 13h6 M9 17h6" />,
  pa: <path d="m9 12 2 2 4-4 M21 12c-1 0-3-1-3-3s2-2 2-4-2-2-2-2-1 2-3 2-3-2-3-2-1 2-3 2-2-2-2-2-2 0-2 2 2 2 2 4-2 3-3 3" />,
  refresh: <path d="M3 12a9 9 0 0 1 15-6.7L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15 6.7L3 16 M3 21v-5h5" />,
  spark: <path d="M12 3v4 M12 17v4 M3 12h4 M17 12h4 M6 6l2.5 2.5 M15.5 15.5 18 18 M6 18l2.5-2.5 M15.5 8.5 18 6" />,
  download: <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />,
  agents: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" />,
  errors: <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01" />,
  trash: <path d="M3 6h18 M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 M10 11v6 M14 11v6" />,
};

export function Glyph({ name, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {Icon[name]}
    </svg>
  );
}

export function Stat({ value, label, kind, icon }) {
  return (
    <div className={`card stat ${kind || ""}`}>
      {icon && <div className="icon"><Glyph name={icon} /></div>}
      <div className="value">{value ?? "—"}</div>
      <div className="label">{label}</div>
    </div>
  );
}

export function Badge({ children, kind }) {
  return <span className={`badge ${kind || ""}`}>{children}</span>;
}

export function Progress({ stats }) {
  const total = stats.total || 0;
  const pct = (n) => (total ? (n / total) * 100 : 0);
  return (
    <>
      <div className="progress-track">
        <div className="seg done" style={{ width: `${pct(stats.done)}%` }} />
        <div className="seg processing" style={{ width: `${pct(stats.processing)}%` }} />
        <div className="seg pending" style={{ width: `${pct(stats.pending)}%` }} />
        <div className="seg error" style={{ width: `${pct(stats.error)}%` }} />
      </div>
      <div className="legend">
        <span><i style={{ background: "var(--success)" }} /> Done {stats.done}</span>
        <span><i style={{ background: "var(--accent)" }} /> Processing {stats.processing}</span>
        <span><i style={{ background: "var(--border-strong)" }} /> Pending {stats.pending}</span>
        <span><i style={{ background: "var(--danger)" }} /> Error {stats.error}</span>
      </div>
    </>
  );
}

export function Loading({ label = "Loading…" }) {
  return <div className="center"><span className="spin" />{label}</div>;
}

// Blue-forward palette derived from healthplans.ai (sky #a2cfe1 family).
export const CHART_COLORS = ["#2178a1", "#3aa0d4", "#a2cfe1", "#144d64", "#7bb8d4", "#2f7d97", "#5aa9c9", "#0d2635", "#c4dfec", "#1f8f5f"];
export const tooltipStyle = { background: "#fff", border: "1px solid var(--border-strong)", borderRadius: 10, boxShadow: "var(--shadow)", fontSize: 13, color: "var(--text)" };
