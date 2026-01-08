import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { me } from '../api/authService';
import { useViewMode } from '../context/ViewModeContext';

const PERMISSION_TO_PATH = {
  dashboard: '/',
  registrations: '/registrations',
  events: '/events',
  users: '/users',
  mailer: '/mailer',
  settings: '/settings',
};

const PERMISSION_ORDER = ['dashboard', 'registrations', 'events', 'users', 'mailer', 'settings'];

const normalize = (v) => String(v ?? '').trim().toLowerCase();

const CLUB_VIEW_PAGES = new Set(['dashboard', 'events', 'users']);

const isAllowed = (user, permission) => {
  const role = normalize(user?.role);
  if (role === 'admin') return true;

  const required = normalize(permission);
  if (CLUB_VIEW_PAGES.has(required) && user?.isClubLead) return true;
  if (!required) return true;

  const perms = Array.isArray(user?.permissions)
    ? user.permissions.map((p) => normalize(p)).filter(Boolean)
    : [];

  return perms.includes(required);
};

const getFallbackPath = (user) => {
  const role = normalize(user?.role);
  if (role === 'admin') return '/';

  if (user?.isClubLead) return '/';

  const perms = Array.isArray(user?.permissions)
    ? user.permissions.map((p) => normalize(p)).filter(Boolean)
    : [];

  for (const p of PERMISSION_ORDER) {
    if (perms.includes(p)) return PERMISSION_TO_PATH[p] || '/';
  }
  return '/login';
};

export default function RequirePermission({ permission, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const didToastRef = useRef(false);
  const { mode } = useViewMode();

  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: me,
    retry: false,
  });

  const required = normalize(permission);
  const blockedByClubView = mode === 'club' && !CLUB_VIEW_PAGES.has(required);
  const allowedInClubView = mode === 'club' && CLUB_VIEW_PAGES.has(required) && Boolean(data?.id);
  const allowed = !blockedByClubView && (allowedInClubView || isAllowed(data, permission));
  const fallback = getFallbackPath(data);

  useEffect(() => {
    if (!data?.id) {
      navigate('/login', { replace: true, state: { from: location } });
      return;
    }

    if (allowed) return;

    if (!didToastRef.current) {
      didToastRef.current = true;
      toast.error('You do not have permission to access this page');
    }

    navigate(fallback, { replace: true, state: { from: location } });
  }, [allowed, data?.id, fallback, location, navigate]);

  if (!data?.id) return null;
  if (!allowed) return null;
  return children;
}
