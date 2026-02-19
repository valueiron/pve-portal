import React, { useState, useEffect, useMemo } from "react";
import {
    FaPlay, FaStop, FaSyncAlt, FaSearch, FaTh, FaTable, FaDocker,
    FaFileAlt, FaDatabase, FaNetworkWired, FaServer, FaMemory,
    FaMicrochip, FaHdd, FaCube, FaLayerGroup, FaInfoCircle
} from "react-icons/fa";
import "./Page.css";
import {
    fetchContainers, startContainer, stopContainer, restartContainer,
    fetchContainerLogs, fetchContainerMetrics,
    inspectContainer, inspectImage, inspectVolume, inspectNetwork,
    fetchImages, fetchVolumes, fetchDockerNetworks, fetchSystemInfo, fetchSystemDisk
} from "../services/dockerService";

const TABS = ["Containers", "Images", "Volumes", "Networks", "System"];

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

const formatDate = (ts) => {
    if (!ts) return "—";
    return new Date(ts * 1000).toLocaleString();
};

const getStateColor = (state) => {
    switch ((state || "").toLowerCase()) {
        case "running": return "#4caf50";
        case "paused": return "#ff9800";
        case "exited":
        case "dead": return "#f44336";
        default: return "#9e9e9e";
    }
};

// ── Metrics Modal ─────────────────────────────────────────────────────────────

const MetricBar = ({ label, value, max, unit, color }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const barColor = color || (pct > 85 ? "#f44336" : pct > 60 ? "#ff9800" : "#4caf50");
    return (
        <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
                marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: "600", textTransform: "uppercase",
                    letterSpacing: "0.05em", color: "var(--text-secondary)" }}>{label}</span>
                <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-primary)" }}>
                    {value.toFixed(2)}{unit}
                    {max > 0 && <span style={{ fontWeight: "400", color: "var(--text-secondary)",
                        fontSize: "0.78rem" }}> / {max.toFixed(2)}{unit} ({pct.toFixed(1)}%)</span>}
                </span>
            </div>
            <div style={{ height: "8px", borderRadius: "4px", background: "var(--border-subtle)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, borderRadius: "4px",
                    background: barColor, transition: "width 0.4s ease" }} />
            </div>
        </div>
    );
};

const MetricStat = ({ label, value, icon }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "var(--bg-surface-1)", border: "1px solid var(--border-subtle)",
        borderRadius: "8px", padding: "0.85rem 1rem", gap: "0.2rem", minWidth: 0 }}>
        <div style={{ fontSize: "1rem", color: "var(--text-secondary)" }}>{icon}</div>
        <div style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)" }}>{value}</div>
        <div style={{ fontSize: "0.68rem", fontWeight: "600", textTransform: "uppercase",
            letterSpacing: "0.06em", color: "var(--text-secondary)" }}>{label}</div>
    </div>
);

