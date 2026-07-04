const normalize = (value) =>
  String(value ?? "")
    .trim()
    .replace(/^\"|\"$/g, "");

export const isLikelyCloudinaryUrl = (rawUrl) => {
  const url = normalize(rawUrl);
  if (!url) return false;
  if (!/^https?:\/\//i.test(url)) return false;

  try {
    const parsed = new URL(url);
    return /res\.cloudinary\.com$/i.test(parsed.hostname);
  } catch {
    return false;
  }
};

export const extractCloudinaryPublicIdFromUrl = (rawUrl, expectedCloudName = "") => {
  const url = normalize(rawUrl);
  if (!url) return "";
  if (!isLikelyCloudinaryUrl(url)) return "";

  try {
    const parsed = new URL(url);
    const path = parsed.pathname || "";
    const segments = path.split("/").filter(Boolean);
    if (segments.length < 3) return "";

    // URL shape: /<cloudName>/image/upload/.../[v####]/<publicId>.<ext>
    const cloudNameSegment = segments[0];
    if (expectedCloudName && cloudNameSegment !== expectedCloudName) return "";
    if (segments[1] !== "image" || segments[2] !== "upload") return "";

    const restSegments = segments.slice(3);
    if (restSegments.length < 2) return "";

    const versionIndex = restSegments.findIndex((segment) => /^v\d+$/i.test(segment));
    if (versionIndex < 0 || versionIndex + 1 >= restSegments.length) return "";

    const publicIdParts = restSegments
      .slice(versionIndex + 1)
      .join("/")
      .trim();
    if (!publicIdParts) return "";

    return publicIdParts.replace(/\.[^/.?#]+$/, "");
  } catch {
    return "";
  }
};
