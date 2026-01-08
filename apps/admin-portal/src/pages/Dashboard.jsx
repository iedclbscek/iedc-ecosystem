import { Users, UserCheck, Calendar, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function Dashboard() {
  // These stats would eventually come from your registrations and execomCall collections
  const stats = [
    { label: 'Total Registrations', value: '451', icon: <Users />, color: 'bg-blue-500', trend: '+12%', isUp: true },
    { label: 'Execom Applications', value: '152', icon: <UserCheck />, color: 'bg-pink-600', trend: '+5%', isUp: true },
    { label: 'Active Events', value: '0', icon: <Calendar />, color: 'bg-orange-500', trend: '0%', isUp: false },
    { label: 'Conversion Rate', value: '33.7%', icon: <TrendingUp />, color: 'bg-emerald-500', trend: '-2%', isUp: false },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Overview</h1>
        <p className="text-slate-500 text-sm">Welcome back, here is what's happening with IEDC LBSCEK.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-xl text-white ${stat.color} shadow-lg shadow-current/20`}>
                {stat.icon}
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${stat.isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                {stat.trend}
                {stat.isUp ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-slate-500 text-sm font-medium">{stat.label}</h3>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity (From Registrations Collection) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-bold">Recent Registrations</h2>
            <button className="text-sm text-blue-600 font-semibold hover:underline">View All</button>
          </div>
          <div className="divide-y divide-slate-50">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">
                    U
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">New Student Signup</p>
                    <p className="text-xs text-slate-500">Computer Science • 5th Sem</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-medium">2 hours ago</p>
              </div>
            ))}
          </div>
        </div>

        {/* System Health / API Stats */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold mb-6">Service Health</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Database (MongoDB)</span>
                <span className="text-emerald-600 font-bold">Connected</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[98%]"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Mail Service (SMTP)</span>
                <span className="text-emerald-600 font-bold">Active</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[100%]"></div>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Storage Used</p>
              <p className="text-lg font-bold text-slate-700">456.24 kB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}