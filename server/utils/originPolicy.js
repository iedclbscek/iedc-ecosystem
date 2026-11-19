export function createOriginPolicy(env) {
  const domain = (env.COOKIE_DOMAIN || "iedclbscek.in").trim().replace(/^\./, "");
  const origins = new Set([
    `https://${domain}`, `https://www.${domain}`, `https://admin.${domain}`, `https://api.${domain}`,
    env.ADMIN_PORTAL_URL, ...(env.ALLOWED_ORIGINS || "").split(","),
  ].filter(Boolean).map((origin) => origin.trim().replace(/\/$/, "")));

  return (origin) => !origin || origins.has(origin) || (
    env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
  );
}
