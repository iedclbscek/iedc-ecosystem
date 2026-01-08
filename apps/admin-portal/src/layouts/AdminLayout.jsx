import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarDays,
  Users, 
  Mail, 
  Settings, 
  LogOut, 
  Bell,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { logout as logoutApi, me as meApi } from '../api/authService';
import { fetchClubs } from '../api/adminService';
import { useViewMode } from '../context/ViewModeContext';

const normalize = (v) => String(v ?? '').trim().toLowerCase();

const CLUB_VIEW_PAGES = new Set(['dashboard', 'events', 'users']);

const isAllowed = (user, permission) => {
  const role = normalize(user?.role);
  if (role === 'admin') return true;

  const required = normalize(permission);
  if (CLUB_VIEW_PAGES.has(required) && user?.isClubLead) return true;

  const perms = Array.isArray(user?.permissions)
    ? user.permissions.map((p) => normalize(p)).filter(Boolean)
    : [];
  return perms.includes(required);
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const { mode, clubId, setIedcMode, setClubMode } = useViewMode();

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: meApi,
    retry: false,
  });

  const { data: clubsData } = useQuery({
    queryKey: ['clubs'],
    queryFn: fetchClubs,
    enabled: Boolean(meData?.id),
    retry: false,
  });
  const myClubs = useMemo(() => {
    const myId = String(meData?.id ?? '');
    if (!myId) return [];
    const clubs = Array.isArray(clubsData?.clubs) ? clubsData.clubs : [];
    return clubs.filter((c) => {
      const managers = Array.isArray(c?.managerUsers) ? c.managerUsers : [];
      const editors = Array.isArray(c?.editorUsers) ? c.editorUsers : [];
      const members = Array.isArray(c?.memberUsers) ? c.memberUsers : [];
      return (
        managers.some((u) => String(u?._id) === myId) ||
        editors.some((u) => String(u?._id) === myId) ||
        members.some((u) => String(u?._id) === myId)
      );
    });
  }, [clubsData, meData?.id]);

  const activeClubName = useMemo(() => {
    if (mode !== 'club' || !clubId) return '';
    const c = myClubs.find((x) => String(x?._id) === String(clubId));
    return String(c?.name ?? '').trim();
  }, [clubId, mode, myClubs]);

  const isAdmin = normalize(meData?.role) === 'admin';

  const canUseIedcMode = useMemo(() => {
    if (isAdmin) return true;
    const perms = Array.isArray(meData?.permissions)
      ? meData.permissions.map((p) => normalize(p)).filter(Boolean)
      : [];
    // If the user has any permission outside the club-only pages,
    // allow them to switch back to IEDC mode.
    return perms.some((p) => !CLUB_VIEW_PAGES.has(p));
  }, [isAdmin, meData]);

  useEffect(() => {
    if (!meData?.id) return;
    if (canUseIedcMode) return;
    if (myClubs.length === 0) return;

    // Club-only users should always operate in club view.
    if (mode === 'iedc') {
      setClubMode(String(myClubs[0]?._id));
    } else if (mode === 'club' && !clubId) {
      setClubMode(String(myClubs[0]?._id));
    }
  }, [canUseIedcMode, clubId, meData?.id, mode, myClubs, setClubMode]);

  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: ['me'] });
      queryClient.removeQueries({ queryKey: ['me'] });
      toast.success('Logged out');
      navigate('/login', { replace: true });
    },
    onError: () => {
      toast.error('Logout failed');
    },
  });

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', permission: 'dashboard' },
    { name: 'Members', icon: <Users size={20} />, path: '/registrations', permission: 'registrations' },
    { name: 'Events', icon: <CalendarDays size={20} />, path: '/events', permission: 'events' },
    { name: 'Team Members', icon: <ShieldCheck size={20} />, path: '/users', permission: 'users' },
    { name: 'Email Center', icon: <Mail size={20} />, path: '/mailer', permission: 'mailer' },
    { name: 'API Settings', icon: <Settings size={20} />, path: '/settings', permission: 'settings' },
  ];

  const visibleMenuItems = meData?.id
    ? menuItems
        .filter((m) => {
          if (isAdmin) return isAllowed(meData, m.permission);
          if (mode === 'club') return CLUB_VIEW_PAGES.has(normalize(m.permission));
          return isAllowed(meData, m.permission);
        })
    : menuItems;

  const displayName = String(meData?.name || meData?.membershipId || '').trim() || 'Account';
  const roleLabel = String(meData?.role || '').trim() || 'Member';
  const initials = getInitials(meData?.name || meData?.membershipId);

  const viewLabel = mode === 'club' && activeClubName ? `Viewing: ${activeClubName}` : 'Viewing: IEDC';

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300`}>
        <div className={`p-6 border-b border-slate-100 flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">I</div>
          {sidebarOpen && <h1 className="text-xl font-bold tracking-tight">IEDC Admin</h1>}
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarOpen && <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Main Menu</p>}
          {visibleMenuItems.map((item) => (
            <NavLink 
              key={item.name} 
              to={item.path} 
              className={({ isActive }) => `
                flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-3 rounded-xl transition-all duration-200
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
              `}
              title={!sidebarOpen ? item.name : undefined}
            >
              {item.icon}
              {sidebarOpen && <span className="font-medium text-sm">{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 space-y-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-3 w-full text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors`}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <X size={20}/> : <Menu size={20}/>}
            {sidebarOpen && <span className="font-medium text-sm">Collapse</span>}
          </button>
          <button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className={`flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-3 w-full text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50`}
            title={!sidebarOpen ? "Logout" : undefined}
          >
            <LogOut size={20}/>
            {sidebarOpen && <span className="font-medium text-sm">Logout</span>}
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
            <div
              ref={profileRef}
              className="relative"
              onBlur={(e) => {
                if (!profileRef.current) return;
                if (profileRef.current.contains(e.relatedTarget)) return;
                setProfileOpen(false);
              }}
            >
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-3 cursor-pointer rounded-xl hover:bg-slate-50 px-2 py-1"
              >
              <div className="text-right">
                <p className="text-xs font-bold leading-none">{displayName}</p>
                <p className="text-[10px] text-slate-400 font-medium">{roleLabel}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-linear-to-tr from-blue-600 to-indigo-500 border-2 border-white shadow-sm flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              </button>

              {profileOpen ? (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">View mode</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{viewLabel}</div>
                  </div>

                  <div className="p-2">
                    {canUseIedcMode ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIedcMode();
                          setProfileOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          mode === 'iedc'
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        IEDC
                      </button>
                    ) : null}

                    {myClubs.length > 0 ? (
                      <div className="mt-2">
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Clubs
                        </div>
                        {myClubs.map((c) => {
                          const cid = String(c?._id);
                          const active = mode === 'club' && String(clubId) === cid;
                          return (
                            <button
                              key={cid}
                              type="button"
                              onClick={() => {
                                setClubMode(cid);
                                setProfileOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                                active
                                  ? 'bg-blue-600 text-white'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              {c?.name || 'Club'}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
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