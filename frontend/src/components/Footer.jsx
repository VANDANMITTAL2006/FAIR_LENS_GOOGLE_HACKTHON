import { Shield, Github, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="mt-20 border-t border-slate-800 bg-[#020617]/95">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-white">
              <Shield size={16} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">
                FairLens
              </h3>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Responsible AI Platform
              </p>
            </div>
          </div>

          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
            Detect bias, evaluate fairness, and improve trust in machine
            learning systems through explainable audits.
          </p>
        </div>

        {/* Links */}
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Platform
          </h4>

          <div className="mt-4 space-y-3 text-sm text-slate-400">
            <p>Bias Detection</p>
            <p>Counterfactual Testing</p>
            <p>Fairness Metrics</p>
            <p>Debiasing Engine</p>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Connect
          </h4>

          <div className="mt-4 space-y-3 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Github size={14} />
              <span>GitHub Repository</span>
            </div>

            <div className="flex items-center gap-2">
              <Mail size={14} />
              <span>Team Submission Ready</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        © 2026 FairLens — Built for Innovation & Fair AI
      </div>
    </footer>
  );
};

export default Footer;