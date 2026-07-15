import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { api } from "../api.js";
import { Loading, Badge, Glyph, CHART_COLORS, tooltipStyle } from "../ui.jsx";
import CallsTable from "./CallsTable.jsx";

// Per-agent performance dashboard with drill-down into an agent's calls.
export default function Agents({ notify }) {
  const [agents, setAgents] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.agents()
      .then((d) => setAgents(d.agents || []))
      .catch((e) => notify(`Failed to load agents: ${e.message}`, true));
  }, [notify]);

  if (!agents) return <Loading label="Loading agent performance…" />;
  if (agents.length === 0) return <div className="empty">No agents yet — process some calls first.</div>;

  if (selected) {
    return (
      <div className="grid" style={{ gap: 16 }}>
        <div className="row">
          <button className="btn ghost sm" onClick={() => setSelected(null)}>← All agents</button>
          <h3 style={{ margin: 0 }}>Calls handled by <span style={{ color: "var(--accent)" }}>{selected}</span></h3>
        </div>
        <CallsTable
          notify={notify}
          fixed={{ agent: selected }}
          features={["q", "category", "status", "priorAuth"]}
          exportable
        />
      </div>
    );
  }

  const chartData = agents.slice(0, 12).map((a) => ({ name: a.agent, calls: a.total }));
  const pct = (n, t) => (t ? Math.round((n / t) * 100) : 0);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="h-row">
          <Glyph name="agents" style={{ width: 18, color: "var(--accent)" }} />
          <h3>Calls per agent</h3>
          <span className="muted right">{agents.length} agents</span>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 34)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis type="number" tick={{ fontSize: 12, fill: "var(--muted)" }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12, fill: "var(--text)" }} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
            <Bar dataKey="calls" radius={[0, 6, 6, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="table-wrap" style={{ overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Agent</th><th>Total</th><th>Done</th><th>Errors</th>
              <th>Prior-Auth</th><th>Top category</th><th></th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.agent} onClick={() => setSelected(a.agent)}>
                <td style={{ fontWeight: 700 }}>{a.agent}</td>
                <td>{a.total}</td>
                <td><span style={{ color: "var(--success)", fontWeight: 600 }}>{a.done}</span></td>
                <td>{a.error > 0 ? <span style={{ color: "var(--danger)", fontWeight: 600 }}>{a.error}</span> : <span className="muted">0</span>}</td>
                <td>{a.prior_auth > 0 ? <Badge kind="pa">{a.prior_auth} · {pct(a.prior_auth, a.total)}%</Badge> : <span className="muted">—</span>}</td>
                <td>{a.top_category !== "—" ? <Badge kind="cat">{a.top_category}</Badge> : "—"}</td>
                <td className="muted">View calls →</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
