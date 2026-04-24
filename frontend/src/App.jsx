import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import AuditResults from './pages/AuditResults';
import ReportPreview from './pages/ReportPreview';

function AppContent() {
  const navigate = useNavigate();
  const handleRunNewAudit = () => navigate('/');

  return (
    <Layout onRunNewAudit={handleRunNewAudit}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/audit/:jobId" element={<AuditResults />} />
        <Route path="/report" element={<ReportPreview />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;