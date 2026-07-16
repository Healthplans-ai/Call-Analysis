import { useState, useRef, useEffect } from "react";
import { api } from "../api.js";
import { Glyph } from "../ui.jsx";

const AUDIO_RE = /\.(mp3|wav|m4a|ogg|flac)$/i;

// ---- directory traversal for drag-and-dropped folders --------------------
function readEntries(reader) {
  return new Promise((resolve) => reader.readEntries(resolve, () => resolve([])));
}
async function walkEntry(entry, prefix, out) {
  if (entry.isFile) {
    const file = await new Promise((res) => entry.file(res, () => res(null)));
    if (file) out.push({ file, rel: prefix + entry.name });
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    let batch;
    do {
      batch = await readEntries(reader);
      for (const e of batch) await walkEntry(e, prefix + entry.name + "/", out);
    } while (batch.length > 0);
  }
}
async function entriesFromDrop(dt) {
  const items = dt.items ? [...dt.items] : [];
  const roots = items.map((it) => (it.webkitGetAsEntry ? it.webkitGetAsEntry() : null)).filter(Boolean);
  if (roots.length) {
    const out = [];
    for (const r of roots) await walkEntry(r, "", out);
    return out;
  }
  return [...(dt.files || [])].map((f) => ({ file: f, rel: f.webkitRelativePath || f.name }));
}

