import { Outlet, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Mail, 
  Settings, 
  LogOut, 
  Bell 
} from 'lucide-react';

export default function AdminLayout() {
  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20}/>, path: '/' },
    { name: 'Registrations', icon: <Users size={20}/>, path: '/registrations' },
    { name: 'Email Center', icon: <Mail size={20}/>, path: '/mailer' },
    { name: 'API Settings', icon: <Settings size={20}/>, path: '/settings' },
  ];

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
          {menuItems.map((item) => (
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
          <button className="flex items-center gap-3 px-4 py-3 w-full text-red-500 hover:bg-red-50 rounded-xl transition-colors">
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
                <p className="text-xs font-bold leading-none">Umar Mukhtar</p>
                <p className="text-[10px] text-slate-400 font-medium">Super Admin</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 border-2 border-white shadow-sm flex items-center justify-center text-white text-xs font-bold">
                UA
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