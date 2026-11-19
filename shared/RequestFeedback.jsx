import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './interaction-feedback.css';

export default function RequestFeedback({ client }) {
  const [pending, setPending] = useState({ total: 0, writing: false });
  useEffect(() => {
    const requests = new Set();
    const refresh = () => setPending({ total: requests.size, writing: [...requests].some(config => !['get', 'head', 'options'].includes(config.method)) });
    const request = client.interceptors.request.use(config => {
      requests.add(config); refresh(); return config;
    });
    const finish = config => { requests.delete(config); refresh(); };
    const response = client.interceptors.response.use(result => {
      finish(result.config); return result;
    }, error => { finish(error.config); return Promise.reject(error); });
    return () => { client.interceptors.request.eject(request); client.interceptors.response.eject(response); };
  }, [client]);
  return pending.total > 0 ? createPortal(<div className="request-feedback" role="status" aria-live="polite"><span aria-hidden="true" />{pending.writing ? 'Processing your request…' : 'Loading latest data…'}</div>, document.querySelector('dialog[open]') || document.body) : null;
}
