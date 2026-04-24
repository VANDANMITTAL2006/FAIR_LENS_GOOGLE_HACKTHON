import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Button } from '../ui/Button';

const sidebarItems = [
  { label: 'Overview', path: '/', icon: 'material-symbols:dashboard' },
  { label: 'Bias Detection', path: '/audit', icon: 'material-symbols:query-stats' },
  { label: 'Fairness Metrics', path: '/audit', icon: 'material-symbols:balance' },
  { label: 'Audit Logs', path: '/report', icon: 'material-symbols:receipt-long' },
];

export default function Sidebar({ collapsed = false }) {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-[#0B0F14]/85 backdrop-blur-2xl border-r border-white/10 z-40 hidden lg:flex flex-col pt-20 pb-4 px-3 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className={`px-2 ${collapsed ? 'mb-4' : 'mb-6'}`}>
        <div className={`glass rounded-2xl p-3 flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="h-10 w-10 rounded-xl bg-white text-black flex items-center justify-center">
            <Icon icon="material-symbols:shield" className="text-xl" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-on-surface leading-none">Audit Console</h3>
              <p className="text-[11px] text-slate-500 mt-1 truncate">Bias + fairness controls</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-1">
        {sidebarItems.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            className={`group flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-xl transition-all duration-200 ${
              isActive(item.path)
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.06]'
            }`}
          >
            <Icon icon={item.icon} className="text-lg" />
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            {collapsed && (
              <span className="sr-only">{item.label}</span>
            )}
          </Link>
        ))}
      </div>

      <div className="pt-3 mt-3 ui-divider space-y-1">
        <Button
          variant="ghost"
          className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start'}`}
        >
          <Icon icon="material-symbols:help" className="text-lg" />
          {!collapsed && <span>Support</span>}
        </Button>
        <Button
          variant="ghost"
          className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start'}`}
        >
          <Icon icon="material-symbols:description" className="text-lg" />
          {!collapsed && <span>Docs</span>}
        </Button>
      </div>
    </aside>
  );
}
