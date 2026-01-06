import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { me } from '../api/authService';

const PERMISSION_TO_PATH = {
  dashboard: '/',
  registrations: '/registrations',
  users: '/users',
  mailer: '/mailer',
  settings: '/settings',
};

const PERMISSION_ORDER = ['dashboard', 'registrations', 'users', 'mailer', 'settings'];

const normalize = (v) => String(v ?? '').trim().toLowerCase();

const isAllowed = (user, permission) => {
  const role = normalize(user?.role);
  if (role === 'admin') return true;

  const required = normalize(permission);
  if (!required) return true;

  const perms = Array.isArray(user?.permissions)
    ? user.permissions.map((p) => normalize(p)).filter(Boolean)
    : [];

  return perms.includes(required);
};

const getFallbackPath = (user) => {
  const role = normalize(user?.role);
  if (role === 'admin') return '/';

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

  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: me,
    retry: false,
  });

  const allowed = isAllowed(data, permission);
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
