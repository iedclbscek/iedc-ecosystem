import { useState } from 'react';
import { Save, RefreshCw, Globe, ShieldAlert, Database } from 'lucide-react';

export default function Settings() {
  // Mocking the data structure from your SystemSettings collection
  const [endpoints, setEndpoints] = useState([
    { id: '1', key: 'CORE_BACKEND_URL', value: 'https://api.iedclbscek.in', description: 'Main API entry point' },
    { id: '2', key: 'REGISTRATION_ENDPOINT', value: '/api/v1/registrations', description: 'Path for student signups' },
    { id: '3', key: 'MAILER_SERVICE', value: 'https://mail.iedclbscek.in/send', description: 'Internal relay for custom emails' },
  ]);

  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = (id, newValue) => {
    setEndpoints(prev => prev.map(ep => ep.id === id ? { ...ep, value: newValue } : ep));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    // Here you would call: await api.post('/admin/settings/update', { endpoints });
    setTimeout(() => setIsSaving(false), 1000); // Simulate network delay
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
          <p className="text-slate-500 text-sm">Configure global API endpoints and environment variables.</p>
        </div>
        <button 
          onClick={saveSettings}
          disabled={isSaving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: API Registry */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2 text-slate-700">
              <Database size={20} className="text-blue-500" />
              <h2 className="font-bold">API Endpoint Registry</h2>
            </div>
            <div className="p-0">
              {endpoints.map((ep) => (
                <div key={ep.id} className="p-6 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <div className="flex justify-between mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ep.key}</label>
                    <span className="text-[10px] text-slate-400">{ep.description}</span>
                  </div>
                  <input 
                    type="text" 
                    value={ep.value}
                    onChange={(e) => handleUpdate(ep.id, e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Security & Info */}
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 text-amber-700 mb-3">
              <ShieldAlert size={20} />
              <h3 className="font-bold text-sm text-amber-900">Critical Warning</h3>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Modifying these endpoints directly affects communication between <b>admin</b>, <b>portal</b>, and the <b>main site</b>. 
              Incorrect URLs will result in 404 errors across the entire ecosystem.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-sm mb-4">Domain Info</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Globe size={16} className="text-slate-400" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Primary Host</p>
                  <p className="text-sm font-medium">iedclbscek.in</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-emerald-100 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">SSL Status</p>
                  <p className="text-sm font-medium">Active (Let's Encrypt)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}