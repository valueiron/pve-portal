import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { FaServer, FaHdd, FaNetworkWired, FaFlask, FaSitemap, FaTicketAlt, FaRobot } from "react-icons/fa";
import { SiKubernetes, SiDocker } from "react-icons/si";
import { API_ENDPOINTS } from "../config/api";
import "./Page.css";
import "./Home.css";

// ─── Utility ────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, credentials: "include" });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// ─── Service definitions ────────────────────────────────────────────────────

const SERVICES = [
  { key: "vms",        title: "Virtual Machines", desc: "Manage VMs across Proxmox, Azure, and AWS",  icon: FaServer,       path: "/virtual-machines", accent: "var(--accent)"  },
  { key: "storage",    title: "Storage",           desc: "Configure storage resources and volumes",    icon: FaHdd,          path: "/storage",           accent: "var(--green)"   },
  { key: "networking", title: "Networking",        desc: "VNets, subnets, VPCs and security groups",  icon: FaNetworkWired, path: "/networking",        accent: "var(--amber)"   },
  { key: "k8s",        title: "Kubernetes",        desc: "Cluster workloads, pods and deployments",   icon: SiKubernetes,   path: "/kubernetes",        accent: "var(--red)"     },
  { key: "docker",     title: "Docker",            desc: "Containers, images and multi-host agents",  icon: SiDocker,       path: "/docker",            accent: "var(--accent)"  },
  { key: "labs",       title: "Labs",              desc: "Sandbox environments and lab exercises",    icon: FaFlask,        path: "/labs",              accent: "var(--orange)"  },
  { key: "vyos",       title: "VyOS",              desc: "Router and firewall configuration",         icon: FaSitemap,      path: "/vyos",              accent: "var(--orange)"  },
  { key: "tickets",    title: "Tickets",           desc: "Kanban boards and issue tracking",          icon: FaTicketAlt,    path: "/tickets",           accent: "var(--amber)"   },
  { key: "ai",         title: "AI Assistant",      desc: "Intelligent infrastructure guidance",       icon: FaRobot,        path: "/ai",                accent: "var(--accent)"  },
];

// ─── Sub-components ─────────────────────────────────────────────────────────

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      const start = performance.now();
      const duration = 700;
      const from = 0;
      const to = value;
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(from + (to - from) * eased));
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setDisplay(value);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  return <span className="dash-kpi-number">{display}</span>;
}

function DonutRing({ value, total, color, size = 72, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  const dash = pct * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-surface-3)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.9s var(--ease-out)" }}
      />
    </svg>
  );
}

