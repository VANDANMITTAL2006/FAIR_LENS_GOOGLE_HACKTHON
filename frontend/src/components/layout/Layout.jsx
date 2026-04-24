import { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout({ children, onRunNewAudit }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-surface font-body overflow-x-hidden">
      <Navbar
        onRunNewAudit={onRunNewAudit}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
      />
      <Sidebar collapsed={sidebarCollapsed} />
      <main className={`pt-16 min-h-screen ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {children}
      </main>
    </div>
  );
}
