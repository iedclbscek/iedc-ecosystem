const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const renderTemplate = (html, data) => {
  let rendered = String(html ?? "");
  const vars = data && typeof data === "object" ? data : {};

  for (const [k, v] of Object.entries(vars)) {
    const key = escapeRegExp(k);
    const re = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    rendered = rendered.replace(re, String(v ?? ""));
  }

  return rendered;
};
