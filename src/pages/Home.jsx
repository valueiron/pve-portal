import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { FaServer, FaHdd, FaNetworkWired, FaFlask, FaSitemap, FaTicketAlt, FaRobot } from "react-icons/fa";
import { SiKubernetes, SiDocker } from "react-icons/si";
import { API_ENDPOINTS } from "../config/api";
import "./Page.css";
import "./Home.css";

async function fetchWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, credentials: 'include' });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) { clearTimeout(id); throw err; }
}

const SERVICES = [
  { key: 'vms',        title: 'Virtual Machines', desc: 'Manage VMs across Proxmox, Azure, and AWS',   icon: FaServer,       path: '/virtual-machines', accent: 'var(--accent)'                 },
  { key: 'storage',    title: 'Storage',           desc: 'Configure storage resources and volumes',     icon: FaHdd,          path: '/storage',           accent: 'var(--green)'                  },
  { key: 'networking', title: 'Networking',        desc: 'VNets, subnets, VPCs and security groups',   icon: FaNetworkWired, path: '/networking',         accent: 'var(--amber)'                  },
  { key: 'k8s',        title: 'Kubernetes',        desc: 'Cluster workloads, pods and deployments',    icon: SiKubernetes,   path: '/kubernetes',         accent: 'var(--red)'                    },
  { key: 'docker',     title: 'Docker',            desc: 'Containers, images and multi-host agents',   icon: SiDocker,       path: '/docker',             accent: 'var(--text-tertiary)'          },
  { key: 'labs',       title: 'Labs',              desc: 'Sandbox environments and lab exercises',     icon: FaFlask,        path: '/labs',               accent: 'var(--orange)'                 },
  { key: 'vyos',       title: 'VyOS',              desc: 'Router and firewall configuration',          icon: FaSitemap,      path: '/vyos',               accent: 'var(--purple, var(--accent))'  },
  { key: 'tickets',    title: 'Tickets',           desc: 'Kanban boards and issue tracking',           icon: FaTicketAlt,    path: '/tickets',            accent: 'var(--cyan, var(--accent))'    },
  { key: 'ai',         title: 'AI Assistant',      desc: 'Intelligent infrastructure guidance',        icon: FaRobot,        path: '/ai',                 accent: 'var(--accent)'                 },
];

// AnimatedNumber: counts from 0 → target on first mount; subsequent updates snap instantly
function AnimatedNumber({ value, isLoading }) {
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);
  const rafRef = useRef(null);

  useEffect(() => {
    if (isLoading) return;
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      const start = performance.now();
      const duration = 600;
      const from = 0;
      const to = value;
      const step = (now) => {
        const t = Math.min((now - start) / duration, 1);
        // ease out cubic
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(from + (to - from) * eased));
        if (t < 1) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    } else {
      setDisplay(value);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, isLoading]);

  return <span className="dash-kpi-number">{display}</span>;
}

const POLL_INTERVAL = 60_000;

