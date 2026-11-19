import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { me } from '../api/authService';
import { useViewMode } from '../context/ViewModeContext';
import { getWorkspaceAccess, hasWorkspacePermission, normalizePortalRole } from '../utils/authorization';

const pages = [
  ['dashboard', '/'], ['events', '/events'], ['registrations', '/registrations'],
  ['users', '/users'], ['firstYearReps', '/first-year-reps'], ['secondYearReps', '/second-year-reps'], ['makerspace', '/makerspace'],
  ['mailer', '/mailer'], ['settings', '/settings'],
];

export default function RequirePermission({ permission, children }) {
  const { mode, clubId } = useViewMode();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: me, retry: false });
  const club = getWorkspaceAccess(user, clubId);
  function canOpen(key) {
    if (key === 'nexusAdmin') return normalizePortalRole(user?.role) === 'super_admin';
    if (mode !== 'club') return user?.canUseIedc && hasWorkspacePermission(user, key);
    if (key === 'users') return club.managePermissions;
    return club.view && (key === 'events' || key === 'dashboard');
  }
  if (canOpen(permission)) return children;
  const firstPage = pages.find(([key]) => canOpen(key));
  if (firstPage) return <Navigate to={firstPage[1]} replace/>;
  return <section className="surface feedback"><h1>No tools assigned</h1><p>Ask your administrator to grant access to this workspace.</p></section>;
}
