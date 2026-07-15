import { useEffect, useState, useCallback } from "react";
import { api } from "./api.js";
import { Glyph } from "./ui.jsx";
import logoUrl from "./assets/healthplans-logo.png";
import Overview from "./components/Overview.jsx";
import Upload from "./components/Upload.jsx";
import Analytics from "./components/Analytics.jsx";
import Agents from "./components/Agents.jsx";
import Errors from "./components/Errors.jsx";
import Control from "./components/Control.jsx";
import Results from "./components/Results.jsx";

const NAV = [
  { id: "overview", label: "Overview", icon: "overview", title: "Overview", intro: "Live snapshot of the call-processing pipeline." },
  { id: "upload", label: "Upload / Ingest", icon: "upload", title: "Upload & Ingest", intro: "Add calls from your device or process audio already in Azure Blob." },
  { id: "results", label: "Results", icon: "results", title: "Results", intro: "Browse, filter, inspect and download every call — by category, agent, status or prior-auth." },
  { id: "agents", label: "Agents", icon: "agents", title: "Agent Performance", intro: "How each agent's calls break down — volume, outcomes, prior-auth rate. Click an agent to drill in." },
  { id: "analytics", label: "Analytics", icon: "analytics", title: "Analytics", intro: "Distribution of calls across categories, agents and outcomes." },
  { id: "errors", label: "Errors", icon: "errors", title: "Errors & Reprocessing", intro: "Every failed call with its error — reprocess individually or all at once." },
  { id: "control", label: "Server Control", icon: "control", title: "Server Control", intro: "Start, pause and tune the autonomous Railway worker." },
];

export default function App() {
  const [active, setActive] = useState("overview");
  const [worker, setWorker] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg, isErr = false) => {
    setToast({ msg, isErr });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const refreshWorker = useCallback(async () => {
    try { setWorker(await api.worker()); }
    catch { setWorker({ mode: "offline" }); }
  }, []);

  useEffect(() => {
    refreshWorker();
    const t = setInterval(refreshWorker, 5000);
    return () => clearInterval(t);
  }, [refreshWorker]);

  const current = NAV.find((n) => n.id === active);
  const mode = worker?.mode || "offline";

  const pages = {
    overview: <Overview notify={notify} go={setActive} />,
    upload: <Upload notify={notify} onDone={refreshWorker} />,
    results: <Results notify={notify} />,
    agents: <Agents notify={notify} />,
    analytics: <Analytics notify={notify} />,
    errors: <Errors notify={notify} />,
    control: <Control notify={notify} worker={worker} refresh={refreshWorker} />,
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <img src={logoUrl} alt="healthplans.ai" className="brand-logo" />
          <div className="sub">Call Intelligence</div>
        </div>

        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${active === n.id ? "active" : ""}`}
              onClick={() => setActive(n.id)}
            >
              <Glyph name={n.icon} />
              {n.label}
            </button>
          ))}
        </nav>

        <div className="foot">
          <div className="status-pill" style={{ width: "100%" }}>
            <span className={`dot ${mode}`} /> worker: {mode}
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1>{current?.title}</h1>
          <span className="crumb">/ {current?.label}</span>
          <div className="spacer" />
          <div className="status-pill">
            <span className={`dot ${mode}`} />
            {mode}
            {worker?.in_flight ? ` · ${worker.in_flight} processing` : ""}
            {worker?.queue_size ? ` · ${worker.queue_size} queued` : ""}
          </div>
        </header>

        <div className="content">
          {current?.intro && <p className="page-intro">{current.intro}</p>}
          {pages[active]}
        </div>
      </div>

      {toast && <div className={`toast ${toast.isErr ? "err" : ""}`}>{toast.msg}</div>}
    </div>
  );
}