export default function Home() {
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(SERVICES.map(s => [s.key, 'loading']))
  );
  const [metrics, setMetrics] = useState({
    vmCount: null,
    runningContainers: null,
    podCount: null,
    boardCount: null,
    labCount: null,
    vyosCount: null,
    storageTotal: null,
    netTotal: null,
  });
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const lastFetchTime = useRef(null);
  const isFirstFetch = useRef(true);

  const fetchAll = useCallback(async () => {
    const [
      vmsRes, storageRes, netRes,
      podsRes, deploymentsRes, nodesRes,
      dockerRes, dockerInfoRes,
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
      fetchWithTimeout(API_ENDPOINTS.LABS),
      fetchWithTimeout(API_ENDPOINTS.VYOS_DEVICES),
      fetchWithTimeout(API_ENDPOINTS.TICKETS_BOARDS),
    ]);

    const ok = (r) => r.status === 'fulfilled';

    // --- VMs ---
    const vmsData = ok(vmsRes) ? (vmsRes.value?.vms ?? vmsRes.value ?? []) : null;
    const vmStatus = vmsData ? 'online' : 'offline';
    const vmCount = vmsData?.length ?? 0;

    // --- Storage ---
    let storageStatus = 'offline';
    let storageTotal = 0;
    if (ok(storageRes)) {
      const v = storageRes.value;
      storageTotal = (v.storage_accounts?.length ?? 0) + (v.containers?.length ?? 0) +
                     (v.buckets?.length ?? 0) + (v.storages?.length ?? 0);
      // degraded if any expected key is empty (partial failure)
      const hasSome = storageTotal > 0;
      const hasAll = v.storage_accounts && v.storages;
      storageStatus = hasSome ? (hasAll ? 'online' : 'degraded') : 'online'; // empty env is still online
    }

    // --- Networking ---
    let netStatus = 'offline';
    let netTotal = 0;
    if (ok(netRes)) {
      const v = netRes.value;
      netTotal = Object.values(v).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
      netStatus = 'online';
    }

    // --- Kubernetes ---
    const podsOk = ok(podsRes);
    const deploymentsOk = ok(deploymentsRes);
    const nodesOk = ok(nodesRes);
    let k8sStatus = 'offline';
    let podCount = 0;
    if (podsOk) {
      podCount = (podsRes.value?.pods ?? podsRes.value ?? []).length;
      k8sStatus = (deploymentsOk && nodesOk) ? 'online' : 'degraded';
    }

    // --- Docker ---
    let dockerStatus = 'offline';
    let runningContainers = 0;
    if (ok(dockerRes)) {
      const containers = dockerRes.value?.containers ?? dockerRes.value ?? [];
      runningContainers = Array.isArray(containers)
        ? containers.filter(c => (c.status || c.State || '').toLowerCase().includes('running')).length
        : 0;
      dockerStatus = 'online';
    }

    // --- Labs ---
    const labsData = ok(labsRes) ? (labsRes.value?.labs ?? labsRes.value ?? []) : null;
    const labStatus = labsData ? 'online' : 'offline';
    const labCount = labsData?.length ?? 0;

    // --- VyOS ---
    const vyosData = ok(vyosRes) ? (vyosRes.value?.devices ?? vyosRes.value ?? []) : null;
    const vyosStatus = vyosData ? 'online' : 'offline';
    const vyosCount = Array.isArray(vyosData) ? vyosData.length : 0;

    // --- Tickets ---
    const ticketsData = ok(ticketsRes) ? (ticketsRes.value?.boards ?? ticketsRes.value ?? []) : null;
    const ticketsStatus = ticketsData ? 'online' : 'offline';
    const boardCount = Array.isArray(ticketsData) ? ticketsData.length : 0;

    // --- AI: online if any other service responded ---
    const anyOnline = [vmStatus, storageStatus, netStatus, k8sStatus, dockerStatus,
                       labStatus, vyosStatus, ticketsStatus].some(s => s === 'online' || s === 'degraded');
    const aiStatus = anyOnline ? 'online' : 'offline';

    setStatuses({
      vms: vmStatus,
      storage: storageStatus,
      networking: netStatus,
      k8s: k8sStatus,
      docker: dockerStatus,
      labs: labStatus,
      vyos: vyosStatus,
      tickets: ticketsStatus,
      ai: aiStatus,
    });

    setMetrics({ vmCount, runningContainers, podCount, boardCount, labCount, vyosCount, storageTotal, netTotal });
    lastFetchTime.current = Date.now();
    setSecondsAgo(0);

    if (isFirstFetch.current) {
      isFirstFetch.current = false;
      setIsLoaded(true);
    }
  }, []);

  // Initial fetch + 60s polling
  useEffect(() => {
    fetchAll();
    const pollId = setInterval(fetchAll, POLL_INTERVAL);
    return () => clearInterval(pollId);
  }, [fetchAll]);

  // Live "seconds ago" counter
  useEffect(() => {
    const id = setInterval(() => {
      if (lastFetchTime.current) {
        setSecondsAgo(Math.floor((Date.now() - lastFetchTime.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const onlineCount = Object.values(statuses).filter(s => s === 'online').length;

  // KPI tiles definition
  const kpiTiles = [
    { label: 'Virtual Machines',    key: 'vmCount'           },
    { label: 'Running Containers',  key: 'runningContainers' },
    { label: 'K8s Pods',            key: 'podCount'          },
    { label: 'Ticket Boards',       key: 'boardCount'        },
    { label: 'Available Labs',      key: 'labCount'          },
    { label: 'VyOS Devices',        key: 'vyosCount'         },
  ];

  // Badge text per service
  const getBadge = (key) => {
    const { vmCount, runningContainers, podCount, boardCount, labCount, vyosCount, storageTotal, netTotal } = metrics;
    switch (key) {
      case 'vms':        return vmCount !== null        ? `${vmCount} VMs`           : '—';
      case 'storage':    return storageTotal !== null   ? `${storageTotal} resources` : '—';
      case 'networking': return netTotal !== null       ? `${netTotal} resources`     : '—';
      case 'k8s':        return podCount !== null       ? `${podCount} pods`          : '—';
      case 'docker':     return runningContainers !== null ? `${runningContainers} running` : '—';
      case 'labs':       return labCount !== null       ? `${labCount} labs`          : '—';
      case 'vyos':       return vyosCount !== null      ? `${vyosCount} devices`      : '—';
      case 'tickets':    return boardCount !== null     ? `${boardCount} boards`      : '—';
      case 'ai':         return 'Always available';
      default:           return '—';
    }
  };

  const overallDotStatus = onlineCount === 9 ? 'online'
    : Object.values(statuses).some(s => s === 'offline') ? 'offline'
    : Object.values(statuses).some(s => s === 'loading') ? 'loading'
    : 'degraded';

  return (
    <div className="page-container">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="page-title">Platform Overview</h1>
          <p className="page-description">Real-time health and resource metrics across your infrastructure</p>
        </div>
        <div className="dash-last-updated">
          {lastFetchTime.current ? `Last updated: ${secondsAgo}s ago` : 'Fetching…'}
        </div>
      </div>

      {/* Health bar */}
      <div className="dash-health-bar">
        <span className={`status-dot ${overallDotStatus}`} />
        <span className="dash-health-text">{onlineCount}/9 services online</span>
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

      {/* KPI row */}
      <div className="dash-kpi-row">
        {kpiTiles.map(tile => {
          const val = metrics[tile.key];
          const loading = val === null;
          return (
            <div key={tile.key} className="dash-kpi-tile">
              {loading ? (
                <div className="dash-kpi-skeleton" />
              ) : (
                <div className="dash-kpi-value">
                  <AnimatedNumber value={val} isLoading={loading} />
                </div>
              )}
              <div className="dash-kpi-label">{tile.label}</div>
            </div>
          );
        })}
      </div>

      {/* Service grid */}
      <div className={`dash-service-grid${isLoaded ? ' is-loaded' : ''}`}>
        {SERVICES.map((svc, i) => {
          const Icon = svc.icon;
          const status = statuses[svc.key];
          return (
            <Link
              key={svc.key}
              to={svc.path}
              className="home-card dash-service-card"
              style={{ '--card-accent': svc.accent, '--i': i }}
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
                    <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
