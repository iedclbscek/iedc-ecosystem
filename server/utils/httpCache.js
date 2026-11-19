export const setPublicNoStore = (res) => {
  // Responses carry per-origin CORS headers and must not be reused across workspaces.
  res.set("Cache-Control", "no-store");
  res.set("CDN-Cache-Control", "no-store");
  res.set("Vercel-CDN-Cache-Control", "no-store");
  res.set("Vary", "Origin");
};
