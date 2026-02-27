import React, { useEffect, useRef, useState } from "react";
import RFB from "@novnc/novnc/lib/rfb.js";
import { API_ENDPOINTS } from "../config/api";
import { createVNCProxy } from "../services/vmService";

// ---------------------------------------------------------------------------
// Module-level session registry
//
// Sessions live here, outside React's lifecycle.  When VncPanel unmounts
// (page navigation) the RFB connection and canvas div are kept alive.
// When VncPanel remounts it just re-attaches the existing canvas — no
// reconnect, no framebuffer repaint problem.
//
// Shape: Map<string, {
//   container : HTMLElement   — the div noVNC renders into
//   rfb       : RFB | null
//   status    : string
//   error     : string | null
//   notify    : fn | null     — updates the currently-mounted component
// }>
// ---------------------------------------------------------------------------
const sessions = new Map();

function _updateSession(key, status, error = null) {
  const s = sessions.get(key);
  if (!s) return;
  s.status = status;
  s.error = error;
  s.notify?.({ status, error });
}

async function _startConnection(key, vmid) {
  // Small pause so any in-flight proxy close on the Proxmox side finishes
  await new Promise((r) => setTimeout(r, 300));
  if (!sessions.has(key)) return;

  try {
    const { ticket, port, node } = await createVNCProxy(vmid);
    if (!sessions.has(key)) return;

    const session = sessions.get(key);
    const wsUrl = API_ENDPOINTS.VNC_WEBSOCKET(vmid, port, ticket, node);

    const rfb = new RFB(session.container, wsUrl, {
      credentials: { password: ticket },
      wsProtocols: ["binary"],
    });
    // Scale the viewport to fit the panel; don't resize the VM's actual
    // display — that sends terminal resize signals and clears the login prompt.
    rfb.scaleViewport = true;
    rfb.resizeSession = false;

    rfb.addEventListener("connect", () => {
      _updateSession(key, "Connected");
      // Send Enter once the session settles so the terminal repaints its prompt.
      setTimeout(() => {
        if (sessions.get(key)?.rfb === rfb) {
          rfb.sendKey(0xff0d, "Enter");
        }
      }, 500);
    });

    rfb.addEventListener("disconnect", (e) => {
      if (!sessions.has(key)) return;
      _updateSession(
        key,
        "Disconnected",
        e.detail.clean ? null : "Connection lost — click ↺ to reconnect",
      );
    });

    rfb.addEventListener("securityfailure", (e) => {
      _updateSession(key, "Error", `Security error: ${e.detail.reason}`);
    });

    session.rfb = rfb;
  } catch (err) {
    _updateSession(key, "Error", err.message);
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const BTN = {
  padding: "0.2rem 0.6rem",
  border: "1px solid #555",
  borderRadius: "4px",
  backgroundColor: "#333",
  color: "#fff",
  cursor: "pointer",
  fontSize: "0.75rem",
};

const VncPanel = ({ vmid, name }) => {
  const wrapperRef = useRef(null);
  const key = String(vmid);

  // Initialise from the existing session if one is already running
  const [uiState, setUiState] = useState(() => {
    const s = sessions.get(key);
    return { status: s?.status ?? "Connecting…", error: s?.error ?? null };
  });

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let session = sessions.get(key);

    if (!session) {
      // First time this vmid has been opened — create a new session
      const container = document.createElement("div");
      container.style.cssText = "width:100%;height:100%;overflow:hidden;";
      session = { container, rfb: null, status: "Connecting…", error: null, notify: null };
      sessions.set(key, session);
      _startConnection(key, vmid);
    } else {
      // Existing session (page navigated away and back) — restore UI state
      setUiState({ status: session.status, error: session.error });
    }

    // Wire up the live status → React state bridge
    session.notify = ({ status, error }) => setUiState({ status, error });

    // Attach the persistent canvas container to the React-managed wrapper
    wrapper.appendChild(session.container);

    return () => {
      // Detach on unmount but leave the session and RFB connection alive
      if (session.container.parentElement === wrapper) {
        wrapper.removeChild(session.container);
      }
      session.notify = null;
    };
  }, [key, vmid]);

  const reconnect = () => {
    const session = sessions.get(key);
    if (!session) return;

    // Disconnect and clear old RFB
    if (session.rfb) {
      try { session.rfb.disconnect(); } catch { /* ignore */ }
      session.rfb = null;
    }

    // Clear the noVNC canvas so the new RFB starts with a clean container
    while (session.container.firstChild) {
      session.container.removeChild(session.container.firstChild);
    }

    session.status = "Connecting…";
    session.error = null;
    setUiState({ status: "Connecting…", error: null });
    _startConnection(key, vmid);
  };

  const { status, error } = uiState;
  const session = sessions.get(key);
  const isDisconnected = status === "Disconnected" || status === "Error";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "#000", overflow: "hidden" }}>
      {/* Status bar */}
      <div style={{
        backgroundColor: "#1e1e1e",
        color: "#fff",
        padding: "0.4rem 0.85rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "0.8rem",
        borderBottom: "1px solid #333",
        flexShrink: 0,
      }}>
        <span>
          <strong>{name}</strong>
          {" · "}
          <span style={{
            color: status === "Connected" ? "#4caf50" :
                   status.startsWith("Connecting") ? "#ff9800" : "#888",
          }}>
            {status}
          </span>
          {error && <span style={{ color: "#f44336", marginLeft: "0.75rem" }}>{error}</span>}
        </span>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {isDisconnected && (
            <button onClick={reconnect} style={{ ...BTN, borderColor: "#58a6ff", color: "#58a6ff" }}>
              Reconnect
            </button>
          )}
          <button onClick={() => session?.rfb?.sendCtrlAltDel()} style={BTN}>
            Ctrl+Alt+Del
          </button>
          <button onClick={reconnect} style={BTN} title="Force a fresh connection">
            ↺
          </button>
        </div>
      </div>

      {/* noVNC renders into the persistent container which we imperatively
          attach here — React does not manage this child. */}
      <div ref={wrapperRef} style={{ flex: 1, overflow: "hidden" }} />
    </div>
  );
};

export default VncPanel;
