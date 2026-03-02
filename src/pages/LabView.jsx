import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import "./LabView.css";
import {
  fetchLabDetails,
  fetchLabInstructions,
  launchLab,
  fetchLabStatus,
  fetchLabVms,
  validateLab,
} from "../services/labsService";
import { API_ENDPOINTS } from "../config/api";
import TerminalPanel from "./TerminalPanel";
import TERMINAL_THEME from "../utils/terminalTheme";

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
const STATUS_STYLE = {
  idle: { bg: "var(--bg-surface-2)", color: "var(--text-secondary)", label: "Idle" },
  queued: { bg: "#fef9c3", color: "#854d0e", label: "Queued" },
  in_progress: { bg: "#dbeafe", color: "#1e40af", label: "Running" },
  completed_success: { bg: "#dcfce7", color: "#166534", label: "Succeeded" },
  completed_failure: { bg: "#fee2e2", color: "#991b1b", label: "Failed" },
  completed_cancelled: { bg: "#f3f4f6", color: "#6b7280", label: "Cancelled" },
  error: { bg: "#fee2e2", color: "#991b1b", label: "Error" },
};

const resolveStatusKey = (status, conclusion) => {
  if (!status || status === "idle") return "idle";
  if (status === "queued") return "queued";
  if (status === "in_progress") return "in_progress";
  if (status === "completed") {
    if (conclusion === "success") return "completed_success";
    if (conclusion === "failure") return "completed_failure";
    return "completed_cancelled";
  }
  return "idle";
};

