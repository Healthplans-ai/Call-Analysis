import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { api } from "../api.js";
import { CHART_COLORS, tooltipStyle, Loading } from "../ui.jsx";

const toData = (obj) =>
  Object.entries(obj || {}).map(([name, count]) => ({ name, count, value: count })).sort((a, b) => b.count - a.count);

export default function Analytics({ notify }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.stats().then(setStats).catch((e) => notify(`Failed to load analytics: ${e.message}`, true));
  }, [notify]);

  if (!stats) return <Loading label="Loading analytics…" />;

  const catData = toData(stats.by_category);
  const agentData = toData(stats.by_agent);
  const statusData = toData(stats.by_status);
  const authData = toData(stats.by_auth_status).filter((d) => d.name !== "Not Applicable");

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid two">
        <div className="card">
          <h3>Calls by category</h3>
          <ResponsiveContainer width="100%" height={Math.max(240, catData.length * 36)}>
            <BarChart data={catData} layout="vertical" margin={{ left: 10, right: 24 }}>
              <XAxis type="number" stroke="#6079a0" allowDecimals={false} fontSize={12} />
              <YAxis type="category" dataKey="name" width={150} stroke="#6079a0" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(29,111,224,.06)" }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {catData.map((d, i) => <Cell key={i} fill={d.name === "Prior Authorization" ? "#f5871f" : CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Calls by agent</h3>
          <ResponsiveContainer width="100%" height={Math.max(240, agentData.length * 36)}>
            <BarChart data={agentData} layout="vertical" margin={{ left: 10, right: 24 }}>
              <XAxis type="number" stroke="#6079a0" allowDecimals={false} fontSize={12} />
              <YAxis type="category" dataKey="name" width={130} stroke="#6079a0" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(29,111,224,.06)" }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {agentData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <h3>Status distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={55} paddingAngle={2}>
                {statusData.map((d, i) => {
                  const map = { done: "#1f8f5f", processing: "#3f8fb0", pending: "#cdd9d1", error: "#c94c4c" };
                  return <Cell key={i} fill={map[d.name] || CHART_COLORS[i % CHART_COLORS.length]} />;
                })}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Auth-Status types (Prior-Auth only)</h3>
          {authData.length === 0 ? <div className="empty">No prior-auth calls yet.</div> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={authData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={55} paddingAngle={2}>
                  {authData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
