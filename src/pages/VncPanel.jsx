import React, { useEffect, useRef, useState } from "react";
import RFB from "@novnc/novnc/lib/rfb.js";
import { API_ENDPOINTS } from "../config/api";
import { createVNCProxy } from "../services/vmService";

const VncPanel = ({ vmid, name }) => {
  const containerRef = useRef(null);
  const rfbRef = useRef(null);
  const [status, setStatus] = useState("Connecting…");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const connect = async () => {
      try {
        const { ticket, port, node } = await createVNCProxy(vmid);
        if (cancelled) return;

        const wsUrl = API_ENDPOINTS.VNC_WEBSOCKET(vmid, port, ticket, node);
        const rfb = new RFB(containerRef.current, wsUrl, {
          credentials: { password: ticket },
        });

        rfb.scaleViewport = true;
        rfb.resizeSession = true;

        rfb.addEventListener("connect", () => {
          if (!cancelled) setStatus("Connected");
        });

        rfb.addEventListener("disconnect", (e) => {
          if (cancelled) return;
          if (e.detail.clean) {
            setStatus("Disconnected");
          } else {
            setStatus("Disconnected (error)");
            setError("Connection lost unexpectedly");
          }
        });

        rfb.addEventListener("securityfailure", (e) => {
          if (!cancelled) {
            setError(`Security error: ${e.detail.reason}`);
            setStatus("Error");
          }
        });

        rfbRef.current = rfb;
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setStatus("Error");
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (rfbRef.current) {
        try {
          rfbRef.current.disconnect();
        } catch {
          // ignore
        }
        rfbRef.current = null;
      }
    };
  }, [vmid]);

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#000",
      overflow: "hidden",
    }}>
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
                   status.startsWith("Connecting") ? "#ff9800" : "#f44336",
          }}>
            {status}
          </span>
          {error && (
            <span style={{ color: "#f44336", marginLeft: "0.75rem" }}>
              {error}
            </span>
          )}
        </span>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            onClick={() => rfbRef.current?.sendCtrlAltDel()}
            style={{
              padding: "0.2rem 0.6rem",
              border: "1px solid #555",
              borderRadius: "4px",
              backgroundColor: "#333",
              color: "#fff",
              cursor: "pointer",
              fontSize: "0.75rem",
            }}
          >
            Ctrl+Alt+Del
          </button>
          <button
            onClick={() => {
              if (rfbRef.current) {
                rfbRef.current.scaleViewport = !rfbRef.current.scaleViewport;
              }
            }}
            style={{
              padding: "0.2rem 0.6rem",
              border: "1px solid #555",
              borderRadius: "4px",
              backgroundColor: "#333",
              color: "#fff",
              cursor: "pointer",
              fontSize: "0.75rem",
            }}
          >
            Toggle Scale
          </button>
        </div>
      </div>

      {/* VNC viewport */}
      <div
        ref={containerRef}
        style={{ flex: 1, overflow: "hidden" }}
      />
    </div>
  );
};

export default VncPanel;
