import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <Navbar />
      <main className="pt-24">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/audit/:jobId" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;