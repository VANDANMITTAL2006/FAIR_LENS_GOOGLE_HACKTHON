import { useState } from 'react';
import {
  Menu,
  X,
  Download,
  Shield,
  Bell,
  Settings,
  Search,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', id: 'dashboard' },
  { label: 'Models', id: 'models' },
  { label: 'Reports', id: 'reports' },
  { label: 'Datasets', id: 'datasets' },
];

const Navbar = ({ onLoadDemo, onExport }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
    setIsMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800 bg-[#07111f]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">

        {/* Left */}
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-white shadow-lg">
              <Shield size={18} />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                FairLens
              </h1>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Enterprise Audit
              </p>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item, index) => (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.id)}
                className={`text-sm font-medium transition ${
                  index === 0
                    ? 'text-white border-b-2 border-white pb-1'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right */}
        <div className="hidden md:flex items-center gap-3">
          <div className="hidden xl:flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-400">
            <Search size={14} />
            <input
              placeholder="Search insights..."
              className="w-44 bg-transparent text-sm outline-none placeholder:text-slate-500"
            />
          </div>

          <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white">
            <Bell size={16} />
          </button>

          <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white">
            <Settings size={16} />
          </button>

          <button
            onClick={onLoadDemo}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Load Demo
          </button>

          <button
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Download size={14} />
            Export
          </button>

          <div className="h-10 w-10 rounded-full border border-slate-700 bg-slate-600" />
        </div>

        {/* Mobile */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-white"
        >
          {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="border-t border-slate-800 bg-[#07111f] px-4 py-4 md:hidden space-y-3">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => scrollToSection(item.id)}
              className="block w-full rounded-lg bg-slate-900 px-4 py-3 text-left text-sm text-slate-200"
            >
              {item.label}
            </button>
          ))}

          <button
            onClick={onLoadDemo}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm text-white"
          >
            Load Demo
          </button>

          <button
            onClick={onExport}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white"
          >
            Export Report
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;