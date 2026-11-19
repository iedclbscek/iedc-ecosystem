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
  res.set("Cache-Control", "public, max-age=0, no-cache, must-revalidate");
  res.set("Vary", "Origin");
};