const StatusBadge = ({ statusKey }) => {
  const s = STATUS_STYLE[statusKey] || STATUS_STYLE.idle;
  return (
    <span
      className="labview-status-badge"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
};


// ---------------------------------------------------------------------------
// CodeBlock — wraps fenced code blocks with a "▶ Run" button that injects the
// code into whichever terminal is currently active.
// Props:
//   writeFn   (text: string) => void | null   — provided by the active terminal
//   children  React node                      — the inner <code> element
//   node      AST node from react-markdown    — not forwarded to DOM
// ---------------------------------------------------------------------------
const CodeBlock = ({ writeFn, children, node, ...preProps }) => {
  const [btnState, setBtnState] = useState("idle"); // idle | sent | no-terminal

  const codeEl = Array.isArray(children) ? children[0] : children;
  const rawCode = codeEl?.props?.children ?? "";
  const code = Array.isArray(rawCode) ? rawCode.join("") : String(rawCode);
  const lang = codeEl?.props?.className?.replace("language-", "") || "txt";

  const handleRun = () => {
    if (!writeFn) {
      setBtnState("no-terminal");
      setTimeout(() => setBtnState("idle"), 1800);
      return;
    }
    const text = code.endsWith("\n") ? code : code + "\n";
    writeFn(text);
    setBtnState("sent");
    setTimeout(() => setBtnState("idle"), 1200);
  };

  const btnLabel = { idle: "▶ Run", sent: "✓ Sent", "no-terminal": "✗ No terminal" }[btnState];

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-block-lang">{lang}</span>
        <button
          className={`code-run-btn code-run-btn--${btnState}`}
          onClick={handleRun}
          title={writeFn ? "Run in active terminal" : "Switch to a terminal tab first"}
        >
          {btnLabel}
        </button>
      </div>
      <pre {...preProps}>{children}</pre>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ExecTerminalPanel — generic xterm.js panel that connects via a POST session
// endpoint then a WebSocket. Used for both Docker and K8s exec.
// Props:
//   name         string   — label shown in the status bar
//   createSession  async () => { sessionId }   — POST to create session
//   buildWsUrl   (sessionId) => string          — build the WS URL
// ---------------------------------------------------------------------------
const ExecTerminalPanel = ({ name, createSession, buildWsUrl, onReady }) => {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const wsRef = useRef(null);
  const pingRef = useRef(null);
  const [status, setStatus] = useState("Connecting…");
  const [error, setError] = useState(null);
  const [fontSize, setFontSize] = useState(13);

  useEffect(() => {
    if (!termRef.current) return;
    termRef.current.options.fontSize = fontSize;
    try { fitAddonRef.current?.fit(); } catch {}
  }, [fontSize]);

  const disconnect = useCallback(() => {
    clearInterval(pingRef.current);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const term = new Terminal({
      fontFamily: '"JetBrains Mono","Cascadia Code","IBM Plex Mono",monospace',
      fontSize,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: "block",
      theme: TERMINAL_THEME,
      allowTransparency: true,
      scrollback: 5000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);
    fitAddon.fit();
    termRef.current = term;
    fitAddonRef.current = fitAddon;

    const ro = new ResizeObserver(() => { try { fitAddon.fit(); } catch {} });
    ro.observe(containerRef.current);

    const connect = async () => {
      try {
        const { sessionId } = await createSession();
        if (cancelled) return;

        const ws = new WebSocket(buildWsUrl(sessionId));
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
        };

        ws.onmessage = (evt) => {
          if (cancelled) return;
          if (typeof evt.data === "string") {
            try {
              const msg = JSON.parse(evt.data);
              if (msg.type === "connected") {
                setStatus("Connected");
                setError(null);
                term.write("\r\n\x1b[32m▶ Session established\x1b[0m\r\n\r\n");
                ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
                onReady?.((text) => {
                  if (ws.readyState === WebSocket.OPEN)
                    ws.send(new TextEncoder().encode(text));
                });
                pingRef.current = setInterval(() => {
                  if (ws.readyState === WebSocket.OPEN)
                    ws.send(JSON.stringify({ type: "ping" }));
                }, 30000);
              } else if (msg.type === "error") {
                setStatus("Error");
                setError(msg.message);
                term.write(`\r\n\x1b[31m✖ ${msg.message}\x1b[0m\r\n`);
              } else if (msg.type === "disconnected") {
                setStatus("Disconnected");
                term.write("\r\n\x1b[33m◼ Session ended\x1b[0m\r\n");
              } else if (msg.type !== "pong") {
                term.write(evt.data);
              }
            } catch { term.write(evt.data); }
          } else {
            term.write(new Uint8Array(evt.data));
          }
        };

        term.onData((data) => {
          if (ws.readyState === WebSocket.OPEN)
            ws.send(new TextEncoder().encode(data));
        });
        term.onResize(({ cols, rows }) => {
          if (ws.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify({ type: "resize", cols, rows }));
        });

        ws.onerror = () => {
          if (cancelled) return;
          setStatus("Error");
          setError("WebSocket connection failed");
        };
        ws.onclose = (evt) => {
          if (cancelled) return;
          clearInterval(pingRef.current);
          setStatus("Disconnected");
          if (evt.code !== 1000)
            term.write(`\r\n\x1b[33m◼ Connection closed (${evt.code})\x1b[0m\r\n`);
        };
      } catch (err) {
        if (cancelled) return;
        setStatus("Error");
        setError(err.message);
      }
    };

    connect();

    return () => {
      cancelled = true;
      onReady?.(null);
      ro.disconnect();
      clearInterval(pingRef.current);
      if (wsRef.current) { try { wsRef.current.close(1000); } catch {} wsRef.current = null; }
      term.dispose();
      termRef.current = null;
    };
    // createSession, buildWsUrl, fontSize, and onReady are excluded intentionally:
    // createSession/buildWsUrl are stable callbacks from parent; fontSize is
    // handled by a separate effect that updates the live terminal without reconnecting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]); // re-mount when target changes

  const statusColor = status === "Connected" ? "#4caf50"
    : status.startsWith("Connecting") ? "#ff9800" : "#f44336";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "#0c0c0f", overflow: "hidden" }}>
      <div style={{ backgroundColor: "#1a1a1f", color: "#fff", padding: "0.4rem 0.85rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: "0.8rem", borderBottom: "1px solid #2a2a35", flexShrink: 0 }}>
        <span>
          <strong>{name}</strong>{" · "}
          <span style={{ color: statusColor }}>{status}</span>
          {error && <span style={{ color: "#f44336", marginLeft: "0.75rem" }}>{error}</span>}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#aaa", fontSize: "0.72rem", userSelect: "none" }}>
            <span style={{ fontSize: "0.8rem" }}>A</span>
            <input type="range" min="8" max="28" value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              style={{ width: "72px", accentColor: "#a3ff47", cursor: "pointer" }} />
            <span style={{ fontSize: "1rem" }}>A</span>
            <span style={{ minWidth: "1.8rem", textAlign: "right" }}>{fontSize}px</span>
          </label>
          <button onClick={disconnect} style={{ padding: "0.2rem 0.6rem", border: "1px solid #555",
            borderRadius: "4px", backgroundColor: "#333", color: "#fff", cursor: "pointer", fontSize: "0.75rem" }}>
            Disconnect
          </button>
        </div>
      </div>
      <div ref={containerRef} style={{ flex: 1, overflow: "hidden", padding: "4px" }} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// CodeServerPanel — renders an iframe embedding the code-server VS Code UI
// ---------------------------------------------------------------------------
const CodeServerPanel = ({ vm }) => {
  const url = vm.proxy_path || "/codeserver/";
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "#1e1e1e", overflow: "hidden" }}>
      <div style={{
        backgroundColor: "#1a1a1f", color: "#fff", padding: "0.4rem 0.85rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: "0.8rem", borderBottom: "1px solid #2a2a35", flexShrink: 0,
      }}>
        <span><strong>VS Code Server</strong></span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "0.2rem 0.6rem", border: "1px solid #555", borderRadius: "4px",
            backgroundColor: "#333", color: "#fff", textDecoration: "none", fontSize: "0.75rem",
          }}
        >
          Open in New Tab ↗
        </a>
      </div>
      <iframe
        src={url}
        style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
        title="VS Code Server"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// ChromiumPanel — renders an iframe embedding the Chromium KasmVNC UI
// ---------------------------------------------------------------------------
const ChromiumPanel = ({ vm }) => {
  const url = vm.proxy_path || "/chromium/";
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "#1e1e1e", overflow: "hidden" }}>
      <div style={{
        backgroundColor: "#1a1a1f", color: "#fff", padding: "0.4rem 0.85rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: "0.8rem", borderBottom: "1px solid #2a2a35", flexShrink: 0,
      }}>
        <span><strong>Chromium Browser</strong></span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "0.2rem 0.6rem", border: "1px solid #555", borderRadius: "4px",
            backgroundColor: "#333", color: "#fff", textDecoration: "none", fontSize: "0.75rem",
          }}
        >
          Open in New Tab ↗
        </a>
      </div>
      <iframe
        src={url}
        style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
        title="Chromium Browser"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// ActiveTerminalTab — renders the correct terminal for the selected VM tab
