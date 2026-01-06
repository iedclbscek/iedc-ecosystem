import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';

// Import Pages
import Dashboard from './pages/Dashboard';
import Registrations from './pages/Registrations';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main Admin Route */}
        <Route path="/" element={<AdminLayout />}>
          {/* Index route shows the Dashboard by default at admin.iedclbscek.in/ */}
          <Route index element={<Dashboard />} />
          
          {/* Sub-pages */}
          <Route path="registrations" element={<Registrations />} />
          <Route path="settings" element={<Settings />} />
          
          {/* Placeholder for Mail Center which we'll build next */}
          <Route path="mailer" element={<div className="p-8">Email Center Coming Soon...</div>} />
        </Route>

        {/* 404 Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;