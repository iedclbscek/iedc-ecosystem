import jwt from "jsonwebtoken";
import User from "../models/User.js";

const COOKIE_NAME = "token";

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      // Debug logging in development
      if (process.env.NODE_ENV !== "production") {
        console.log("[requireAuth] No token found in cookies:", req.cookies);
        console.log("[requireAuth] Request origin:", req.headers.origin);
        console.log("[requireAuth] Request host:", req.headers.host);
      }
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET is not configured" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("-password");
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    if (user.portalAccessEnabled === false) {
      return res
        .status(403)
        .json({ message: "Access to the admin portal is disabled" });
    }

    req.user = {
      id: user._id,
      role: user.role,
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      membershipId: user.membershipId,
      name: user.name,
      email: user.email,
    };

    next();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[requireAuth] Error:", error.message);
    }
    return res.status(401).json({ message: "Not authenticated" });
  }
};

const normalize = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

export const isAdmin = (user) => normalize(user?.role) === "admin";

export const hasPermission = (user, permission) => {
  if (isAdmin(user)) return true;
  const required = normalize(permission);
  if (!required) return true;
  const perms = Array.isArray(user?.permissions)
    ? user.permissions.map((p) => normalize(p)).filter(Boolean)
    : [];
  return perms.includes(required);
};
