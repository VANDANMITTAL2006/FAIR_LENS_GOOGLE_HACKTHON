import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";

function App() {
  const handleLoadDemo = () => {
    window.location.href = "/";
  };

  const handleExport = () => {
    const event = new CustomEvent("fairlens-export");
    window.dispatchEvent(event);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <Navbar
        onLoadDemo={handleLoadDemo}
        onExport={handleExport}
      />

      <main className="pt-28">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/audit/:jobId" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;