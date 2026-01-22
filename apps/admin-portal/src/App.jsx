import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import { Toaster } from 'react-hot-toast';
import RequireAuth from './components/RequireAuth';
import RequirePermission from './components/RequirePermission';
import { ViewModeProvider } from './context/ViewModeContext';

// Import Pages
import Dashboard from './pages/Dashboard';
import Registrations from './pages/Registrations';
import Events from './pages/Events';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Login from './pages/Login';
import SetPassword from './pages/SetPassword';
import Mailer from './pages/Mailer';
import TeamEntryUpdate from './pages/TeamEntryUpdate';

function App() {
  return (
    <BrowserRouter>
      <ViewModeProvider>
        <Toaster position="top-right" reverseOrder={false} />
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/team-entry/update" element={<TeamEntryUpdate />} />

        {/* Main Admin Route */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          {/* Index route shows the Dashboard by default at admin.iedclbscek.in/ */}
          <Route
            index
            element={
              <RequirePermission permission="dashboard">
                <Dashboard />
              </RequirePermission>
            }
          />
          
          {/* Sub-pages */}
          <Route
            path="registrations"
            element={
              <RequirePermission permission="registrations">
                <Registrations />
              </RequirePermission>
            }
          />
          <Route
            path="events"
            element={
              <RequirePermission permission="events">
                <Events />
              </RequirePermission>
            }
          />
          <Route
            path="users"
            element={
              <RequirePermission permission="users">
                <Users />
              </RequirePermission>
            }
          />
          <Route
            path="settings"
            element={
              <RequirePermission permission="settings">
                <Settings />
              </RequirePermission>
            }
          />
          
          <Route
            path="mailer"
            element={
              <RequirePermission permission="mailer">
                <Mailer />
              </RequirePermission>
            }
          />
        </Route>

        {/* 404 Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ViewModeProvider>
    </BrowserRouter>
  );
}

export default App;