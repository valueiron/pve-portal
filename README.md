# PVE Portal

A unified infrastructure management dashboard for Proxmox, Azure, and AWS — built with React 19 and Vite 7.

![React](https://img.shields.io/badge/React-19-61dafb)
![Vite](https://img.shields.io/badge/Vite-7-646cff)
![Docker](https://img.shields.io/badge/Docker-nginx--alpine-2496ed)

---

## Overview

PVE Portal provides a single pane of glass for managing hybrid cloud and on-prem infrastructure. It connects to a backend API and surfaces data across multiple providers and services.

**Supported platforms:**

| Platform | VMs | Storage | Networking |
|----------|-----|---------|------------|
| Proxmox  | ✓   | ✓       |            |
| Azure    | ✓   | ✓       | ✓          |
| AWS      | ✓   | ✓       | ✓          |

---

## Features

- **Virtual Machines** — list, filter, start/stop, open VNC console or SSH terminal across Proxmox, Azure, and AWS
- **Storage** — view and manage storage volumes and resources per provider
- **Networking** — VNets, subnets, security groups, DNS tab with customer zones and blocklists
- **Kubernetes** — pods, deployments, services, nodes, namespaces, and in-browser pod exec (xterm.js)
- **Docker** — containers, images, volumes, networks, logs, metrics, and in-browser container exec (xterm.js)
- **VyOS** — firewall rules, NAT, static routes, DHCP server, VLANs, address groups
- **Labs** — markdown-based sandbox environments with integrated terminal and VNC panels
- **VNC Console** — full-screen browser-based VM console via noVNC
- **SSH Terminal** — browser-based SSH access to VMs via xterm.js
- **Dark / Light theme** — "Midnight Command" dark and "Gilded Slate" light, persisted to localStorage

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite 7 |
| Routing | React Router DOM v6 |
| Icons | react-icons 5 |
| Terminal | xterm.js 6 + addons |
| VNC | @novnc/novnc 1.5 |
| Markdown | react-markdown 9 |
| Linting | ESLint 9 (flat config) |
| Server | nginx (stable-alpine) |
| Container | Docker multi-stage build |

---

## Project Structure

```
pve-portal/
├── src/
│   ├── pages/               # Page components
│   │   ├── Home.jsx
│   │   ├── VirtualMachines.jsx
│   │   ├── Storage.jsx
│   │   ├── Networking.jsx
│   │   ├── Kubernetes.jsx
│   │   ├── Docker.jsx
│   │   ├── Labs.jsx
│   │   ├── LabView.jsx
│   │   ├── VyOS.jsx
│   │   ├── VncConsole.jsx
│   │   ├── VncPanel.jsx
│   │   ├── TerminalPanel.jsx
│   │   └── DnsTab.jsx
│   ├── services/            # API service functions per domain
│   │   ├── vmService.js
│   │   ├── dockerService.js
│   │   ├── k8sService.js
│   │   ├── vyosService.js
│   │   ├── dnsService.js
│   │   ├── labsService.js
│   │   ├── storageService.js
│   │   └── networkingService.js
│   ├── config/
│   │   └── api.js           # All API endpoint constants
│   ├── utils/
│   │   ├── fetchJSON.js     # Shared JSON fetch helper
│   │   ├── cache.js         # Session-scoped in-memory cache
│   │   └── terminalTheme.js # xterm.js theme config
│   ├── assets/              # Bundled static assets (provider icons, etc.)
│   ├── App.jsx              # Root router
│   ├── Nav.jsx              # Collapsible sidebar nav
│   ├── Header.jsx           # Header with logo and theme toggle
│   ├── index.css            # Global design system (CSS variables, both themes)
│   └── main.jsx             # React entry point
├── public/
│   ├── config.js            # Runtime API config (dev)
│   ├── config.js.template   # Runtime API config template (Docker)
│   └── logo.png             # Portal logo (optional)
├── Dockerfile
├── nginx.conf
├── vite.config.js
└── eslint.config.js
```

---

## Getting Started (Development)

**Prerequisites:** Node.js LTS

```bash
npm install
npm run dev
```

The dev server binds to all interfaces (`--host`) on port 5173 by default.

**Other scripts:**

```bash
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
```

### API Configuration

In development, the portal points to `http://localhost:5000` by default. To override, edit `public/config.js`:

```js
window.__API_BASE_URL__ = 'http://your-backend:5000';
```

---

## Deployment (Docker)

### Build the image

```bash
docker build -t pve-portal .
```

### Run the container

```bash
# Auto-detect API URL from page origin (nginx proxies /api/* to pve-backend)
docker run -d -p 80:80 --name pve-portal pve-portal

# Explicit API base URL
docker run -d -p 80:80 -e API_BASE_URL=http://your-backend:5000 --name pve-portal pve-portal
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BASE_URL` | *(none)* | Full URL to the backend API. If unset, the frontend auto-detects based on page origin and relies on nginx to proxy `/api/*`. |

---

## Backend Dependencies

The nginx config proxies these backend services. All must be reachable by hostname from within the same Docker network.

| nginx path | Target | Purpose |
|------------|--------|---------|
| `/api/*` | `pve-backend:5000` | Main REST API |
| `/vnc` | `pve-backend:5001` | VNC WebSocket |
| `/ws/terminal` | `pve-backend:5001` | SSH terminal WebSocket |
| `/ws/docker-exec` | `docker-api:8080` | Docker container exec WebSocket |
| `/ws/k8s-exec` | `k8s-api:8081` | Kubernetes pod exec WebSocket |
| `/health` | *(nginx)* | Health check — returns `200 healthy` |

---

## Architecture Notes

**API layer:** All data fetching goes through `src/services/` functions. Endpoint URLs are centralized in `src/config/api.js`. A shared `fetchJSON` helper handles JSON parsing and error throwing.

**Caching:** Docker and Kubernetes services use a session-scoped in-memory cache with a `forceRefresh` flag. The cache is cleared on page reload — no persistent storage.

**Routing:** React Router v6 with three layout modes:
- `/console` — full-screen VNC (no nav/header)
- `/labs/:labId` — full-width lab view (header only)
- All other routes — header + collapsible sidebar + content area

**WebSockets:** xterm.js terminals connect over `ws://` / `wss://` (matched to page protocol). noVNC connects for VNC sessions. Both are proxied through nginx to avoid cross-origin issues.

**Theming:** CSS custom properties drive both themes. The active theme is written to `localStorage` on toggle and applied before React mounts (inline script in `index.html`) to prevent flash.

**Assets:** Provider icons (Proxmox, Azure, AWS) are imported as Vite asset modules from `src/assets/` so they are content-hashed and bundled correctly regardless of deployment path.
