import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Reports', path: '/report' },
];

export default function Navbar({ onRunNewAudit, sidebarCollapsed, onToggleSidebar }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 sm:px-6 h-16 bg-[#0B0F14]/70 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.06] text-slate-300 focus-ring"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Icon icon={sidebarCollapsed ? 'material-symbols:keyboard-double-arrow-right' : 'material-symbols:keyboard-double-arrow-left'} className="text-lg" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-white text-black flex items-center justify-center font-black tracking-tight">
              FL
            </div>
            <span className="text-sm font-semibold tracking-tight text-on-surface hidden sm:inline">FairLens</span>
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm font-medium transition-all duration-200 px-3 py-1 rounded ${
                isActive(item.path)
                  ? 'text-[#E5E7EB] border-b-2 border-[#E5E7EB] pb-1'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden lg:block w-[420px]">
          <div className="relative">
            <Icon icon="material-symbols:search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Search audits, datasets, reports…"
              className="pl-9"
            />
          </div>
        </div>
        {onRunNewAudit && (
          <Button onClick={onRunNewAudit} variant="primary" className="hidden sm:flex">
            <Icon icon="material-symbols:play-circle" className="text-base" />
            Run audit
          </Button>
        )}

        <button className="hidden md:flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors focus-ring">
          <Icon icon="material-symbols:notifications" className="text-lg" />
        </button>
        <button className="hidden md:flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors focus-ring">
          <Icon icon="material-symbols:settings" className="text-lg" />
        </button>
        <div className="hidden md:flex items-center gap-2 pl-2">
          <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10" />
          <div className="hidden lg:block">
            <div className="text-xs font-semibold text-on-surface leading-none">Risk Ops</div>
            <div className="text-[11px] text-slate-500 leading-none mt-1">Enterprise</div>
          </div>
        </div>

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 text-white"
        >
          <Icon icon={isMenuOpen ? 'material-symbols:close' : 'material-symbols:menu'} className="text-lg" />
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="absolute top-16 left-0 w-full bg-[#0B0F14]/95 backdrop-blur-xl border-b border-white/10 px-4 py-4 space-y-2 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg text-sm font-medium ${
                isActive(item.path)
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {onRunNewAudit && (
            <Button
              onClick={() => {
                setIsMenuOpen(false);
                onRunNewAudit();
              }}
              variant="primary"
              className="w-full"
            >
              <Icon icon="material-symbols:play-circle" />
              Run audit
            </Button>
          )}
        </div>
      )}
    </nav>
  );
}
