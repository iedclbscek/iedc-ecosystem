import axios from "axios";

const loopbackHosts = new Set(["localhost", "127.0.0.1"]);

const normalizeBaseUrl = (value) => {
  const text = String(value ?? "").trim();
  if (!text || typeof window === "undefined") return text;

  // Avoid mixed-content when the portal is served over HTTPS.
  const { protocol, hostname } = window.location;
  const baseUrl = protocol === "https:" ? text.replace(/^http:\/\//, "https://") : text;
  if (!loopbackHosts.has(hostname)) return baseUrl;

  // Session cookies treat localhost and 127.0.0.1 as different sites.
  try {
    const url = new URL(baseUrl);
    if (loopbackHosts.has(url.hostname) && url.hostname !== hostname) {
      url.hostname = hostname;
      return url.href;
    }
  } catch {
    // Relative API paths already use the portal's origin.
  }
  return baseUrl;
};

const api = axios.create({
  baseURL: normalizeBaseUrl(
    import.meta.env.VITE_API_URL || "http://localhost:5000/api"
  ),
  withCredentials: true, // Required to send JWT cookies across subdomains
});

export default api;
