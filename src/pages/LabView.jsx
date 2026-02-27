import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import "./LabView.css";
import {
  fetchLabDetails,
  fetchLabInstructions,
  launchLab,
  fetchLabStatus,
  fetchLabVms,
} from "../services/labsService";
import VncPanel from "./VncPanel";

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
  // Track which VM tabs have ever been opened so we never unmount their VncPanels
  const [mountedVms, setMountedVms] = useState(new Set());

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
      await launchLab(decodedId);
      setRunStatus({ status: "queued", conclusion: null });
      // Start polling immediately after launch
      await pollStatus();
    } catch (err) {
      setLaunchError(err.message);
    } finally {
      setLaunching(false);
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

      {/* Split pane */}
      <div className="labview-split">
        {/* Left: instructions */}
        <div className="labview-instructions">
          <div className="labview-instructions-inner">
            {lab ? (
              <ReactMarkdown>{instructions}</ReactMarkdown>
            ) : (
              <p className="labview-loading">Loading instructions…</p>
            )}
          </div>
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
                onClick={() => {
                  const id = String(vm.vmid);
                  setMountedVms((prev) => new Set([...prev, id]));
                  setActiveTab(id);
                }}
              >
                {vm.name}
              </button>
            ))}
          </div>

          {/* Tab content — all panels are absolutely stacked; only active one is visible */}
          <div className="labview-tab-content">
            {/* Status panel */}
            <div className={`labview-tab-panel${activeTab === "status" ? " labview-tab-panel--active" : ""}`}>
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
            </div>

            {/* VNC panels — mounted on first open, never unmounted after that */}
            {vms.map((vm) => {
              const tabId = String(vm.vmid);
              if (!mountedVms.has(tabId)) return null;
              return (
                <div
                  key={vm.vmid}
                  className={`labview-tab-panel${activeTab === tabId ? " labview-tab-panel--active" : ""}`}
                >
                  <VncPanel vmid={vm.vmid} name={vm.name} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabView;
