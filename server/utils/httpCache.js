export const setPublicCache = (
  res,
  { browserSeconds = 30, sharedSeconds = 120, staleSeconds = 300 } = {},
) => {
  res.set(
    "Cache-Control",
    `public, max-age=${browserSeconds}, s-maxage=${sharedSeconds}, stale-while-revalidate=${staleSeconds}`,
  );
  res.set("Vary", "Origin");
};

export const setPublicRevalidation = (res) => {
  // Browsers can reuse a stored admin-origin CORS response on the public site.
  res.set("Cache-Control", "no-store");
  res.set("CDN-Cache-Control", "no-store");
  res.set("Vercel-CDN-Cache-Control", "no-store");
  res.set("Vary", "Origin");
};
