import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Mail, 
  Settings, 
  LogOut, 
  Bell,
  ShieldCheck 
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { logout as logoutApi, me as meApi } from '../api/authService';

const normalize = (v) => String(v ?? '').trim().toLowerCase();

const isAllowed = (user, permission) => {
  const role = normalize(user?.role);
  if (role === 'admin') return true;
  const perms = Array.isArray(user?.permissions)
    ? user.permissions.map((p) => normalize(p)).filter(Boolean)
    : [];
  return perms.includes(normalize(permission));
};

const getInitials = (name) => {
  const text = String(name ?? '').trim();
  if (!text) return 'U';
  const parts = text.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const last = (parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1]) || '';
  return (first + last).toUpperCase();
};

export default function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: meApi,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Logged out');
      navigate('/login', { replace: true });
    },
    onError: () => {
      toast.error('Logout failed');
    },
  });

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', permission: 'dashboard' },
    { name: 'Registrations', icon: <Users size={20} />, path: '/registrations', permission: 'registrations' },
    { name: 'Team Members', icon: <ShieldCheck size={20} />, path: '/users', permission: 'users' },
    { name: 'Email Center', icon: <Mail size={20} />, path: '/mailer', permission: 'mailer' },
    { name: 'API Settings', icon: <Settings size={20} />, path: '/settings', permission: 'settings' },
  ];

  const visibleMenuItems = meData?.id
    ? menuItems.filter((m) => isAllowed(meData, m.permission))
    : menuItems;

  const displayName = String(meData?.name || meData?.membershipId || '').trim() || 'Account';
  const roleLabel = String(meData?.role || '').trim() || 'Member';
  const initials = getInitials(meData?.name || meData?.membershipId);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">I</div>
          <h1 className="text-xl font-bold tracking-tight">IEDC Admin</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Main Menu</p>
          {visibleMenuItems.map((item) => (
            <NavLink 
              key={item.name} 
              to={item.path} 
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="flex items-center gap-3 px-4 py-3 w-full text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
          >
            <LogOut size={20}/>
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="text-sm text-slate-500 font-medium italic">
            admin.iedclbscek.in
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative text-slate-400 hover:text-slate-600">
              <Bell size={20}/>
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="text-right">
                <p className="text-xs font-bold leading-none">{displayName}</p>
                <p className="text-[10px] text-slate-400 font-medium">{roleLabel}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-linear-to-tr from-blue-600 to-indigo-500 border-2 border-white shadow-sm flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Rendered Here */}
        <main className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}