function SegmentBar({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="dash-segment-bar">
      {segments.filter(s => s.value > 0).map((seg, i) => (
        <div
          key={i}
          className="dash-segment-fill"
          style={{ width: `${(seg.value / total) * 100}%`, background: seg.color }}
          title={`${seg.label}: ${seg.value}`}
        />
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

const POLL_INTERVAL = 60_000;

export default function Home() {
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(SERVICES.map(s => [s.key, "loading"]))
  );
  const [metrics, setMetrics] = useState({
    vmCount: null, vmRunning: null, vmStopped: null,
    runningContainers: null, stoppedContainers: null, pausedContainers: null,
    connectedHosts: null, totalHosts: null,
    podCount: null, podRunning: null, podPending: null, podFailed: null,
    boardCount: null, labCount: null, vyosCount: null,
    storageTotal: null, netTotal: null,
  });
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const lastFetchTime = useRef(null);
  const isFirstFetch = useRef(true);

  const fetchAll = useCallback(async () => {
    const [
      vmsRes, storageRes, netRes,
      podsRes, deploymentsRes, nodesRes,
      dockerContainersRes, dockerInfoRes, dockerHostsRes,
      labsRes, vyosRes, ticketsRes,
    ] = await Promise.allSettled([
      fetchWithTimeout(API_ENDPOINTS.VMS),
      fetchWithTimeout(API_ENDPOINTS.STORAGE),
      fetchWithTimeout(API_ENDPOINTS.NETWORKING),
      fetchWithTimeout(API_ENDPOINTS.K8S_PODS),
      fetchWithTimeout(API_ENDPOINTS.K8S_DEPLOYMENTS),
      fetchWithTimeout(API_ENDPOINTS.K8S_NODES),
      fetchWithTimeout(API_ENDPOINTS.DOCKER_CONTAINERS),
      fetchWithTimeout(API_ENDPOINTS.DOCKER_SYSTEM_INFO),
      fetchWithTimeout(API_ENDPOINTS.DOCKER_HOSTS),
      fetchWithTimeout(API_ENDPOINTS.LABS),
      fetchWithTimeout(API_ENDPOINTS.VYOS_DEVICES),
      fetchWithTimeout(API_ENDPOINTS.TICKETS_BOARDS),
    ]);

    const ok = r => r.status === "fulfilled";

    // VMs
    const vmsData = ok(vmsRes) ? (vmsRes.value?.vms ?? vmsRes.value ?? []) : null;
    const vmStatus = vmsData ? "online" : "offline";
    const vmCount = vmsData?.length ?? 0;
    const vmRunning = vmsData?.filter(v => v.status === "running").length ?? 0;
    const vmStopped = vmCount - vmRunning;

    // Storage
    let storageStatus = "offline";
    let storageTotal = 0;
    if (ok(storageRes)) {
      const v = storageRes.value;
      storageTotal =
        (v.storage_accounts?.length ?? 0) +
        (v.containers?.length ?? 0) +
        (v.buckets?.length ?? 0) +
        (v.storages?.length ?? 0);
      const hasAll = v.storage_accounts !== undefined && v.storages !== undefined;
      storageStatus = hasAll ? "online" : "degraded";
    }

    // Networking
    let netStatus = "offline";
    let netTotal = 0;
    if (ok(netRes)) {
      const v = netRes.value;
      netTotal = Object.values(v).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
      netStatus = "online";
    }

    // Kubernetes
    const podsOk = ok(podsRes);
    const deploymentsOk = ok(deploymentsRes);
    const nodesOk = ok(nodesRes);
    let k8sStatus = "offline";
    let podCount = 0, podRunning = 0, podPending = 0, podFailed = 0;
    if (podsOk) {
      const podsArr = podsRes.value?.pods ?? podsRes.value ?? [];
      podCount = podsArr.length;
      podRunning = podsArr.filter(p => (p.status?.phase ?? p.phase) === "Running").length;
      podPending = podsArr.filter(p => (p.status?.phase ?? p.phase) === "Pending").length;
      podFailed  = podsArr.filter(p => ["Failed", "Unknown"].includes(p.status?.phase ?? p.phase)).length;
      k8sStatus  = deploymentsOk && nodesOk ? "online" : "degraded";
    }

    // Docker — use system info for counts (multi-host aware), fall back to container list
    const sysInfo = ok(dockerInfoRes) ? dockerInfoRes.value : null;
    let runningContainers, stoppedContainers, pausedContainers;
    if (sysInfo) {
      runningContainers = sysInfo.ContainersRunning ?? sysInfo.containers_running ?? 0;
      stoppedContainers = sysInfo.ContainersStopped ?? sysInfo.containers_stopped ?? 0;
      pausedContainers  = sysInfo.ContainersPaused  ?? sysInfo.containers_paused  ?? 0;
    } else if (ok(dockerContainersRes)) {
      const arr = dockerContainersRes.value?.containers ?? dockerContainersRes.value ?? [];
      runningContainers = Array.isArray(arr)
        ? arr.filter(c => (c.state || c.status || "").toLowerCase() === "running").length
        : 0;
      stoppedContainers = Array.isArray(arr) ? arr.length - runningContainers : 0;
      pausedContainers = 0;
    } else {
      runningContainers = 0; stoppedContainers = 0; pausedContainers = 0;
    }
    const dockerHosts = ok(dockerHostsRes) ? (dockerHostsRes.value ?? []) : [];
    const connectedHosts = dockerHosts.filter(h => h.status === "connected").length;
    const totalHosts = dockerHosts.length;
    const dockerStatus = ok(dockerInfoRes) || ok(dockerContainersRes) ? "online" : "offline";

    // Labs
    const labsData = ok(labsRes) ? (labsRes.value?.labs ?? labsRes.value ?? []) : null;
    const labStatus = labsData ? "online" : "offline";
    const labCount = labsData?.length ?? 0;

    // VyOS
    const vyosData = ok(vyosRes) ? (vyosRes.value?.devices ?? vyosRes.value ?? []) : null;
    const vyosStatus = vyosData ? "online" : "offline";
    const vyosCount = Array.isArray(vyosData) ? vyosData.length : 0;

    // Tickets
    const ticketsData = ok(ticketsRes) ? (ticketsRes.value?.boards ?? ticketsRes.value ?? []) : null;
    const ticketsStatus = ticketsData ? "online" : "offline";
    const boardCount = Array.isArray(ticketsData) ? ticketsData.length : 0;

    // AI — online if any service responded
    const anyUp = [vmStatus, storageStatus, netStatus, k8sStatus, dockerStatus,
                   labStatus, vyosStatus, ticketsStatus].some(s => s === "online" || s === "degraded");
    const aiStatus = anyUp ? "online" : "offline";

    setStatuses({ vms: vmStatus, storage: storageStatus, networking: netStatus,
      k8s: k8sStatus, docker: dockerStatus, labs: labStatus,
      vyos: vyosStatus, tickets: ticketsStatus, ai: aiStatus });

    setMetrics({
      vmCount, vmRunning, vmStopped,
      runningContainers, stoppedContainers, pausedContainers,
      connectedHosts, totalHosts,
      podCount, podRunning, podPending, podFailed,
      boardCount, labCount, vyosCount,
      storageTotal, netTotal,
    });

    lastFetchTime.current = Date.now();
    setSecondsAgo(0);

    if (isFirstFetch.current) {
      isFirstFetch.current = false;
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const pollId = setInterval(fetchAll, POLL_INTERVAL);
    return () => clearInterval(pollId);
  }, [fetchAll]);

  useEffect(() => {
    const id = setInterval(() => {
      if (lastFetchTime.current) {
        setSecondsAgo(Math.floor((Date.now() - lastFetchTime.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const onlineCount = Object.values(statuses).filter(s => s === "online").length;
  const degradedCount = Object.values(statuses).filter(s => s === "degraded").length;
  const overallDotStatus =
    Object.values(statuses).every(s => s === "loading") ? "loading"
    : Object.values(statuses).some(s => s === "offline") ? "offline"
    : degradedCount > 0 ? "degraded"
    : "online";

  // KPI tiles
  const kpiTiles = [
    {
      label: "Virtual Machines",
      key: "vmCount",
      color: "var(--accent)",
      sub: metrics.vmRunning !== null ? `${metrics.vmRunning} running` : null,
      subClass: metrics.vmRunning > 0 ? "good" : "",
    },
    {
      label: "Running Containers",
      key: "runningContainers",
      color: "var(--green)",
      sub: metrics.totalHosts !== null && metrics.totalHosts > 0
        ? `${metrics.connectedHosts}/${metrics.totalHosts} hosts connected`
        : null,
      subClass: "",
    },
    {
      label: "K8s Pods",
      key: "podCount",
      color: "var(--red)",
      sub: metrics.podPending
        ? `${metrics.podPending} pending`
        : metrics.podRunning !== null
          ? "all healthy"
          : null,
      subClass: metrics.podPending > 0 ? "warn" : metrics.podRunning !== null ? "good" : "",
    },
    {
      label: "Ticket Boards",
      key: "boardCount",
      color: "var(--amber)",
      sub: null,
      subClass: "",
    },
    {
      label: "Available Labs",
      key: "labCount",
      color: "var(--orange)",
      sub: null,
      subClass: "",
    },
    {
      label: "VyOS Devices",
      key: "vyosCount",
      color: "var(--orange)",
      sub: null,
      subClass: "",
    },
  ];

  const getBadge = key => {
    const m = metrics;
    switch (key) {
      case "vms":        return m.vmCount !== null        ? `${m.vmCount} VMs`           : "—";
      case "storage":    return m.storageTotal !== null   ? `${m.storageTotal} resources` : "—";
      case "networking": return m.netTotal !== null       ? `${m.netTotal} resources`     : "—";
      case "k8s":        return m.podCount !== null       ? `${m.podCount} pods`          : "—";
      case "docker":     return m.runningContainers !== null ? `${m.runningContainers} running` : "—";
      case "labs":       return m.labCount !== null       ? `${m.labCount} labs`          : "—";
      case "vyos":       return m.vyosCount !== null      ? `${m.vyosCount} devices`      : "—";
      case "tickets":    return m.boardCount !== null     ? `${m.boardCount} boards`      : "—";
      case "ai":         return "Always available";
      default:           return "—";
    }
  };

  // SVG refresh ring: circumference of r=12 circle ≈ 75.4
  const ringCirc = 75.4;
  const ringFill = ringCirc * Math.max(0, 1 - secondsAgo / 60);

  return (
    <div className="page-container">
      {/* ── Header ── */}
      <div className="dash-header">
        <div className="dash-header-left">
          <h1 className="page-title dash-title">Dashboard</h1>
          <p className="page-description">Real-time health across your infrastructure</p>
        </div>
        <div className="dash-header-right">
          <div className="dash-last-updated">
            {lastFetchTime.current ? `Refreshed ${secondsAgo}s ago` : "Loading…"}
          </div>
          <div className="dash-refresh-ring" title={`Next refresh in ${60 - secondsAgo}s`}>
            <svg width="32" height="32" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="16" cy="16" r="12" fill="none" stroke="var(--bg-surface-3)" strokeWidth="2.5" />
              <circle
                cx="16" cy="16" r="12" fill="none"
                stroke="var(--accent)" strokeWidth="2.5"
                strokeDasharray={`${ringFill} ${ringCirc}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 1s linear" }}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Health bar ── */}
      <div className="dash-health-bar">
        <span className={`status-dot ${overallDotStatus}`} />
        <span className="dash-health-text">
          <strong>{onlineCount}</strong>/9 services online
        </span>
        {degradedCount > 0 && (
          <span className="dash-health-warn">{degradedCount} degraded</span>
        )}
        <div className="dash-health-pills">
          {SERVICES.map(svc => (
            <div
              key={svc.key}
              className={`dash-health-pill ${statuses[svc.key]}`}
              title={`${svc.title}: ${statuses[svc.key]}`}
            />
          ))}
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="dash-kpi-row">
        {kpiTiles.map(tile => {
          const val = metrics[tile.key];
          const loading = val === null;
          return (
            <div
              key={tile.key}
              className="dash-kpi-tile"
              style={{ "--tile-color": tile.color }}
            >
              {loading ? (
                <div className="dash-kpi-skeleton" />
              ) : (
                <div className="dash-kpi-value">
                  <AnimatedNumber value={val} />
                </div>
              )}
              <div className="dash-kpi-label">{tile.label}</div>
              {tile.sub && !loading && (
                <div className={`dash-kpi-sub${tile.subClass ? ` ${tile.subClass}` : ""}`}>
                  {tile.sub}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Insights row ── */}
      <div className="dash-insights-row">
        {/* VM Health */}
        <div className="dash-insight-card">
          <div className="dash-insight-header">
            <span className="dash-insight-title">VM Health</span>
            <FaServer className="dash-insight-icon" />
          </div>
          <div className="dash-insight-body">
            <DonutRing
              value={metrics.vmRunning ?? 0}
              total={Math.max(metrics.vmCount ?? 0, 1)}
              color="var(--green)"
              size={72} stroke={8}
            />
            <div className="dash-insight-stats">
              <div className="dash-stat-row">
                <span className="dash-stat-dot" style={{ background: "var(--green)" }} />
                <span>Running</span>
                <strong>{metrics.vmRunning ?? "—"}</strong>
              </div>
              <div className="dash-stat-row">
                <span className="dash-stat-dot" style={{ background: "var(--red)" }} />
                <span>Stopped</span>
                <strong>{metrics.vmStopped ?? "—"}</strong>
              </div>
              <div className="dash-stat-row">
                <span className="dash-stat-dot" style={{ background: "var(--text-tertiary)" }} />
                <span>Total</span>
                <strong>{metrics.vmCount ?? "—"}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Container Fleet */}
        <div className="dash-insight-card">
          <div className="dash-insight-header">
            <span className="dash-insight-title">Container Fleet</span>
            <SiDocker className="dash-insight-icon" />
          </div>
          <div className="dash-insight-body" style={{ flexDirection: "column", gap: "0.875rem" }}>
            <SegmentBar segments={[
              { value: metrics.runningContainers ?? 0, color: "var(--green)",         label: "Running" },
              { value: metrics.stoppedContainers  ?? 0, color: "var(--red)",           label: "Stopped" },
              { value: metrics.pausedContainers   ?? 0, color: "var(--text-tertiary)", label: "Paused"  },
            ]} />
            <div className="dash-insight-stats dash-insight-stats--grid">
              <div className="dash-stat-row">
                <span className="dash-stat-dot" style={{ background: "var(--green)" }} />
                <span>Running</span>
                <strong>{metrics.runningContainers ?? "—"}</strong>
              </div>
              <div className="dash-stat-row">
                <span className="dash-stat-dot" style={{ background: "var(--red)" }} />
                <span>Stopped</span>
                <strong>{metrics.stoppedContainers ?? "—"}</strong>
              </div>
              <div className="dash-stat-row">
                <span className="dash-stat-dot" style={{ background: "var(--accent)" }} />
                <span>Hosts</span>
                <strong>
                  {metrics.connectedHosts ?? "—"}
                  {metrics.totalHosts !== null && metrics.totalHosts > 0 ? `/${metrics.totalHosts}` : ""}
                </strong>
              </div>
              <div className="dash-stat-row">
                <span className="dash-stat-dot" style={{ background: "var(--text-tertiary)" }} />
                <span>Paused</span>
                <strong>{metrics.pausedContainers ?? "—"}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Kubernetes */}
        <div className="dash-insight-card">
          <div className="dash-insight-header">
            <span className="dash-insight-title">Kubernetes</span>
            <SiKubernetes className="dash-insight-icon" />
          </div>
          <div className="dash-insight-body">
            <DonutRing
              value={metrics.podRunning ?? 0}
              total={Math.max(metrics.podCount ?? 0, 1)}
              color="var(--red)"
              size={72} stroke={8}
            />
            <div className="dash-insight-stats">
              <div className="dash-stat-row">
                <span className="dash-stat-dot" style={{ background: "var(--green)" }} />
                <span>Running</span>
                <strong>{metrics.podRunning ?? "—"}</strong>
              </div>
              <div className="dash-stat-row">
                <span className="dash-stat-dot" style={{ background: "var(--amber)" }} />
                <span>Pending</span>
                <strong>{metrics.podPending ?? "—"}</strong>
              </div>
              <div className="dash-stat-row">
                <span className="dash-stat-dot" style={{ background: "var(--red)" }} />
                <span>Failed</span>
                <strong>{metrics.podFailed ?? "—"}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Service grid ── */}
      <div className={`dash-service-grid${isLoaded ? " is-loaded" : ""}`}>
        {SERVICES.map((svc, i) => {
          const Icon = svc.icon;
          const status = statuses[svc.key];
          return (
            <Link
              key={svc.key}
              to={svc.path}
              className="home-card dash-service-card"
              style={{ "--card-accent": svc.accent, "--i": i }}
            >
              <div className="dash-card-header">
                <div className="home-card-icon">
                  <Icon />
                </div>
                <div className="dash-card-title-row">
                  <h2 className="dash-card-title">{svc.title}</h2>
                  <span className={`status-dot ${status}`} title={status} />
                </div>
              </div>
              <p className="dash-card-desc">{svc.desc}</p>
              <div className="dash-card-footer">
                <span className="dash-card-badge">{getBadge(svc.key)}</span>
                <div className="home-card-arrow">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