// ---------------------------------------------------------------------------
const ActiveTerminalTab = ({ vms, activeTab, onTerminalReady }) => {
  const vm = vms.find((v) => String(v.vmid) === activeTab);
  if (!vm) return null;

  if (vm.type === "codeserver") {
    return <CodeServerPanel key={vm.vmid} vm={vm} />;
  }

  if (vm.type === "chromium") {
    return <ChromiumPanel key={vm.vmid} vm={vm} />;
  }

  if (vm.type === "docker") {
    return (
      <ExecTerminalPanel
        key={vm.container_id}
        name={vm.name}
        onReady={onTerminalReady}
        createSession={() =>
          fetch(API_ENDPOINTS.DOCKER_CONTAINER_EXEC_SESSION(vm.container_id), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shell: "auto" }),
          }).then((r) => r.json())
        }
        buildWsUrl={(sid) => API_ENDPOINTS.DOCKER_CONTAINER_EXEC_WEBSOCKET(sid)}
      />
    );
  }

  if (vm.type === "k8s") {
    return (
      <ExecTerminalPanel
        key={`${vm.namespace}/${vm.pod}`}
        name={vm.name}
        onReady={onTerminalReady}
        createSession={() =>
          fetch(API_ENDPOINTS.K8S_POD_EXEC_SESSION(vm.namespace, vm.pod), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shell: "auto" }),
          }).then((r) => r.json())
        }
        buildWsUrl={(sid) => API_ENDPOINTS.K8S_POD_EXEC_WEBSOCKET(sid)}
      />
    );
  }

  // Default: SSH terminal for Proxmox VMs
  return <TerminalPanel key={vm.vmid} vmid={vm.vmid} name={vm.name} onReady={onTerminalReady} />;
};