const MetricsModal = ({ container, onClose }) => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [live, setLive] = useState(true);

    const isRunning = (container.state || "").toLowerCase() === "running";
    const displayName = (container.names?.[0] || container.id || "unknown").replace(/^\//, "");

    const fetch_ = async () => {
        try {
            setError(null);
            const data = await fetchContainerMetrics(container.id);
            setMetrics(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isRunning) { setLoading(false); return; }
        fetch_();
    }, []);

    useEffect(() => {
        if (!isRunning || !live) return;
        const id = setInterval(fetch_, 3000);
        return () => clearInterval(id);
    }, [live, isRunning]);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <div
            onClick={onClose}
            style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)",
                zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center",
                padding: "1rem" }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{ background: "var(--bg-surface-1)", border: "1px solid var(--border-default)",
                    borderRadius: "12px", width: "100%", maxWidth: "560px",
                    maxHeight: "90vh", display: "flex", flexDirection: "column",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}
            >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
                        <FaDocker style={{ color: "#2496ed", flexShrink: 0 }} />
                        <span style={{ fontWeight: "700", color: "var(--text-primary)",
                            fontSize: "1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {displayName}
                        </span>
                        <span style={{ padding: "0.2rem 0.55rem", borderRadius: "4px", flexShrink: 0,
                            backgroundColor: getStateColor(container.state), color: "#fff",
                            fontWeight: "600", textTransform: "uppercase", fontSize: "0.68rem" }}>
                            {container.state || "unknown"}
                        </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                        {isRunning && (
                            <button onClick={() => setLive(l => !l)} style={{
                                padding: "0.3rem 0.7rem", border: "1px solid",
                                borderColor: live ? "#4caf50" : "var(--border-default)",
                                borderRadius: "6px", background: live ? "rgba(76,175,80,0.12)" : "transparent",
                                color: live ? "#4caf50" : "var(--text-secondary)",
                                cursor: "pointer", fontSize: "0.75rem", fontWeight: "600",
                                display: "flex", alignItems: "center", gap: "0.3rem"
                            }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%",
                                    backgroundColor: live ? "#4caf50" : "var(--text-secondary)",
                                    display: "inline-block",
                                    animation: live ? "pulse 1.5s ease-in-out infinite" : "none" }} />
                                {live ? "Live" : "Paused"}
                            </button>
                        )}
                        {isRunning && !live && (
                            <button onClick={fetch_} style={{
                                padding: "0.3rem 0.7rem", border: "1px solid var(--border-default)",
                                borderRadius: "6px", background: "transparent",
                                color: "var(--text-secondary)", cursor: "pointer",
                                fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem"
                            }}>
                                <FaSyncAlt size={11} /> Refresh
                            </button>
                        )}
                        <button onClick={onClose} style={{ background: "none", border: "none",
                            color: "var(--text-secondary)", cursor: "pointer",
                            fontSize: "1.2rem", lineHeight: 1, padding: "0.2rem" }}>✕</button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>
                    {!isRunning && (
                        <div style={{ textAlign: "center", padding: "2rem 1rem",
                            color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                            <FaStop style={{ fontSize: "2rem", marginBottom: "0.75rem",
                                color: "#f44336", display: "block", margin: "0 auto 0.75rem" }} />
                            Metrics are only available for running containers.
                        </div>
                    )}

                    {isRunning && loading && (
                        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>
                            Loading metrics…
                        </p>
                    )}

                    {isRunning && error && (
                        <div style={{ background: "rgba(244,67,54,0.1)", border: "1px solid #f44336",
                            borderRadius: "8px", padding: "1rem", color: "#f44336", fontSize: "0.85rem" }}>
                            {error}
                        </div>
                    )}

                    {isRunning && !loading && !error && metrics && (
                        <>
                            {/* CPU */}
                            <MetricBar
                                label="CPU"
                                value={metrics.cpu_percent}
                                max={100}
                                unit="%"
                            />

                            {/* Memory */}
                            <MetricBar
                                label="Memory"
                                value={metrics.mem_usage_mib}
                                max={metrics.mem_limit_mib}
                                unit=" MiB"
                            />

                            {/* Stat grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                                gap: "0.6rem", marginTop: "1.25rem" }}>
                                <MetricStat label="Net RX" icon="↓"
                                    value={`${metrics.net_rx_mib.toFixed(2)} MiB`} />
                                <MetricStat label="Net TX" icon="↑"
                                    value={`${metrics.net_tx_mib.toFixed(2)} MiB`} />
                                <MetricStat label="PIDs" icon="⚙"
                                    value={metrics.pids} />
                                <MetricStat label="Block Read" icon="📥"
                                    value={`${metrics.block_read_mib.toFixed(2)} MiB`} />
                                <MetricStat label="Block Write" icon="📤"
                                    value={`${metrics.block_write_mib.toFixed(2)} MiB`} />
                                <MetricStat label="Mem %" icon="💾"
                                    value={`${metrics.mem_percent.toFixed(2)}%`} />
                            </div>

                            {/* ID */}
                            <div style={{ marginTop: "1.25rem", fontSize: "0.75rem",
                                color: "var(--text-secondary)", fontFamily: "monospace",
                                textAlign: "center" }}>
                                {metrics.container_id?.slice(0, 24)}…
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            `}</style>
        </div>
    );
};

// ── Inspect Modal ─────────────────────────────────────────────────────────────

const InspectModal = ({ type, name, data, onClose }) => {
    const [showRaw, setShowRaw] = useState(false);
    const [showEnv, setShowEnv] = useState(false);
    const [showLabels, setShowLabels] = useState(false);

    useEffect(() => {
        const h = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    // ── shared primitives ─────────────────────────────────────────────────────

    const KV = ({ label, value, mono }) => {
        if (value == null || value === "") return null;
        return (
            <div style={{ display: "grid", gridTemplateColumns: "150px 1fr",
                gap: "0.3rem 0.75rem", marginBottom: "0.4rem", alignItems: "start" }}>
                <span style={{ fontSize: "0.74rem", fontWeight: "600", textTransform: "uppercase",
                    letterSpacing: "0.05em", color: "var(--text-secondary)", paddingTop: "0.1rem" }}>
                    {label}
                </span>
                <span style={{ fontSize: "0.875rem", color: "var(--text-primary)",
                    fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all" }}>
                    {String(value)}
                </span>
            </div>
        );
    };

    const Section = ({ title, children }) => (
        <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase",
                letterSpacing: "0.08em", color: "var(--text-secondary)",
                marginBottom: "0.6rem", paddingBottom: "0.35rem",
                borderBottom: "1px solid var(--border-subtle)" }}>
                {title}
            </div>
            {children}
        </div>
    );

    const Collapse = ({ label, count, open, setOpen, children }) => (
        <div style={{ marginTop: "0.5rem" }}>
            <button onClick={() => setOpen(o => !o)} style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "0.4rem",
                color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: "600",
                padding: "0.3rem 0", textTransform: "uppercase", letterSpacing: "0.05em"
            }}>
                <span style={{ fontSize: "0.6rem" }}>{open ? "▼" : "▶"}</span>
                {label}
                {count != null && <span style={{ fontWeight: "400", color: "var(--text-secondary)",
                    opacity: 0.7 }}>({count})</span>}
            </button>
            {open && <div style={{ marginTop: "0.4rem" }}>{children}</div>}
        </div>
    );

    const CodeBlock = ({ children }) => (
        <div style={{ background: "var(--bg-surface-2)", borderRadius: "6px",
            padding: "0.6rem 0.8rem", maxHeight: "200px", overflowY: "auto" }}>
            {children}
        </div>
    );

    const CodeLine = ({ children }) => (
        <div style={{ fontFamily: "monospace", fontSize: "0.76rem",
            color: "var(--text-primary)", marginBottom: "0.15rem" }}>
            {children}
        </div>
    );

    const Pill = ({ text, color }) => (
        <span style={{ padding: "0.2rem 0.55rem", borderRadius: "4px",
            backgroundColor: color || "var(--bg-surface-2)",
            color: color ? "#fff" : "var(--text-primary)",
            fontWeight: "600", fontSize: "0.72rem", textTransform: "uppercase" }}>
            {text}
        </span>
    );

    // ── container ─────────────────────────────────────────────────────────────

    const renderContainer = () => {
        const state  = data.State       || {};
        const config = data.Config      || {};
        const hc     = data.HostConfig  || {};
        const ns     = data.NetworkSettings || {};
        const nets   = ns.Networks || {};
        const ports  = ns.Ports    || {};
        const mounts = data.Mounts || [];
        const env    = config.Env    || [];
        const labels = config.Labels || {};

        const portRows = Object.entries(ports)
            .filter(([, b]) => b?.length)
            .flatMap(([cp, bindings]) => bindings.map(b => ({ cp, b })));

        return (
            <>
                <Section title="Identity">
                    <KV label="Created"       value={data.Created ? new Date(data.Created).toLocaleString() : null} />
                    <KV label="Platform"      value={data.Platform} />
                    <KV label="Image SHA"     value={typeof data.Image === "string" ? data.Image.replace("sha256:", "").slice(0, 24) + "…" : null} mono />
                    <KV label="Driver"        value={data.Driver} />
                    <KV label="Restart Count" value={data.RestartCount} />
                </Section>

                <Section title="State">
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.65rem" }}>
                        <Pill text={state.Status || "unknown"} color={getStateColor(state.Status)} />
                        {state.OOMKilled  && <Pill text="OOM Killed"  color="#f44336" />}
                        {state.Dead       && <Pill text="Dead"        color="#f44336" />}
                        {state.Restarting && <Pill text="Restarting"  color="#ff9800" />}
                    </div>
                    <KV label="PID"         value={state.Pid > 0 ? state.Pid : null} />
                    <KV label="Exit Code"   value={state.ExitCode != null ? state.ExitCode : null} />
                    <KV label="Started At"  value={state.StartedAt  && !state.StartedAt.startsWith("0001")  ? new Date(state.StartedAt).toLocaleString()  : null} />
                    <KV label="Finished At" value={state.FinishedAt && !state.FinishedAt.startsWith("0001") ? new Date(state.FinishedAt).toLocaleString() : null} />
                    {state.Error && <KV label="Error" value={state.Error} />}
                </Section>

                <Section title="Command">
                    {config.Entrypoint?.length > 0 && <KV label="Entrypoint"   value={config.Entrypoint.join(" ")} mono />}
                    {config.Cmd?.length        > 0 && <KV label="Cmd"          value={config.Cmd.join(" ")}        mono />}
                    {config.WorkingDir         && <KV label="Working Dir"  value={config.WorkingDir}           mono />}
                    {config.User               && <KV label="User"         value={config.User} />}
                </Section>

                <Section title="Network">
                    {Object.entries(nets).map(([netName, ni]) => (
                        <div key={netName} style={{ marginBottom: "0.75rem" }}>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)",
                                fontWeight: "600", marginBottom: "0.3rem" }}>{netName}</div>
                            <KV label="IP Address"  value={ni.IPAddress}  mono />
                            <KV label="Gateway"     value={ni.Gateway}    mono />
                            <KV label="MAC Address" value={ni.MacAddress} mono />
                        </div>
                    ))}
                    {portRows.length > 0 && (
                        <div>
                            <div style={{ fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase",
                                letterSpacing: "0.06em", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                                Port Mappings
                            </div>
                            {portRows.map(({ cp, b }, i) => (
                                <div key={i} style={{ fontFamily: "monospace", fontSize: "0.82rem",
                                    color: "var(--text-primary)", marginBottom: "0.2rem" }}>
                                    {b.HostIp || "0.0.0.0"}:{b.HostPort} → {cp}
                                </div>
                            ))}
                        </div>
                    )}
                </Section>

                <Section title="Host Config">
                    <KV label="Restart Policy" value={hc.RestartPolicy?.Name + (hc.RestartPolicy?.MaximumRetryCount > 0 ? ` (max ${hc.RestartPolicy.MaximumRetryCount})` : "")} />
                    <KV label="Network Mode"   value={hc.NetworkMode} />
                    <KV label="Auto Remove"    value={hc.AutoRemove  ? "Yes" : "No"} />
                    <KV label="Privileged"     value={hc.Privileged  ? "Yes" : "No"} />
                </Section>

                {mounts.length > 0 && (
                    <Section title={`Mounts (${mounts.length})`}>
                        {mounts.map((m, i) => (
                            <div key={i} style={{ fontFamily: "monospace", fontSize: "0.76rem",
                                color: "var(--text-primary)", marginBottom: "0.3rem",
                                padding: "0.35rem 0.6rem", background: "var(--bg-surface-2)", borderRadius: "4px" }}>
                                {m.Type}: {m.Source} → {m.Destination} ({m.Mode || "rw"})
                            </div>
                        ))}
                    </Section>
                )}

                {env.length > 0 && (
                    <Collapse label="Environment" count={env.length} open={showEnv} setOpen={setShowEnv}>
                        <CodeBlock>{env.map((e, i) => <CodeLine key={i}>{e}</CodeLine>)}</CodeBlock>
                    </Collapse>
                )}

                {Object.keys(labels).length > 0 && (
                    <Collapse label="Labels" count={Object.keys(labels).length} open={showLabels} setOpen={setShowLabels}>
                        <CodeBlock>
                            {Object.entries(labels).map(([k, v]) => (
                                <div key={k} style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
                                    gap: "0.25rem", fontFamily: "monospace", fontSize: "0.74rem",
                                    color: "var(--text-primary)", marginBottom: "0.15rem" }}>
                                    <span style={{ color: "var(--text-secondary)" }}>{k}</span>
                                    <span>{v}</span>
                                </div>
                            ))}
                        </CodeBlock>
                    </Collapse>
                )}
            </>
        );
    };

    // ── image ─────────────────────────────────────────────────────────────────

    const renderImage = () => {
        const config = data.Config || {};
        const env    = config.Env    || [];
        const labels = config.Labels || {};
        const exposed = config.ExposedPorts || {};
        const rootfs = data.RootFS || {};
        const layers = rootfs.Layers || [];

        return (
            <>
                <Section title="Identity">
                    {(data.RepoTags || []).map(t => <KV key={t} label="Tag"    value={t}  mono />)}
                    <KV label="Architecture" value={data.Architecture && data.Os ? `${data.Architecture} / ${data.Os}` : (data.Architecture || data.Os)} />
                    <KV label="Size"         value={formatBytes(data.Size)} />
                    <KV label="Created"      value={data.Created ? new Date(data.Created).toLocaleString() : null} />
                    <KV label="Docker Build" value={data.DockerVersion} />
                    {data.Author && <KV label="Author" value={data.Author} />}
                </Section>

                <Section title="Command">
                    {config.Entrypoint?.length > 0 && <KV label="Entrypoint"  value={config.Entrypoint.join(" ")} mono />}
                    {config.Cmd?.length        > 0 && <KV label="Cmd"         value={config.Cmd.join(" ")}        mono />}
                    {config.WorkingDir         && <KV label="Working Dir" value={config.WorkingDir}           mono />}
                    {config.User               && <KV label="User"        value={config.User} />}
                </Section>

                {Object.keys(exposed).length > 0 && (
                    <Section title="Exposed Ports">
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                            {Object.keys(exposed).map(p => (
                                <span key={p} style={{ padding: "0.2rem 0.55rem", borderRadius: "4px",
                                    background: "rgba(36,150,237,0.12)", border: "1px solid rgba(36,150,237,0.3)",
                                    color: "#2496ed", fontSize: "0.78rem", fontFamily: "monospace" }}>{p}</span>
                            ))}
                        </div>
                    </Section>
                )}

                <Section title={`Layers (${layers.length})`}>
                    <KV label="FS Type" value={rootfs.Type} />
                    <CodeBlock>
                        {layers.slice(0, 5).map(l => (
                            <CodeLine key={l}>{l.replace("sha256:", "").slice(0, 36)}…</CodeLine>
                        ))}
                        {layers.length > 5 && <CodeLine style={{ color: "var(--text-secondary)" }}>… and {layers.length - 5} more</CodeLine>}
                    </CodeBlock>
                </Section>

                {env.length > 0 && (
                    <Collapse label="Environment" count={env.length} open={showEnv} setOpen={setShowEnv}>
                        <CodeBlock>{env.map((e, i) => <CodeLine key={i}>{e}</CodeLine>)}</CodeBlock>
                    </Collapse>
                )}

                {Object.keys(labels).length > 0 && (
                    <Collapse label="Labels" count={Object.keys(labels).length} open={showLabels} setOpen={setShowLabels}>
                        <CodeBlock>
                            {Object.entries(labels).map(([k, v]) => (
                                <div key={k} style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
                                    gap: "0.25rem", fontFamily: "monospace", fontSize: "0.74rem",
                                    color: "var(--text-primary)", marginBottom: "0.15rem" }}>
                                    <span style={{ color: "var(--text-secondary)" }}>{k}</span>
                                    <span>{v}</span>
                                </div>
                            ))}
                        </CodeBlock>
                    </Collapse>
                )}
            </>
        );
    };

    // ── volume ────────────────────────────────────────────────────────────────

    const renderVolume = () => {
        const labels  = data.Labels  || {};
        const options = data.Options || {};
        return (
            <>
                <Section title="Details">
                    <KV label="Driver"     value={data.Driver} />
                    <KV label="Scope"      value={data.Scope} />
                    <KV label="Created"    value={data.CreatedAt ? new Date(data.CreatedAt).toLocaleString() : null} />
                    <KV label="Mountpoint" value={data.Mountpoint} mono />
                </Section>

                {Object.keys(options).length > 0 && (
                    <Section title="Options">
                        {Object.entries(options).map(([k, v]) => <KV key={k} label={k} value={v} />)}
                    </Section>
                )}

                {Object.keys(labels).length > 0 && (
                    <Collapse label="Labels" count={Object.keys(labels).length} open={showLabels} setOpen={setShowLabels}>
                        <CodeBlock>
                            {Object.entries(labels).map(([k, v]) => (
                                <CodeLine key={k}><span style={{ color: "var(--text-secondary)" }}>{k}: </span>{v}</CodeLine>
                            ))}
                        </CodeBlock>
                    </Collapse>
                )}
            </>
        );
    };

    // ── network ───────────────────────────────────────────────────────────────

    const renderNetwork = () => {
        const ipam       = data.IPAM        || {};
        const ipamCfgs   = ipam.Config      || [];
        const containers = data.Containers  || {};
        const labels     = data.Labels      || {};
        const options    = data.Options     || {};
        const attached   = Object.entries(containers);

        return (
            <>
                <Section title="Details">
                    <KV label="ID"       value={(data.Id || "").slice(0, 24)} mono />
                    <KV label="Driver"   value={data.Driver} />
                    <KV label="Scope"    value={data.Scope} />
                    <KV label="Created"  value={data.Created ? new Date(data.Created).toLocaleString() : null} />
                    <KV label="Internal" value={data.Internal    ? "Yes" : "No"} />
                    <KV label="IPv6"     value={data.EnableIPv6  ? "Enabled" : "Disabled"} />
                </Section>

                <Section title="IPAM">
                    <KV label="Driver" value={ipam.Driver} />
                    {ipamCfgs.map((cfg, i) => (
                        <div key={i}>
                            <KV label="Subnet"   value={cfg.Subnet}  mono />
                            <KV label="Gateway"  value={cfg.Gateway} mono />
                            {cfg.IPRange && <KV label="IP Range" value={cfg.IPRange} mono />}
                        </div>
                    ))}
                </Section>

                {attached.length > 0 && (
                    <Section title={`Attached Containers (${attached.length})`}>
                        {attached.map(([cid, ci]) => (
                            <div key={cid} style={{ background: "var(--bg-surface-2)", borderRadius: "6px",
                                padding: "0.5rem 0.75rem", marginBottom: "0.4rem" }}>
                                <div style={{ fontWeight: "600", fontSize: "0.85rem",
                                    marginBottom: "0.15rem" }}>
                                    {(ci.Name || cid).replace(/^\//, "")}
                                </div>
                                <div style={{ fontFamily: "monospace", fontSize: "0.74rem",
                                    color: "var(--text-secondary)" }}>
                                    IP: {ci.IPv4Address || "—"} &nbsp;|&nbsp; MAC: {ci.MacAddress || "—"}
                                </div>
                            </div>
                        ))}
                    </Section>
                )}

                {(Object.keys(options).length > 0 || Object.keys(labels).length > 0) && (
                    <Collapse label="Labels & Options"
                        count={Object.keys(labels).length + Object.keys(options).length}
                        open={showLabels} setOpen={setShowLabels}>
                        <CodeBlock>
                            {Object.entries({ ...options, ...labels }).map(([k, v]) => (
                                <CodeLine key={k}><span style={{ color: "var(--text-secondary)" }}>{k}: </span>{v}</CodeLine>
                            ))}
                        </CodeBlock>
                    </Collapse>
                )}
            </>
        );
    };

    // ── shell ─────────────────────────────────────────────────────────────────

    const typeIcon = {
        container: <FaDocker style={{ color: "#2496ed" }} />,
        image:     <FaDocker style={{ color: "#0db7ed" }} />,
        volume:    <FaDatabase style={{ color: "#ff9800" }} />,
        network:   <FaNetworkWired style={{ color: "#9c27b0" }} />,
    }[type];

    return (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)",
            zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: "var(--bg-surface-1)", border: "1px solid var(--border-default)",
                borderRadius: "12px", width: "100%", maxWidth: "680px",
                maxHeight: "90vh", display: "flex", flexDirection: "column",
                boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
                        {typeIcon}
                        <span style={{ fontWeight: "700", color: "var(--text-primary)", fontSize: "1rem",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                        <span style={{ padding: "0.15rem 0.5rem", borderRadius: "4px", flexShrink: 0,
                            background: "var(--bg-surface-2)", color: "var(--text-secondary)",
                            fontWeight: "600", textTransform: "uppercase", fontSize: "0.65rem",
                            border: "1px solid var(--border-subtle)" }}>{type}</span>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none",
                        color: "var(--text-secondary)", cursor: "pointer",
                        fontSize: "1.2rem", lineHeight: 1, padding: "0.2rem" }}>✕</button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>
                    {type === "container" && renderContainer()}
                    {type === "image"     && renderImage()}
                    {type === "volume"    && renderVolume()}
                    {type === "network"   && renderNetwork()}

                    {/* Raw JSON */}
                    <div style={{ marginTop: "0.75rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem" }}>
                        <button onClick={() => setShowRaw(s => !s)} style={{
                            background: "none", border: "none", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: "0.4rem",
                            color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: "600",
                            padding: "0.3rem 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            <span style={{ fontSize: "0.6rem" }}>{showRaw ? "▼" : "▶"}</span> Raw JSON
                        </button>
                        {showRaw && (
                            <pre style={{ marginTop: "0.5rem", background: "var(--bg-surface-2)", borderRadius: "6px",
                                padding: "0.75rem", fontSize: "0.71rem", color: "var(--text-primary)",
                                fontFamily: "monospace", overflowX: "auto", maxHeight: "280px", overflowY: "auto" }}>
                                {JSON.stringify(data, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Containers Tab ────────────────────────────────────────────────────────────

const ContainersTab = () => {
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState({});
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState("card");
    const [logsModal, setLogsModal] = useState(null); // { id, name, text }
    const [logsLoading, setLogsLoading] = useState(false);
    const [metricsModal, setMetricsModal] = useState(null); // container object
    const [inspectModal, setInspectModal] = useState(null); // { name, data }
    const [inspectLoading, setInspectLoading] = useState({});

    const load = async (forceRefresh = false) => {
        try {
            forceRefresh ? setRefreshing(true) : setLoading(true);
            setError(null);
            const data = await fetchContainers(forceRefresh);
            setContainers(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || "Failed to load containers");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(false); }, []);

    const handleAction = async (id, action) => {
        const key = `${action}-${id}`;
        try {
            setActionLoading(prev => ({ ...prev, [key]: true }));
            if (action === "start") await startContainer(id);
            else if (action === "stop") await stopContainer(id);
            else if (action === "restart") await restartContainer(id);
            await load(true);
        } catch (err) {
            alert(`Failed to ${action} container: ${err.message}`);
        } finally {
            setActionLoading(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleInspect = async (c) => {
        const name = displayName(c);
        setInspectLoading(prev => ({ ...prev, [c.id]: true }));
        try {
            const data = await inspectContainer(c.id);
            setInspectModal({ name, data });
        } catch (err) {
            alert(`Failed to inspect container: ${err.message}`);
        } finally {
            setInspectLoading(prev => ({ ...prev, [c.id]: false }));
        }
    };

    const handleLogs = async (container) => {
        setLogsLoading(true);
        setLogsModal({ id: container.id, name: container.names?.[0] || container.id, text: "" });
        try {
            const text = await fetchContainerLogs(container.id, 200);
            setLogsModal(prev => prev ? { ...prev, text } : null);
        } catch (err) {
            setLogsModal(prev => prev ? { ...prev, text: `Error: ${err.message}` } : null);
        } finally {
            setLogsLoading(false);
        }
    };

    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return containers;
        const q = searchQuery.toLowerCase();
        return containers.filter(c => {
            const name = (c.names?.[0] || c.id).toLowerCase();
            const image = (c.image || "").toLowerCase();
            const state = (c.state || "").toLowerCase();
            return name.includes(q) || image.includes(q) || state.includes(q) || c.id.toLowerCase().includes(q);
        });
    }, [containers, searchQuery]);

    const shortId = (id) => (id || "").slice(0, 12);
    const displayName = (c) => (c.names?.[0] || c.id || "unknown").replace(/^\//, "");

    return (
        <>
            {/* Metrics Modal */}
            {metricsModal && (
                <MetricsModal container={metricsModal} onClose={() => setMetricsModal(null)} />
            )}

            {/* Inspect Modal */}
            {inspectModal && (
                <InspectModal type="container" name={inspectModal.name} data={inspectModal.data}
                    onClose={() => setInspectModal(null)} />
            )}

            {/* Log Modal */}
            {logsModal && (
                <div style={{
                    position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)",
                    zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                    <div style={{
                        background: "var(--bg-surface-1)", border: "1px solid var(--border-default)",
                        borderRadius: "8px", width: "80vw", maxWidth: "900px",
                        maxHeight: "80vh", display: "flex", flexDirection: "column"
                    }}>
                        <div style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-subtle)"
                        }}>
                            <strong style={{ color: "var(--text-primary)" }}>
                                Logs — {logsModal.name}
                            </strong>
                            <button onClick={() => setLogsModal(null)} style={{
                                background: "none", border: "none", color: "var(--text-secondary)",
                                cursor: "pointer", fontSize: "1.25rem", lineHeight: 1
                            }}>✕</button>
                        </div>
                        <pre style={{
                            flex: 1, overflow: "auto", margin: 0, padding: "1rem 1.25rem",
                            fontSize: "0.8rem", color: "var(--text-primary)",
                            fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all"
                        }}>
                            {logsLoading ? "Loading logs…" : (logsModal.text || "(no output)")}
                        </pre>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            {!loading && !error && (
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "1.5rem" }}>
                    <div style={{ flex: 1, minWidth: "250px", maxWidth: "480px" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-primary)", fontSize: "0.9rem", fontWeight: "500" }}>
                            Search:
                        </label>
                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                            <FaSearch style={{ position: "absolute", left: "1rem", color: "#666", pointerEvents: "none" }} />
                            <input
                                type="text"
                                placeholder="Search by name, image, or state…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{
                                    width: "100%", padding: "0.75rem 1rem 0.75rem 2.5rem",
                                    border: "1px solid #6b6b6b", borderRadius: "8px",
                                    fontSize: "1rem", backgroundColor: "#fff", color: "#000", outline: "none"
                                }}
                            />
                        </div>
                    </div>
                    <button onClick={() => setViewMode(v => v === "card" ? "table" : "card")} style={{
                        padding: "0.75rem 1rem", border: "none", borderRadius: "8px",
                        backgroundColor: "#6b6b6b", color: "#fff", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1rem", fontWeight: "500"
                    }}>
                        {viewMode === "card" ? <FaTable /> : <FaTh />}
                        {viewMode === "card" ? "Table" : "Cards"}
                    </button>
                    <button onClick={() => load(true)} disabled={refreshing} style={{
                        padding: "0.75rem 1rem", border: "none", borderRadius: "8px",
                        backgroundColor: refreshing ? "#6b6b6b" : "#4caf50",
                        color: "#fff", cursor: refreshing ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1rem", fontWeight: "500",
                        opacity: refreshing ? 0.6 : 1
                    }}>
                        <FaSyncAlt style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                        {refreshing ? "Refreshing…" : "Refresh"}
                    </button>
                </div>
            )}

            {loading && <div className="page-card"><p>Loading containers…</p></div>}
            {error && <div className="page-card" style={{ backgroundColor: "#f44336", color: "#fff" }}><h2>Error</h2><p>{error}</p></div>}
            {!loading && !error && containers.length === 0 && <div className="page-card"><p>No containers found.</p></div>}

            {/* Card view */}
            {!loading && !error && filtered.length > 0 && viewMode === "card" && filtered.map(c => (
                <div key={c.id} className="page-card"
                    onClick={() => setMetricsModal(c)}
                    style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                                <FaDocker style={{ color: "#2496ed" }} />
                                <h2 style={{ margin: 0 }}>{displayName(c)}</h2>
                            </div>
                            <p style={{ margin: "0.2rem 0", color: "var(--text-primary)", fontSize: "0.85rem" }}>
                                <strong>ID:</strong> {shortId(c.id)}
                            </p>
                            <p style={{ margin: "0.2rem 0", color: "var(--text-primary)", fontSize: "0.85rem" }}>
                                <strong>Image:</strong> {c.image}
                            </p>
                            <p style={{ margin: "0.2rem 0", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                                {c.status}
                            </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            <span style={{
                                padding: "0.4rem 0.9rem", borderRadius: "4px",
                                backgroundColor: getStateColor(c.state), color: "#fff",
                                fontWeight: "bold", textTransform: "uppercase", fontSize: "0.75rem"
                            }}>{c.state || "unknown"}</span>
                            <div style={{ display: "flex", gap: "0.4rem" }} onClick={e => e.stopPropagation()}>
                                {c.state !== "running" && (
                                    <button onClick={() => handleAction(c.id, "start")}
                                        disabled={actionLoading[`start-${c.id}`]}
                                        title="Start" style={actionBtn("#4caf50", actionLoading[`start-${c.id}`])}>
                                        <FaPlay size={14} />
                                    </button>
                                )}
                                {c.state === "running" && (
                                    <button onClick={() => handleAction(c.id, "stop")}
                                        disabled={actionLoading[`stop-${c.id}`]}
                                        title="Stop" style={actionBtn("#f44336", actionLoading[`stop-${c.id}`])}>
                                        <FaStop size={14} />
                                    </button>
                                )}
                                <button onClick={() => handleAction(c.id, "restart")}
                                    disabled={actionLoading[`restart-${c.id}`]}
                                    title="Restart" style={actionBtn("#ff9800", actionLoading[`restart-${c.id}`])}>
                                    <FaSyncAlt size={14} />
                                </button>
                                <button onClick={() => handleLogs(c)} title="Logs"
                                    style={actionBtn("#2196f3", false)}>
                                    <FaFileAlt size={14} />
                                </button>
                                <button onClick={() => handleInspect(c)} title="Inspect"
                                    disabled={inspectLoading[c.id]}
                                    style={actionBtn("#607d8b", inspectLoading[c.id])}>
                                    <FaInfoCircle size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Table view */}
            {!loading && !error && filtered.length > 0 && viewMode === "table" && (
                <div className="page-table-container">
                    <table className="page-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>ID</th>
                                <th>Image</th>
                                <th>State</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(c => (
                                <tr key={c.id}
                                    onClick={() => setMetricsModal(c)}
                                    style={{ cursor: "pointer" }}>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                            <FaDocker style={{ color: "#2496ed" }} />
                                            {displayName(c)}
                                        </div>
                                    </td>
                                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{shortId(c.id)}</td>
                                    <td>{c.image}</td>
                                    <td>
                                        <span style={{
                                            padding: "0.2rem 0.6rem", borderRadius: "4px",
                                            backgroundColor: getStateColor(c.state), color: "#fff",
                                            fontWeight: "600", textTransform: "uppercase", fontSize: "0.7rem"
                                        }}>{c.state || "unknown"}</span>
                                    </td>
                                    <td style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>{c.status}</td>
                                    <td style={{ fontSize: "0.82rem" }}>{formatDate(c.created)}</td>
                                    <td onClick={e => e.stopPropagation()}>
                                        <div style={{ display: "flex", gap: "0.4rem" }}>
                                            {c.state !== "running" && (
                                                <button onClick={() => handleAction(c.id, "start")}
                                                    disabled={actionLoading[`start-${c.id}`]}
                                                    title="Start" style={actionBtn("#4caf50", actionLoading[`start-${c.id}`])}>
                                                    <FaPlay size={12} />
                                                </button>
                                            )}
                                            {c.state === "running" && (
                                                <button onClick={() => handleAction(c.id, "stop")}
                                                    disabled={actionLoading[`stop-${c.id}`]}
                                                    title="Stop" style={actionBtn("#f44336", actionLoading[`stop-${c.id}`])}>
                                                    <FaStop size={12} />
                                                </button>
                                            )}
                                            <button onClick={() => handleAction(c.id, "restart")}
                                                disabled={actionLoading[`restart-${c.id}`]}
                                                title="Restart" style={actionBtn("#ff9800", actionLoading[`restart-${c.id}`])}>
                                                <FaSyncAlt size={12} />
                                            </button>
                                            <button onClick={() => handleLogs(c)} title="Logs"
                                                style={actionBtn("#2196f3", false)}>
                                                <FaFileAlt size={12} />
                                            </button>
                                            <button onClick={() => handleInspect(c)} title="Inspect"
                                                disabled={inspectLoading[c.id]}
                                                style={actionBtn("#607d8b", inspectLoading[c.id])}>
                                                <FaInfoCircle size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
};

// ── Images Tab ────────────────────────────────────────────────────────────────

const ImagesTab = () => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [inspectModal, setInspectModal] = useState(null);
    const [inspectLoading, setInspectLoading] = useState({});

    const handleInspect = async (img) => {
        const id = img.id || img.Id || "";
        const name = (img.repo_tags || img.RepoTags || [id])[0] || id.slice(0, 12);
        setInspectLoading(prev => ({ ...prev, [id]: true }));
        try {
            const data = await inspectImage(id);
            setInspectModal({ name, data });
        } catch (err) {
            alert(`Failed to inspect image: ${err.message}`);
        } finally {
            setInspectLoading(prev => ({ ...prev, [id]: false }));
        }
    };

    const load = async (forceRefresh = false) => {
        try {
            forceRefresh ? setRefreshing(true) : setLoading(true);
            setError(null);
            const data = await fetchImages(forceRefresh);
            setImages(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || "Failed to load images");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(false); }, []);

    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return images;
        const q = searchQuery.toLowerCase();
        return images.filter(img => {
            const tags = (img.repo_tags || img.RepoTags || []).join(" ").toLowerCase();
            const id = (img.id || img.Id || "").toLowerCase();
            return tags.includes(q) || id.includes(q);
        });
    }, [images, searchQuery]);

    return (
        <>
            {!loading && !error && (
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "1.5rem" }}>
                    <div style={{ flex: 1, minWidth: "250px", maxWidth: "480px" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-primary)", fontSize: "0.9rem", fontWeight: "500" }}>
                            Search:
                        </label>
                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                            <FaSearch style={{ position: "absolute", left: "1rem", color: "#666", pointerEvents: "none" }} />
                            <input type="text" placeholder="Search by tag or ID…"
                                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                style={{
                                    width: "100%", padding: "0.75rem 1rem 0.75rem 2.5rem",
                                    border: "1px solid #6b6b6b", borderRadius: "8px",
                                    fontSize: "1rem", backgroundColor: "#fff", color: "#000", outline: "none"
                                }} />
                        </div>
                    </div>
                    <button onClick={() => load(true)} disabled={refreshing} style={{
                        padding: "0.75rem 1rem", border: "none", borderRadius: "8px",
                        backgroundColor: refreshing ? "#6b6b6b" : "#4caf50",
                        color: "#fff", cursor: refreshing ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1rem", fontWeight: "500",
                        opacity: refreshing ? 0.6 : 1
                    }}>
                        <FaSyncAlt style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                        {refreshing ? "Refreshing…" : "Refresh"}
                    </button>
                </div>
            )}

            {inspectModal && (
                <InspectModal type="image" name={inspectModal.name} data={inspectModal.data}
                    onClose={() => setInspectModal(null)} />
            )}

            {loading && <div className="page-card"><p>Loading images…</p></div>}
            {error && <div className="page-card" style={{ backgroundColor: "#f44336", color: "#fff" }}><h2>Error</h2><p>{error}</p></div>}
            {!loading && !error && images.length === 0 && <div className="page-card"><p>No images found.</p></div>}

            {!loading && !error && filtered.length > 0 && (
                <div className="page-table-container">
                    <table className="page-table">
                        <thead>
                            <tr>
                                <th>Repository:Tag</th>
                                <th>ID</th>
                                <th>Size</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((img, idx) => {
                                const id = img.id || img.Id || "";
                                const tags = img.repo_tags || img.RepoTags || ["<none>:<none>"];
                                const size = img.size || img.Size || 0;
                                const created = img.created || img.Created;
                                return (
                                    <tr key={id || idx}>
                                        <td>
                                            {tags.map((t, i) => (
                                                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                                    <FaDocker style={{ color: "#2496ed", flexShrink: 0 }} />
                                                    <span style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{t}</span>
                                                </div>
                                            ))}
                                        </td>
                                        <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                                            {id.replace("sha256:", "").slice(0, 12)}
                                        </td>
                                        <td>{formatBytes(size)}</td>
                                        <td style={{ fontSize: "0.82rem" }}>{formatDate(created)}</td>
                                        <td>
                                            <button onClick={() => handleInspect(img)} title="Inspect"
                                                disabled={inspectLoading[id]}
                                                style={actionBtn("#607d8b", inspectLoading[id])}>
                                                <FaInfoCircle size={12} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
};

// ── Volumes Tab ───────────────────────────────────────────────────────────────

const VolumesTab = () => {
    const [volumes, setVolumes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [inspectModal, setInspectModal] = useState(null);
    const [inspectLoading, setInspectLoading] = useState({});

    const handleInspect = async (v) => {
        const name = v.Name || v.name || "";
        setInspectLoading(prev => ({ ...prev, [name]: true }));
        try {
            const data = await inspectVolume(name);
            setInspectModal({ name, data });
        } catch (err) {
            alert(`Failed to inspect volume: ${err.message}`);
        } finally {
            setInspectLoading(prev => ({ ...prev, [name]: false }));
        }
    };

    const load = async (forceRefresh = false) => {
        try {
            forceRefresh ? setRefreshing(true) : setLoading(true);
            setError(null);
            const data = await fetchVolumes(forceRefresh);
            // docker-api returns { Volumes: [...] } or array
            const list = Array.isArray(data) ? data : (data?.Volumes || data?.volumes || []);
            setVolumes(list);
        } catch (err) {
            setError(err.message || "Failed to load volumes");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(false); }, []);

    return (
        <>
            {!loading && !error && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.5rem" }}>
                    <button onClick={() => load(true)} disabled={refreshing} style={{
                        padding: "0.75rem 1rem", border: "none", borderRadius: "8px",
                        backgroundColor: refreshing ? "#6b6b6b" : "#4caf50",
                        color: "#fff", cursor: refreshing ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1rem", fontWeight: "500",
                        opacity: refreshing ? 0.6 : 1
                    }}>
                        <FaSyncAlt style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                        {refreshing ? "Refreshing…" : "Refresh"}
                    </button>
                </div>
            )}

            {inspectModal && (
                <InspectModal type="volume" name={inspectModal.name} data={inspectModal.data}
                    onClose={() => setInspectModal(null)} />
            )}

            {loading && <div className="page-card"><p>Loading volumes…</p></div>}
            {error && <div className="page-card" style={{ backgroundColor: "#f44336", color: "#fff" }}><h2>Error</h2><p>{error}</p></div>}
            {!loading && !error && volumes.length === 0 && <div className="page-card"><p>No volumes found.</p></div>}

            {!loading && !error && volumes.length > 0 && (
                <div className="page-table-container">
                    <table className="page-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Driver</th>
                                <th>Mountpoint</th>
                                <th>Scope</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {volumes.map((v, idx) => {
                                const name = v.Name || v.name || "—";
                                const driver = v.Driver || v.driver || "local";
                                const mountpoint = v.Mountpoint || v.mountpoint || "—";
                                const scope = v.Scope || v.scope || "—";
                                return (
                                    <tr key={name || idx}>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                                <FaDatabase style={{ color: "#ff9800" }} />
                                                {name}
                                            </div>
                                        </td>
                                        <td>{driver}</td>
                                        <td style={{ fontFamily: "monospace", fontSize: "0.78rem", wordBreak: "break-all" }}>{mountpoint}</td>
                                        <td>{scope}</td>
                                        <td>
                                            <button onClick={() => handleInspect(v)} title="Inspect"
                                                disabled={inspectLoading[name]}
                                                style={actionBtn("#607d8b", inspectLoading[name])}>
                                                <FaInfoCircle size={12} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
};

// ── Networks Tab ──────────────────────────────────────────────────────────────

const NetworksTab = () => {
    const [networks, setNetworks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [inspectModal, setInspectModal] = useState(null);
    const [inspectLoading, setInspectLoading] = useState({});

    const handleInspect = async (n) => {
        const id   = n.Id   || n.id   || "";
        const name = n.Name || n.name || id.slice(0, 12);
        setInspectLoading(prev => ({ ...prev, [id]: true }));
        try {
            const data = await inspectNetwork(id);
            setInspectModal({ name, data });
        } catch (err) {
            alert(`Failed to inspect network: ${err.message}`);
        } finally {
            setInspectLoading(prev => ({ ...prev, [id]: false }));
        }
    };

    const load = async (forceRefresh = false) => {
        try {
            forceRefresh ? setRefreshing(true) : setLoading(true);
            setError(null);
            const data = await fetchDockerNetworks(forceRefresh);
            setNetworks(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || "Failed to load networks");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(false); }, []);

    return (
        <>
            {!loading && !error && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.5rem" }}>
                    <button onClick={() => load(true)} disabled={refreshing} style={{
                        padding: "0.75rem 1rem", border: "none", borderRadius: "8px",
                        backgroundColor: refreshing ? "#6b6b6b" : "#4caf50",
                        color: "#fff", cursor: refreshing ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1rem", fontWeight: "500",
                        opacity: refreshing ? 0.6 : 1
                    }}>
                        <FaSyncAlt style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                        {refreshing ? "Refreshing…" : "Refresh"}
                    </button>
                </div>
            )}

            {inspectModal && (
                <InspectModal type="network" name={inspectModal.name} data={inspectModal.data}
                    onClose={() => setInspectModal(null)} />
            )}

            {loading && <div className="page-card"><p>Loading networks…</p></div>}
            {error && <div className="page-card" style={{ backgroundColor: "#f44336", color: "#fff" }}><h2>Error</h2><p>{error}</p></div>}
            {!loading && !error && networks.length === 0 && <div className="page-card"><p>No networks found.</p></div>}

            {!loading && !error && networks.length > 0 && (
                <div className="page-table-container">
                    <table className="page-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>ID</th>
                                <th>Driver</th>
                                <th>Scope</th>
                                <th>Subnet</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {networks.map((n, idx) => {
                                const name = n.Name || n.name || "—";
                                const fullId = n.Id || n.id || "";
                                const id = fullId.slice(0, 12);
                                const driver = n.Driver || n.driver || "—";
                                const scope = n.Scope || n.scope || "—";
                                const ipam = n.IPAM || n.ipam;
                                const subnet = ipam?.Config?.[0]?.Subnet || ipam?.config?.[0]?.subnet || "—";
                                return (
                                    <tr key={fullId || idx}>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                                <FaNetworkWired style={{ color: "#9c27b0" }} />
                                                {name}
                                            </div>
                                        </td>
                                        <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{id}</td>
                                        <td>{driver}</td>
                                        <td>{scope}</td>
                                        <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{subnet}</td>
                                        <td>
                                            <button onClick={() => handleInspect(n)} title="Inspect"
                                                disabled={inspectLoading[fullId]}
                                                style={actionBtn("#607d8b", inspectLoading[fullId])}>
                                                <FaInfoCircle size={12} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
};

// ── System Tab ───────────────────────────────────────────────────────────────

const StatCard = ({ icon, label, value, sub, accent }) => (
    <div style={{
        background: "var(--bg-surface-1)",
        border: `1px solid ${accent || "var(--border-subtle)"}`,
        borderRadius: "10px",
        padding: "1.1rem 1.25rem",
        display: "flex",
        alignItems: "flex-start",
        gap: "0.9rem",
        minWidth: 0,
    }}>
        <div style={{
            width: "2.4rem", height: "2.4rem", borderRadius: "8px",
            backgroundColor: accent ? `${accent}22` : "rgba(100,100,100,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, fontSize: "1.1rem", color: accent || "var(--text-secondary)"
        }}>
            {icon}
        </div>
        <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: "600", textTransform: "uppercase",
                letterSpacing: "0.06em", color: "var(--text-secondary)", marginBottom: "0.2rem" }}>
                {label}
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-primary)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {value}
            </div>
            {sub && <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>{sub}</div>}
        </div>
    </div>
);

const SectionHeading = ({ children }) => (
    <h3 style={{ fontSize: "0.8rem", fontWeight: "700", textTransform: "uppercase",
        letterSpacing: "0.08em", color: "var(--text-secondary)", margin: "1.75rem 0 0.75rem" }}>
        {children}
    </h3>
);

const DiskBar = ({ used, total, label }) => {
    const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
    const color = pct > 85 ? "#f44336" : pct > 60 ? "#ff9800" : "#4caf50";
    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between",
                fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                <span>{label}</span>
                <span>{formatBytes(used)} / {formatBytes(total)} ({pct.toFixed(1)}%)</span>
            </div>
            <div style={{ height: "6px", borderRadius: "3px", background: "var(--border-subtle)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, borderRadius: "3px",
                    background: color, transition: "width 0.4s ease" }} />
            </div>
        </div>
    );
};

const SystemTab = () => {
    const [info, setInfo] = useState(null);
    const [disk, setDisk] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const load = async (forceRefresh = false) => {
        try {
            forceRefresh ? setRefreshing(true) : setLoading(true);
            setError(null);
            const [infoData, diskData] = await Promise.all([fetchSystemInfo(), fetchSystemDisk()]);
            setInfo(infoData);
            setDisk(diskData);
        } catch (err) {
            setError(err.message || "Failed to load system data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(false); }, []);

    if (loading) return <div className="page-card"><p>Loading system info…</p></div>;
    if (error) return <div className="page-card" style={{ backgroundColor: "#f44336", color: "#fff" }}><h2>Error</h2><p>{error}</p></div>;
    if (!info) return null;

    const containerStateColor = (state) => state === "running" ? "#4caf50" : state === "paused" ? "#ff9800" : "#f44336";

    // Disk totals across images
    const imagesTotalSize = (disk?.Images || []).reduce((s, i) => s + (i.Size || 0), 0);
    const imagesTotalShared = (disk?.Images || []).reduce((s, i) => s + (i.SharedSize || 0), 0);
    const containersDiskRw = (disk?.Containers || []).reduce((s, c) => s + (c.SizeRw || 0), 0);
    const buildCacheSize = (disk?.BuildCache || []).reduce((s, b) => s + (b.Size || 0), 0);

    return (
        <>
            {/* Refresh */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.5rem" }}>
                <button onClick={() => load(true)} disabled={refreshing} style={{
                    padding: "0.75rem 1rem", border: "none", borderRadius: "8px",
                    backgroundColor: refreshing ? "#6b6b6b" : "#4caf50",
                    color: "#fff", cursor: refreshing ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    fontSize: "1rem", fontWeight: "500", opacity: refreshing ? 0.6 : 1
                }}>
                    <FaSyncAlt style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                    {refreshing ? "Refreshing…" : "Refresh"}
                </button>
            </div>

            {/* ── Host ── */}
            <SectionHeading>Host</SectionHeading>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
                <StatCard icon={<FaServer />} label="Hostname" value={info.Name || "—"} accent="#2196f3" />
                <StatCard icon={<FaServer />} label="OS" value={info.OperatingSystem || "—"}
                    sub={`${info.OSType || ""} · ${info.Architecture || ""}`} accent="#2196f3" />
                <StatCard icon={<FaServer />} label="Kernel" value={info.KernelVersion || "—"} accent="#2196f3" />
                <StatCard icon={<FaMicrochip />} label="CPUs" value={info.NCPU ?? "—"} accent="#9c27b0" />
                <StatCard icon={<FaMemory />} label="Total Memory"
                    value={formatBytes(info.MemTotal || 0)} accent="#9c27b0" />
            </div>

            {/* ── Docker Engine ── */}
            <SectionHeading>Docker Engine</SectionHeading>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
                <StatCard icon={<FaDocker />} label="Server Version" value={info.ServerVersion || "—"} accent="#2496ed" />
                <StatCard icon={<FaDocker />} label="Storage Driver" value={info.Driver || "—"} accent="#2496ed" />
                <StatCard icon={<FaDocker />} label="Logging Driver" value={info.LoggingDriver || "—"} accent="#2496ed" />
                <StatCard icon={<FaDocker />} label="Cgroup"
                    value={`${info.CgroupDriver || "—"} v${info.CgroupVersion || "?"}`} accent="#2496ed" />
                <StatCard icon={<FaHdd />} label="Docker Root" value={info.DockerRootDir || "—"} accent="#607d8b" />
            </div>

            {/* ── Containers ── */}
            <SectionHeading>Containers</SectionHeading>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
                {[
                    { label: "Total", value: info.Containers ?? 0, state: "total" },
                    { label: "Running", value: info.ContainersRunning ?? 0, state: "running" },
                    { label: "Paused", value: info.ContainersPaused ?? 0, state: "paused" },
                    { label: "Stopped", value: info.ContainersStopped ?? 0, state: "stopped" },
                ].map(({ label, value, state }) => (
                    <div key={label} style={{
                        background: "var(--bg-surface-1)", border: "1px solid var(--border-subtle)",
                        borderRadius: "10px", padding: "1.1rem 1.25rem", textAlign: "center"
                    }}>
                        <div style={{ fontSize: "2rem", fontWeight: "800",
                            color: state === "total" ? "var(--text-primary)" : containerStateColor(state) }}>
                            {value}
                        </div>
                        <div style={{ fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase",
                            letterSpacing: "0.06em", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                            {label}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Images & Disk Usage ── */}
            <SectionHeading>Images &amp; Disk Usage</SectionHeading>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <StatCard icon={<FaDocker />} label="Images" value={info.Images ?? 0} accent="#0db7ed" />
                <StatCard icon={<FaLayerGroup />} label="Layers Size" value={formatBytes(disk?.LayersSize || 0)} accent="#0db7ed" />
                <StatCard icon={<FaLayerGroup />} label="Image Disk (unique)" value={formatBytes(imagesTotalSize - imagesTotalShared)} accent="#0db7ed" />
                <StatCard icon={<FaCube />} label="Containers RW" value={formatBytes(containersDiskRw)} accent="#ff9800" />
                <StatCard icon={<FaHdd />} label="Build Cache" value={formatBytes(buildCacheSize)}
                    sub={`${disk?.BuildCache?.length ?? 0} entries`} accent="#607d8b" />
            </div>

            {/* Disk bar for layers */}
            {(disk?.LayersSize || 0) > 0 && (
                <div className="page-card" style={{ padding: "1.25rem" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: "700", textTransform: "uppercase",
                        letterSpacing: "0.06em", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                        Disk Breakdown
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <DiskBar used={imagesTotalSize - imagesTotalShared} total={disk.LayersSize} label="Image layers (unique)" />
                        <DiskBar used={imagesTotalShared} total={disk.LayersSize} label="Shared layers" />
                        <DiskBar used={containersDiskRw} total={disk.LayersSize} label="Container RW layers" />
                        <DiskBar used={buildCacheSize} total={disk.LayersSize} label="Build cache" />
                    </div>
                </div>
            )}

            {/* ── Plugins ── */}
            {info.Plugins && (
                <>
                    <SectionHeading>Plugins</SectionHeading>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
                        {Object.entries(info.Plugins).map(([type, plugins]) => {
                            const list = Array.isArray(plugins) ? plugins : [];
                            if (list.length === 0) return null;
                            return (
                                <div key={type} style={{
                                    background: "var(--bg-surface-1)", border: "1px solid var(--border-subtle)",
                                    borderRadius: "10px", padding: "1rem 1.25rem"
                                }}>
                                    <div style={{ fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase",
                                        letterSpacing: "0.06em", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                                        {type}
                                    </div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                                        {list.map(p => (
                                            <span key={p} style={{
                                                padding: "0.2rem 0.55rem", borderRadius: "4px",
                                                background: "rgba(36,150,237,0.15)", border: "1px solid rgba(36,150,237,0.35)",
                                                color: "#2496ed", fontSize: "0.75rem", fontWeight: "600"
                                            }}>{p}</span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ── Security ── */}
            {info.SecurityOptions && info.SecurityOptions.length > 0 && (
                <>
                    <SectionHeading>Security</SectionHeading>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        {info.SecurityOptions.map(opt => (
                            <span key={opt} style={{
                                padding: "0.3rem 0.75rem", borderRadius: "6px",
                                background: "rgba(76,175,80,0.15)", border: "1px solid rgba(76,175,80,0.4)",
                                color: "#4caf50", fontSize: "0.8rem", fontWeight: "600", fontFamily: "monospace"
                            }}>{opt}</span>
                        ))}
                    </div>
                </>
            )}

            {/* ── Driver Status ── */}
            {info.DriverStatus && info.DriverStatus.length > 0 && (
                <>
                    <SectionHeading>Storage Driver Status</SectionHeading>
                    <div className="page-table-container">
                        <table className="page-table">
                            <tbody>
                                {info.DriverStatus.map(([key, val], i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: "500", width: "40%" }}>{key}</td>
                                        <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{val}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* bottom spacing */}
            <div style={{ height: "2rem" }} />
        </>
    );
};

// ── Helper ────────────────────────────────────────────────────────────────────

const actionBtn = (bg, disabled) => ({
    padding: "0.45rem",
    border: "none",
    borderRadius: "4px",
    backgroundColor: bg,
    color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: disabled ? 0.5 : 1,
    transition: "opacity 0.2s",
});

// ── Main Docker Page ──────────────────────────────────────────────────────────

const Docker = () => {
    const [activeTab, setActiveTab] = useState("Containers");

    const tabIcons = {
        Containers: <FaDocker style={{ color: "#2496ed" }} />,
        Images: <FaDocker style={{ color: "#0db7ed" }} />,
        Volumes: <FaDatabase style={{ color: "#ff9800" }} />,
        Networks: <FaNetworkWired style={{ color: "#9c27b0" }} />,
        System: <FaServer style={{ color: "#4caf50" }} />,
    };

    return (
        <div className="page-container">
            <h1 className="page-title">Docker</h1>
            <p className="page-description">
                Manage Docker containers, images, volumes, and networks.
            </p>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-subtle)" }}>
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: "0.6rem 1.25rem",
                            border: "none",
                            borderBottom: activeTab === tab ? "2px solid #4caf50" : "2px solid transparent",
                            background: "none",
                            color: activeTab === tab ? "var(--text-primary)" : "var(--text-secondary)",
                            cursor: "pointer",
                            fontWeight: activeTab === tab ? "600" : "400",
                            fontSize: "0.95rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            transition: "color 0.15s, border-color 0.15s",
                            marginBottom: "-1px",
                        }}
                    >
                        {tabIcons[tab]}
                        {tab}
                    </button>
                ))}
            </div>

            <div className="page-content">
                {activeTab === "Containers" && <ContainersTab />}
                {activeTab === "Images" && <ImagesTab />}
                {activeTab === "Volumes" && <VolumesTab />}
                {activeTab === "Networks" && <NetworksTab />}
                {activeTab === "System" && <SystemTab />}
            </div>
        </div>
    );
};

export default Docker;
