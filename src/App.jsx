import './App.css'
import { Routes, Route, useLocation } from 'react-router-dom'
import Nav from './Nav'
import Header from './Header'
import Home from './pages/Home'
import VirtualMachines from './pages/VirtualMachines'
import Storage from './pages/Storage'
import Networking from './pages/Networking'
import Kubernetes from './pages/Kubernetes'
import Docker from './pages/Docker'
import Labs from './pages/Labs'
import LabView from './pages/LabView'
import VncConsole from './pages/VncConsole'
import VyOS from './pages/VyOS'
import Tickets from './pages/Tickets'
import AI from './pages/AI'

function App() {
  const location = useLocation();

  // VNC console gets a full-screen layout (no header/nav)
  if (location.pathname === '/console') {
    return (
      <Routes>
        <Route path="/console" element={<VncConsole />} />
      </Routes>
    );
  }

  // Lab view: header stays, nav is hidden, content fills the rest
  if (location.pathname.startsWith('/labs/')) {
    return (
      <div className="app-container">
        <Header />
        <main className="app-main app-main--fullwidth">
          <Routes>
            <Route path="/labs/:labId" element={<LabView />} />
          </Routes>
        </main>
      </div>
    );
  }

  // AI page: header + nav stay, but content fills without padding and uses internal scroll
  if (location.pathname === '/ai') {
    return (
      <div className="app-container">
        <Header />
        <Nav />
        <main className="app-main app-main--chat">
          <Routes>
            <Route path="/ai" element={<AI />} />
          </Routes>
        </main>
      </div>
    );
  }

  // Regular pages with Header/Nav
  return (
    <div className="app-container">
      <Header />
      <Nav />
      <main className="app-main">
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/virtual-machines" element={<VirtualMachines />} />
            <Route path="/storage" element={<Storage />} />
            <Route path="/networking" element={<Networking />} />
            <Route path="/kubernetes" element={<Kubernetes />} />
            <Route path="/docker" element={<Docker />} />
            <Route path="/labs" element={<Labs />} />
            <Route path="/vyos" element={<VyOS />} />
            <Route path="/tickets" element={<Tickets />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App
