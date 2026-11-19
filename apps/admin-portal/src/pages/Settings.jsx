import { BookOpen, Globe2, LockKeyhole, Server, ShieldCheck } from 'lucide-react';
import { createElement } from 'react';
import api from '../api/axios';

function Detail({ icon, label, value }) {
  return <div className="flex items-center gap-3 border-t border-[#e6e7ec] px-5 py-4">
    <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#eef2ff] text-[#315bfa]">{createElement(icon, { size: 16 })}</span>
    <div className="min-w-0"><dt className="op-caption">{label}</dt><dd className="break-all text-sm font-medium">{value}</dd></div>
  </div>;
}

export default function Settings() {
  const apiUrl = new URL(api.defaults.baseURL || '/', window.location.origin);
  return <section className="op-page">
    <header className="op-header">
      <div><h1>Settings</h1><p>Read-only configuration for this deployment.</p></div>
      <a className="op-secondary" href={new URL('/docs', apiUrl).href} target="_blank" rel="noreferrer"><BookOpen size={15} /> API reference</a>
    </header>
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <section className="op-card">
        <header className="op-card-head"><h2>Connection</h2></header>
        <dl>
          <Detail icon={Server} label="API base URL" value={apiUrl.href} />
          <Detail icon={Globe2} label="Portal origin" value={window.location.origin} />
        </dl>
        <p className="op-footer">To change the API address, update VITE_API_URL and rebuild the portal.</p>
      </section>
      <section className="op-card">
        <header className="op-card-head"><h2>Browser session</h2></header>
        <dl>
          <Detail icon={Globe2} label="Page protocol" value={window.location.protocol.slice(0, -1).toUpperCase()} />
          <Detail icon={LockKeyhole} label="Secure browser context" value={window.isSecureContext ? 'Yes' : 'No'} />
          <Detail icon={ShieldCheck} label="Authenticated API requests" value={api.defaults.withCredentials ? 'Include credentials' : 'Omit credentials'} />
        </dl>
      </section>
    </div>
  </section>;
}
