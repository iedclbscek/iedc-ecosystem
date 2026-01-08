import axios from "axios";

const normalizeBaseUrl = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return text;

  // Avoid mixed-content: if the page is https, never call an http API.
  if (typeof window !== "undefined" && window.location?.protocol === "https:") {
    if (text.startsWith("http://"))
      return `https://${text.slice("http://".length)}`;
  }

  return text;
};

const api = axios.create({
  baseURL: normalizeBaseUrl(
    import.meta.env.VITE_API_URL || "http://localhost:5000/api"
  ),
  withCredentials: true, // Required to send JWT cookies across subdomains
});

export default api;
