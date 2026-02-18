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
import VncConsole from './pages/VncConsole'

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
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App
