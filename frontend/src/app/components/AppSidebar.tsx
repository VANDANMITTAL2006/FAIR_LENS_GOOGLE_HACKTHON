import { LayoutDashboard, Upload, BarChart3, Zap, FileCheck, History } from 'lucide-react';
import { Link, useLocation } from 'react-router';

export function AppSidebar() {
  const location = useLocation();

  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/upload', icon: Upload, label: 'New Audit' },
    { to: '/analysis', icon: BarChart3, label: 'Analysis' },
    { to: '/debias', icon: Zap, label: 'Debias Lab' },
    { to: '/compliance', icon: FileCheck, label: 'Compliance' },
    { to: '/history', icon: History, label: 'History' },
  ];

  return (
    <div className="w-64 h-screen bg-black border-r border-zinc-800 flex flex-col">
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl text-zinc-100">FairLens</h1>
        <p className="text-xs text-zinc-500 mt-1">AI Fairness Auditing</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800 text-xs text-zinc-500">
        v1.0.0
      </div>
    </div>
  );
}
