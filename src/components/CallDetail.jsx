import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Loading, Glyph } from "../ui.jsx";

function download(name, text, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function CallDetail({ callId, onClose, notify }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zipping, setZipping] = useState(false);

  const downloadZip = async () => {
    setZipping(true);
    try {
      await api.downloadCallZip(callId);
      notify("Downloading call ZIP…");
    } catch (e) {
      notify(`Download failed: ${e.message}`, true);
    } finally {
      setZipping(false);
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.result(callId)
      .then((d) => alive && setData(d))
      .catch((e) => notify(`Failed to load call: ${e.message}`, true))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [callId, notify]);

  const kd = data?.key_details || {};
  const flow = data?.flow || {};
  const steps = flow.detailed_steps || [];
  const list = (arr) => (arr && arr.length ? arr.join(", ") : "—");

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <h2 style={{ flex: 1 }}>Call {callId}</h2>
          <button className="btn ghost sm" onClick={onClose}>Close</button>
        </div>

        {loading && <Loading />}
        {!loading && data && (
          <>
            <div className="row" style={{ margin: "6px 0 18px" }}>
              {data.category && <Badge kind="cat">{data.category}</Badge>}
              {data.is_prior_auth && <Badge kind="pa">PRIOR AUTH · {data.auth_status}</Badge>}
              <Badge kind={data.status}>{data.status}</Badge>
              <Badge>{data.agent}</Badge>
              <Badge>{data.date}</Badge>
              <div className="right row">
                <button className="btn ghost sm" onClick={() => download(`${callId}.json`, JSON.stringify(data, null, 2), "application/json")}>JSON</button>
                {data.transcript && <button className="btn ghost sm" onClick={() => download(`${callId}.txt`, data.transcript)}>Transcript</button>}
                <button className="btn sm" onClick={downloadZip} disabled={zipping}>
                  {zipping ? <span className="spin" /> : <Glyph name="download" />}
                  {zipping ? "Preparing…" : "Download ZIP"}
                </button>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <h3>Summary</h3>
              <div>{data.summary || "—"}</div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <h3>Key details</h3>
              <div className="kv">
                <div className="k">Claim IDs</div><div>{list(kd.claim_ids)}</div>
                <div className="k">Member IDs</div><div>{list(kd.member_ids)}</div>
                <div className="k">Authorization #</div><div>{list(kd.authorization_ids)}</div>
                <div className="k">Dates of service</div><div>{list(kd.dates_of_service)}</div>
                <div className="k">Amounts</div><div>{list(kd.amounts)}</div>
                <div className="k">Resolution</div><div>{kd.resolution || "—"}</div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <h3>Call flow {flow.call_type ? `· ${flow.call_type}` : ""}</h3>
              {(flow.high_level_flow || []).length > 0 && (
                <div className="muted" style={{ marginBottom: 10 }}>{flow.high_level_flow.join("  →  ")}</div>
              )}
              {steps.length === 0 && <div className="muted">No flow extracted.</div>}
              {steps.map((s, i) => (
                <div className="flow-step" key={i}>
                  <div className="meta">Step {s.step_number} · {s.actor} · {s.phase}</div>
                  <div>{s.description}</div>
                </div>
              ))}
              {flow.outcome_summary && <div style={{ marginTop: 12 }}><b>Outcome:</b> {flow.outcome_summary}</div>}
            </div>

            <div className="card">
              <h3>Transcript</h3>
              <div className="transcript">{data.transcript || "—"}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
