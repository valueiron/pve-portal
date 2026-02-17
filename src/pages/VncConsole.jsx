import React, { useEffect, useRef, useState } from "react";
import RFB from "@novnc/novnc/lib/rfb.js";
import { API_ENDPOINTS } from "../config/api";

const VncConsole = () => {
    const vncContainerRef = useRef(null);
    const rfbRef = useRef(null);
    const [status, setStatus] = useState("Connecting...");
    const [error, setError] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const vmid = params.get("vmid");
        const port = params.get("port");
        const vncticket = params.get("vncticket");
        const node = params.get("node");
        const vmName = params.get("name") || `VM ${vmid}`;

        document.title = `Console - ${vmName}`;

        if (!vmid || !port || !vncticket || !node) {
            setError("Missing required parameters");
            setStatus("Error");
            return;
        }

        const wsUrl = API_ENDPOINTS.VNC_WEBSOCKET(vmid, port, vncticket, node);

        try {
            const rfb = new RFB(vncContainerRef.current, wsUrl, {
                credentials: { password: vncticket },
            });

            rfb.scaleViewport = true;
            rfb.resizeSession = true;

            rfb.addEventListener("connect", () => {
                setStatus("Connected");
            });

            rfb.addEventListener("disconnect", (e) => {
                if (e.detail.clean) {
                    setStatus("Disconnected");
                } else {
                    setStatus("Disconnected (error)");
                    setError("Connection lost unexpectedly");
                }
            });

            rfb.addEventListener("securityfailure", (e) => {
                setError(`Security error: ${e.detail.reason}`);
                setStatus("Error");
            });

            rfbRef.current = rfb;
        } catch (err) {
            setError(`Failed to initialize VNC: ${err.message}`);
            setStatus("Error");
        }

        return () => {
            if (rfbRef.current) {
                try {
                    rfbRef.current.disconnect();
                } catch (e) {
                    // ignore
                }
                rfbRef.current = null;
            }
        };
    }, []);

    return (
        <div style={{
            width: "100vw",
            height: "100vh",
            backgroundColor: "#000",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
        }}>
            {/* Status bar */}
            <div style={{
                backgroundColor: "#1e1e1e",
                color: "#fff",
                padding: "0.5rem 1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.85rem",
                borderBottom: "1px solid #333",
                flexShrink: 0,
            }}>
                <span>
                    <strong>Status:</strong>{" "}
                    <span style={{
                        color: status === "Connected" ? "#4caf50" :
                               status === "Connecting..." ? "#ff9800" : "#f44336"
                    }}>
                        {status}
                    </span>
                    {error && (
                        <span style={{ color: "#f44336", marginLeft: "1rem" }}>
                            {error}
                        </span>
                    )}
                </span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                        onClick={() => {
                            if (rfbRef.current) {
                                rfbRef.current.sendCtrlAltDel();
                            }
                        }}
                        style={{
                            padding: "0.25rem 0.75rem",
                            border: "1px solid #555",
                            borderRadius: "4px",
                            backgroundColor: "#333",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                        }}
                    >
                        Ctrl+Alt+Del
                    </button>
                    <button
                        onClick={() => {
                            if (rfbRef.current) {
                                const isFullscreen = rfbRef.current.scaleViewport;
                                rfbRef.current.scaleViewport = !isFullscreen;
                            }
                        }}
                        style={{
                            padding: "0.25rem 0.75rem",
                            border: "1px solid #555",
                            borderRadius: "4px",
                            backgroundColor: "#333",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                        }}
                    >
                        Toggle Scale
                    </button>
                </div>
            </div>

            {/* VNC viewport */}
            <div
                ref={vncContainerRef}
                style={{
                    flex: 1,
                    overflow: "hidden",
                }}
            />
        </div>
    );
};

export default VncConsole;