// ---- batched, concurrent upload ------------------------------------------
// Big selections (hundreds of calls) are split into many small requests so no
// single request runs long enough to hit a proxy/server timeout.
const BATCH_MAX_FILES = 10;
const BATCH_MAX_BYTES = 12 * 1024 * 1024; // ~12 MB per request
const CONCURRENCY = 3;                     // simultaneous in-flight requests
const MAX_RETRIES = 3;
const BATCH_TIMEOUT_MS = 120000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeBatches(entries) {
  const batches = [];
  let cur = [], bytes = 0;
  for (const e of entries) {
    const sz = e.file.size || 0;
    if (cur.length && (cur.length >= BATCH_MAX_FILES || bytes + sz > BATCH_MAX_BYTES)) {
      batches.push(cur);
      cur = []; bytes = 0;
    }
    cur.push(e);
    bytes += sz;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

export default function Upload({ notify, onDone }) {
  // entries: [{ file, rel }]  — rel is the path relative to the dropped/selected root
  const [entries, setEntries] = useState([]);
  const [folder, setFolder] = useState("");
  const [stripRoot, setStripRoot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [progress, setProgress] = useState(null); // {total, uploaded, failed, skipped, bytesTotal, bytesDone}
  const fileRef = useRef();
  const dirRef = useRef();

  // <input webkitdirectory> must be set imperatively for React to keep it.
  useEffect(() => {
    if (dirRef.current) {
      dirRef.current.setAttribute("webkitdirectory", "");
      dirRef.current.setAttribute("directory", "");
    }
  }, []);

  const setFromList = (list) =>
    setEntries([...(list || [])].map((f) => ({ file: f, rel: f.webkitRelativePath || f.name })));

  const audio = entries.filter((e) => AUDIO_RE.test(e.rel));
  const hasFolders = audio.some((e) => e.rel.includes("/"));
  const pct = progress ? Math.min(100, Math.round((progress.bytesDone / progress.bytesTotal) * 100)) : 0;

  const onDrop = async (e) => {
    e.preventDefault();
    setDrag(false);
    const collected = await entriesFromDrop(e.dataTransfer);
    setEntries(collected);
  };

  const doUpload = async () => {
    if (!audio.length) return notify("No audio files selected (.mp3/.wav/.m4a/.ogg/.flac).", true);

    const preserve = hasFolders;
    const batches = makeBatches(audio);
    const bytesTotal = audio.reduce((s, e) => s + (e.file.size || 0), 0) || 1;

    let uploaded = 0, failed = 0, skipped = 0, bytesDone = 0;
    const failedEntries = [];
    const update = () =>
      setProgress({ total: audio.length, uploaded, failed, skipped, bytesTotal, bytesDone });

    setBusy(true);
    update();

    // Send one batch with retry + per-request abort timeout.
    const sendBatch = async (batch) => {
      const files = batch.map((e) => e.file);
      const paths = preserve ? batch.map((e) => e.rel) : undefined;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), BATCH_TIMEOUT_MS);
        try {
          return await api.upload(files, folder || undefined, paths, stripRoot, ctrl.signal);
        } catch (err) {
          if (attempt === MAX_RETRIES - 1) throw err;
          await sleep(600 * (attempt + 1));
        } finally {
          clearTimeout(timer);
        }
      }
    };

    // Concurrency pool: CONCURRENCY workers pull batches off a shared cursor.
    let cursor = 0;
    const worker = async () => {
      while (cursor < batches.length) {
        const batch = batches[cursor++];
        const batchBytes = batch.reduce((s, e) => s + (e.file.size || 0), 0);
        try {
          const res = await sendBatch(batch);
          uploaded += res.count || 0;
          skipped += res.skipped_count || 0;
        } catch (_) {
          failed += batch.length;
          failedEntries.push(...batch);
        } finally {
          bytesDone += batchBytes;
          update();
        }
      }
    };

    try {
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker)
      );
      const parts = [`Uploaded ${uploaded} call(s)`];
      if (skipped) parts.push(`${skipped} non-audio skipped`);
      if (failed) parts.push(`${failed} failed — kept for retry`);
      notify(parts.join(" · "), failed > 0);

      if (failed) {
        // Keep only the failed files so a second click retries just those.
        setEntries(failedEntries);
      } else {
        setEntries([]);
        if (fileRef.current) fileRef.current.value = "";
        if (dirRef.current) dirRef.current.value = "";
      }
      onDone?.();
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const doTrigger = async () => {
    if (!prefix.trim()) return notify("Enter a blob path or prefix.", true);
    setBusy(true);
    try {
      const res = await api.trigger(prefix.trim());
      notify(`Queued ${res.enqueued} call(s) from "${res.prefix}".`);
      onDone?.();
    } catch (e) {
      notify(`Trigger failed: ${e.message}`, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid two">
      <div className="card">
        <h3>Upload calls from this device</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Drop individual files <b>or a whole folder</b> (with nested sub-folders and calls).
          Files are stored in the <code>calls</code> container and processed automatically.
        </p>

        <div
          className={`dropzone ${drag ? "drag" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          {audio.length ? (
            <>
              <b>{audio.length}</b> audio file{audio.length === 1 ? "" : "s"} ready
              {hasFolders && <span className="muted"> · folder structure preserved</span>}
              {entries.length > audio.length && (
                <span className="muted"> · {entries.length - audio.length} non-audio ignored</span>
              )}
            </>
          ) : (
            "Drag & drop audio files or a folder here"
          )}
          <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
            <button className="btn ghost sm" onClick={() => fileRef.current?.click()} type="button" disabled={busy}>
              <Glyph name="upload" /> Choose files
            </button>
            <button className="btn ghost sm" onClick={() => dirRef.current?.click()} type="button" disabled={busy}>
              <Glyph name="results" /> Choose folder
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac"
            multiple
            style={{ display: "none" }}
            onChange={(e) => setFromList(e.target.files)}
          />
          <input
            ref={dirRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => setFromList(e.target.files)}
          />
        </div>

        {audio.length > 0 && (
          <ul className="muted" style={{ fontSize: 12, maxHeight: 140, overflow: "auto", marginTop: 10 }}>
            {audio.slice(0, 100).map((e, i) => <li key={i}>{e.rel}</li>)}
            {audio.length > 100 && <li>…and {audio.length - 100} more</li>}
          </ul>
        )}

        <div className="field" style={{ marginTop: 12 }}>
          <label>Destination prefix (optional)</label>
          <input
            placeholder={hasFolders ? "blank = keep folder names as agent/date" : "e.g. Toni_May/05.30.26 (defaults to today)"}
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
          />
        </div>

        {hasFolders && (
          <label className="row" style={{ gap: 8, marginTop: 10, fontSize: 12.5, color: "var(--muted)", cursor: "pointer" }}>
            <input type="checkbox" style={{ width: "auto" }} checked={stripRoot} onChange={(e) => setStripRoot(e.target.checked)} />
            Ignore the top-level folder name (its contents become the agent/date structure)
          </label>
        )}

        {progress && (
          <div style={{ marginTop: 16 }}>
            <div className="row" style={{ justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
              <span className="muted">
                {progress.uploaded + progress.failed} / {progress.total} processed
                {progress.failed ? <span style={{ color: "var(--danger)" }}> · {progress.failed} failed</span> : null}
                {progress.skipped ? <span className="muted"> · {progress.skipped} skipped</span> : null}
              </span>
              <span style={{ fontWeight: 700 }}>{pct}%</span>
            </div>
            <div className="progress-track">
              <div className="seg done" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <button className="btn" style={{ marginTop: 14 }} disabled={busy} onClick={doUpload}>
          {busy ? <span className="spin" /> : <Glyph name="upload" />}
          {busy ? `Uploading… ${pct}%` : `Upload & process${audio.length ? ` (${audio.length})` : ""}`}
        </button>
      </div>

      <div className="card">
        <h3>Process existing Blob calls</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Point the worker at calls already in Blob. Give a folder prefix to process a whole batch,
          or an exact blob path for a single call.
        </p>
        <div className="field">
          <label>Blob path or prefix (within the calls container)</label>
          <input
            placeholder="e.g. Toni_May/05.01.26/   or   uploads/2026-06-09/call.mp3"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
          />
        </div>
        <button className="btn" style={{ marginTop: 14 }} disabled={busy} onClick={doTrigger}>
          {busy ? <span className="spin" /> : "Queue for processing"}
        </button>

        <hr className="div" />
        <h3>Scan everything</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Force an immediate scan of the entire calls container for unprocessed audio.
        </p>
        <button
          className="btn ghost"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const res = await api.scan();
              notify(`Scan complete — queued ${res.enqueued} new call(s).`);
              onDone?.();
            } catch (e) {
              notify(`Scan failed: ${e.message}`, true);
            } finally {
              setBusy(false);
            }
          }}
        >
          Scan now
        </button>
      </div>
    </div>
  );
}