// ---------------------------------------------------------------------------
// LabView
// ---------------------------------------------------------------------------
const LabView = () => {
  const { labId } = useParams();
  const navigate = useNavigate();

  const decodedId = decodeURIComponent(labId);

  const [lab, setLab] = useState(null);
  const [instructions, setInstructions] = useState("");
  const [loadError, setLoadError] = useState(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState(null);
  const [runStatus, setRunStatus] = useState({ status: "idle", conclusion: null });
  const [vms, setVms] = useState([]);
  const [activeTab, setActiveTab] = useState("status");
  const [terminalWriteFn, setTerminalWriteFn] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validationBanner, setValidationBanner] = useState(null); // { passed, output } | null
  const validationTimerRef = useRef(null);
  const [chromiumUrl, setChromiumUrl] = useState("https://www.google.com");

  const handleTerminalReady = useCallback((fn) => {
    setTerminalWriteFn(() => fn ?? null);
  }, []);

  const markdownComponents = useMemo(() => ({
    pre: (props) => <CodeBlock writeFn={terminalWriteFn} {...props} />,
  }), [terminalWriteFn]);

  const pollRef = useRef(null);

  // Load lab details + instructions
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [labData, md] = await Promise.all([
          fetchLabDetails(decodedId),
          fetchLabInstructions(decodedId),
        ]);
        if (!mounted) return;
        setLab(labData);
        setInstructions(md);
        document.title = `Lab: ${labData.name}`;
      } catch (err) {
        if (!mounted) return;
        setLoadError(err.message);
      }
    };
    load();
    return () => { mounted = false; };
  }, [decodedId]);

  // Status polling
  const pollStatus = useCallback(async () => {
    try {
      const s = await fetchLabStatus(decodedId);
      setRunStatus(s);
    } catch {
      // silently ignore poll errors
    }
  }, [decodedId]);

  useEffect(() => {
    pollStatus();
    pollRef.current = setInterval(pollStatus, 10000);
    return () => clearInterval(pollRef.current);
  }, [pollStatus]);

  // VM polling
  const pollVms = useCallback(async () => {
    try {
      const vmList = await fetchLabVms(decodedId);
      setVms(vmList);
    } catch {
      // silently ignore
    }
  }, [decodedId]);

  useEffect(() => {
    pollVms();
    const id = setInterval(pollVms, 10000);
    return () => clearInterval(id);
  }, [pollVms]);

  // Launch handler
  const handleLaunch = async () => {
    setLaunchError(null);
    setLaunching(true);
    try {
      const extraParams = lab?.type === "chromium" ? { chrome_url: chromiumUrl } : {};
      await launchLab(decodedId, "deploy", extraParams);
      setRunStatus({ status: "queued", conclusion: null });
      // Start polling immediately after launch
      await pollStatus();
    } catch (err) {
      setLaunchError(err.message);
    } finally {
      setLaunching(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    clearTimeout(validationTimerRef.current);
    try {
      const result = await validateLab(decodedId);
      setValidationBanner(result);
      validationTimerRef.current = setTimeout(() => setValidationBanner(null), 7000);
    } catch (err) {
      setValidationBanner({ passed: false, output: err.message });
      validationTimerRef.current = setTimeout(() => setValidationBanner(null), 7000);
    } finally {
      setValidating(false);
    }
  };

  const statusKey = resolveStatusKey(runStatus.status, runStatus.conclusion);
  const isRunning = runStatus.status === "in_progress" || runStatus.status === "queued";

  if (loadError) {
    return (
      <div className="labview-error-screen">
        <p>Failed to load lab: {loadError}</p>
        <button onClick={() => navigate("/labs")} className="labview-back-btn">
          ← Back to Labs
        </button>
      </div>
    );
  }

  return (
    <div className="labview-container">
      {/* Top bar */}
      <div className="labview-topbar">
        <div className="labview-topbar-left">
          <button className="labview-back-btn" onClick={() => navigate("/labs")}>
            ← Labs
          </button>
          <span className="labview-lab-name">{lab ? lab.name : "Loading…"}</span>
        </div>
        <div className="labview-topbar-right">
          <StatusBadge statusKey={statusKey} />
          {runStatus.html_url && (
            <a
              href={runStatus.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="labview-gh-link"
            >
              View on GitHub ↗
            </a>
          )}
          {lab?.validation && (
            <button
              className="labview-check-btn"
              onClick={handleValidate}
              disabled={validating}
              title="Run the lab validation script"
            >
              {validating ? "Checking…" : "✓ Check"}
            </button>
          )}
          {lab?.type === "chromium" && (
            <input
              type="url"
              className="labview-chromium-url-input"
              value={chromiumUrl}
              onChange={(e) => setChromiumUrl(e.target.value)}
              placeholder="https://www.google.com"
              title="URL for Chromium to open on launch"
              disabled={launching || isRunning}
            />
          )}
          <button
            className="labview-launch-btn"
            onClick={handleLaunch}
            disabled={launching || isRunning}
          >
            {launching ? "Launching…" : isRunning ? "Running…" : "Launch"}
          </button>
        </div>
      </div>

      {/* Launch error */}
      {launchError && (
        <div className="labview-launch-error">
          <strong>Launch failed:</strong> {launchError}
        </div>
      )}

      {/* Validation banner */}
      {validationBanner && (
        <div className={`labview-validation-banner labview-validation-banner--${validationBanner.passed ? "pass" : "fail"}`}>
          <span className="labview-validation-banner-icon">
            {validationBanner.passed ? "✓" : "✗"}
          </span>
          <span className="labview-validation-banner-text">
            {validationBanner.passed ? "Validation passed" : "Validation failed"}
            {validationBanner.output && (
              <span className="labview-validation-banner-output"> — {validationBanner.output.split("\n")[0]}</span>
            )}
          </span>
          <button
            className="labview-validation-banner-close"
            onClick={() => { clearTimeout(validationTimerRef.current); setValidationBanner(null); }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Split pane */}
      <div className="labview-split">
        {/* Left: instructions */}
        <div className="labview-instructions">
          <div className="labview-instructions-inner">
            {lab ? (
              <ReactMarkdown components={markdownComponents}>{instructions}</ReactMarkdown>
            ) : (
              <p className="labview-loading">Loading instructions…</p>
            )}
          </div>

          {/* Tips section */}
          {lab?.tips?.length > 0 && (
            <div className="labview-hints-section">
              <details className="labview-hints-details">
                <summary className="labview-hints-summary labview-hints-summary--tips">
                  <span className="labview-hints-icon">💡</span>
                  Tips <span className="labview-hints-count">({lab.tips.length})</span>
                </summary>
                <div className="labview-hints-body">
                  {lab.tips.map((tip, i) => (
                    <div key={i} className="labview-hint-item labview-hint-item--tip">
                      {typeof tip === "string" ? (
                        <ReactMarkdown components={markdownComponents}>{tip}</ReactMarkdown>
                      ) : (
                        <>
                          {tip.title && <div className="labview-hint-title">{tip.title}</div>}
                          <ReactMarkdown components={markdownComponents}>{tip.content || ""}</ReactMarkdown>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {/* Solutions section */}
          {lab?.solutions?.length > 0 && (
            <div className="labview-hints-section">
              <details className="labview-hints-details">
                <summary className="labview-hints-summary labview-hints-summary--solutions">
                  <span className="labview-hints-icon">🔑</span>
                  Solutions <span className="labview-hints-count">({lab.solutions.length})</span>
                </summary>
                <div className="labview-hints-body">
                  {lab.solutions.map((sol, i) => {
                    const isObj = typeof sol === "object" && sol !== null;
                    const title = isObj ? sol.title : null;
                    const content = isObj ? (sol.content || "") : String(sol);
                    return (
                      <details key={i} className="labview-solution-item">
                        <summary className="labview-solution-summary">
                          {title || `Solution ${i + 1}`}
                        </summary>
                        <div className="labview-solution-body">
                          <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Right: tabbed console / VNC pane */}
        <div className="labview-console">
          {/* Tab bar */}
          <div className="labview-tab-bar">
            <button
              className={`labview-tab${activeTab === "status" ? " labview-tab--active" : ""}`}
              onClick={() => setActiveTab("status")}
            >
              Status
              {vms.length > 0 && (
                <span className="labview-tab-badge">{vms.length}</span>
              )}
            </button>
            {vms.map((vm) => (
              <button
                key={vm.vmid}
                className={`labview-tab${activeTab === String(vm.vmid) ? " labview-tab--active" : ""}`}
                onClick={() => setActiveTab(String(vm.vmid))}
              >
                {vm.name}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="labview-tab-content">
            {activeTab === "status" ? (
              <div className="labview-console-body">
                {statusKey === "idle" && (
                  <div className="labview-console-message">
                    Click <strong>Launch</strong> to start this lab via GitHub Actions.
                  </div>
                )}
                {statusKey === "queued" && (
                  <div className="labview-console-message labview-console-message--info">
                    Job queued — waiting for a runner…
                  </div>
                )}
                {statusKey === "in_progress" && (
                  <div className="labview-console-message labview-console-message--info">
                    <span className="labview-spinner" /> Lab is running…
                    <br />
                    <small>Status updates every 10 seconds.</small>
                  </div>
                )}
                {statusKey === "completed_success" && (
                  <div className="labview-console-message labview-console-message--success">
                    Lab deployed successfully!
                  </div>
                )}
                {statusKey === "completed_failure" && (
                  <div className="labview-console-message labview-console-message--error">
                    Lab run failed. Check the GitHub Actions log for details.
                  </div>
                )}
                {statusKey === "completed_cancelled" && (
                  <div className="labview-console-message">
                    Run was cancelled.
                  </div>
                )}
                {runStatus.html_url && (
                  <a
                    href={runStatus.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="labview-gh-full-link"
                  >
                    Open full run log on GitHub ↗
                  </a>
                )}
              </div>
            ) : (
              <ActiveTerminalTab vms={vms} activeTab={activeTab} onTerminalReady={handleTerminalReady} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabView;
