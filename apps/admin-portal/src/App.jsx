import { createBrowserRouter, createRoutesFromElements, RouterProvider, Outlet, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import PageSkeleton from './components/PageSkeleton';
import AdminLayout from './layouts/AdminLayout';
import { Toaster } from 'react-hot-toast';
import RequireAuth from './components/RequireAuth';
import RequirePermission from './components/RequirePermission';
import { ViewModeProvider } from './context/ViewModeProvider';

// Import Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Registrations = lazy(() => import('./pages/Registrations'));
const Events = lazy(() => import('./pages/Events'));
const ClubNexusEditor = lazy(() => import('./pages/ClubNexusEditor'));
const NexusDirectory = lazy(() => import('./pages/NexusDirectory'));
const Users = lazy(() => import('./pages/Users'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));
const SetPassword = lazy(() => import('./pages/SetPassword'));
const Mailer = lazy(() => import('./pages/Mailer'));
const Makerspace = lazy(() => import('./pages/Makerspace'));
const TeamEntryUpdate = lazy(() => import('./pages/TeamEntryUpdate'));
const FirstYearReps = lazy(() => import('./pages/FirstYearReps'));

const router = createBrowserRouter(createRoutesFromElements(
  <Route element={<ViewModeProvider><Toaster position="top-right" reverseOrder={false} /><Suspense fallback={<PageSkeleton />}><Outlet /></Suspense></ViewModeProvider>}>
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
          
          <Route path="clubs/:clubId/nexus" element={<ClubNexusEditor />} />
          <Route path="nexus" element={<RequirePermission permission="nexusAdmin"><NexusDirectory /></RequirePermission>} />
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
          
          <Route
            path="makerspace"
            element={
              <RequirePermission permission="makerspace">
                <Makerspace />
              </RequirePermission>
            }
          />

          <Route
            path="first-year-reps"
            element={
              <RequirePermission permission="firstYearReps">
                <FirstYearReps />
              </RequirePermission>
            }
          />
        </Route>

        {/* 404 Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
  </Route>
));
function App() { return <RouterProvider router={router} />; }

export default App;
