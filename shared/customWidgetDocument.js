export function safeWidgetUrl(value, { image = false } = {}) {
  if (typeof value !== 'string' || /[\u0000-\u0020\\]/.test(value)) return '';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return (['https:', 'http:', ...(image ? [] : ['mailto:', 'tel:'])].includes(url.protocol) && !url.username && !url.password) ? value : '';
  } catch { return ''; }
}
export function embedWidgetUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const id = host === 'youtu.be' ? url.pathname.slice(1) : ['youtube.com','www.youtube.com'].includes(host) ? url.searchParams.get('v') || url.pathname.split('/embed/')[1] : '';
    if (/^[\w-]{11}$/.test(id || '')) return `https://www.youtube-nocookie.com/embed/${id}`;
    if (['vimeo.com','www.vimeo.com'].includes(host) && /^\/\d+$/.test(url.pathname)) return `https://player.vimeo.com/video/${url.pathname.slice(1)}`;
  } catch { /* Invalid embeds render an explanation. */ }
  return '';
}
const stringData = value => JSON.stringify(String(value || '')).replace(/</g, '\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
export function buildCustomWidgetDocument({ html = '', css = '', javascript = '' } = {}) {
  const policy = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https://res.cloudinary.com https://api.dicebear.com data:; font-src 'none'; connect-src 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy.replace(/'/g,'&#39;')}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font:16px system-ui;color:#202329;overflow-wrap:anywhere}*{box-sizing:border-box}img{max-width:100%}</style></head><body><div id="widget-root"></div><script>document.getElementById('widget-root').innerHTML=${stringData(html)};const style=document.createElement('style');style.textContent=${stringData(css)};document.head.appendChild(style);const code=document.createElement('script');code.textContent=${stringData(javascript)};document.body.appendChild(code);</script></body></html>`;
}
