import React, { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { API_ENDPOINTS } from "../config/api";
import { createTerminalSession } from "../services/vmService";
import "@xterm/xterm/css/xterm.css";

const TERMINAL_THEME = {
  background: "#0c0c0f",
  foreground: "#c8d0e0",
  cursor: "#a3ff47",
  cursorAccent: "#0c0c0f",
  black: "#000000",
  red: "#ff4444",
  green: "#44cc44",
  yellow: "#dddd00",
  blue: "#4488cc",
  magenta: "#aa44cc",
  cyan: "#44aacc",
  white: "#c8d0e0",
  brightBlack: "#444444",
  brightRed: "#ff8888",
  brightGreen: "#88ee88",
  brightYellow: "#eeee44",
  brightBlue: "#88aadd",
  brightMagenta: "#cc88ee",
  brightCyan: "#88ccdd",
  brightWhite: "#ffffff",
  selectionBackground: "rgba(163, 255, 71, 0.25)",
};

const TerminalPanel = ({ vmid, name }) => {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const wsRef = useRef(null);
  const pingRef = useRef(null);

  const [status, setStatus] = useState("Connecting…");
  const [error, setError] = useState(null);
  const [fontSize, setFontSize] = useState(13);

  // Update font size on the live terminal whenever the slider moves
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

    // ── Initialize xterm ──────────────────────────────────────────────
    const term = new Terminal({
      fontFamily: '"JetBrains Mono", "Cascadia Code", "IBM Plex Mono", monospace',
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

    const ro = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {}
    });
    ro.observe(containerRef.current);

    // ── Create SSH session then open WebSocket ────────────────────────
    const connect = async () => {
      try {
        const { sessionId } = await createTerminalSession(vmid);
        if (cancelled) return;

        const wsUrl = API_ENDPOINTS.TERMINAL_WEBSOCKET(sessionId);
        const ws = new WebSocket(wsUrl);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        ws.onmessage = (evt) => {
          if (cancelled) return;
          if (typeof evt.data === "string") {
            try {
              const msg = JSON.parse(evt.data);
              if (msg.type === "connected") {
                setStatus("Connected");
                setError(null);
                term.write("\r\n\x1b[32m▶ Session established\x1b[0m\r\n\r\n");
                pingRef.current = setInterval(() => {
                  if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: "ping" }));
                  }
                }, 30000);
              } else if (msg.type === "error") {
                setStatus("Error");
                setError(msg.message);
                term.write(`\r\n\x1b[31m✖ ${msg.message}\x1b[0m\r\n`);
              } else if (msg.type === "disconnected") {
                setStatus("Disconnected");
                term.write("\r\n\x1b[33m◼ Session ended\x1b[0m\r\n");
              } else if (msg.type === "pong") {
                // keep-alive ack
              } else {
                term.write(evt.data);
              }
            } catch {
              term.write(evt.data);
            }
          } else {
            term.write(new Uint8Array(evt.data));
          }
        };

        // Forward keystrokes → WebSocket
        term.onData((data) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        });

        // Forward resize events → WebSocket
        term.onResize(({ cols, rows }) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "resize", cols, rows }));
          }
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
          if (evt.code !== 1000) {
            term.write(`\r\n\x1b[33m◼ Connection closed (${evt.code})\x1b[0m\r\n`);
          }
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
      ro.disconnect();
      clearInterval(pingRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close(1000);
        } catch {}
        wsRef.current = null;
      }
      term.dispose();
      termRef.current = null;
    };
  }, [vmid]);

  const statusColor =
    status === "Connected"
      ? "#4caf50"
      : status.startsWith("Connecting")
      ? "#ff9800"
      : "#f44336";

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0c0c0f",
        overflow: "hidden",
      }}
    >
      {/* Status bar */}
      <div
        style={{
          backgroundColor: "#1a1a1f",
          color: "#fff",
          padding: "0.4rem 0.85rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.8rem",
          borderBottom: "1px solid #2a2a35",
          flexShrink: 0,
        }}
      >
        <span>
          <strong>{name}</strong>
          {" · "}
          <span style={{ color: statusColor }}>{status}</span>
          {error && (
            <span style={{ color: "#f44336", marginLeft: "0.75rem" }}>
              {error}
            </span>
          )}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Font size slider */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#aaa", fontSize: "0.72rem", userSelect: "none" }}>
            <span style={{ fontSize: "0.8rem" }}>A</span>
            <input
              type="range"
              min="8"
              max="28"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              style={{ width: "72px", accentColor: "#a3ff47", cursor: "pointer" }}
            />
            <span style={{ fontSize: "1rem" }}>A</span>
            <span style={{ minWidth: "1.8rem", textAlign: "right" }}>{fontSize}px</span>
          </label>

          <button
            onClick={disconnect}
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
            Disconnect
          </button>
        </div>
      </div>

      {/* xterm.js viewport */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "hidden",
          padding: "4px",
        }}
      />
    </div>
  );
};

export default TerminalPanel;
