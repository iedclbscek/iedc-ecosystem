import jwt from "jsonwebtoken";
import User from "../models/User.js";
import {
  hasWorkspacePermission,
  isSuperAdmin,
} from "../utils/authorization.js";
import Club from "../models/Club.js";
import { resolveClubAccess } from "../utils/clubAccess.js";

const COOKIE_NAME = "token";

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET is not configured" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("name email membershipId role permissions portalAccessEnabled").lean();
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

export const isAdmin = (user) => isSuperAdmin(user);

export const hasPermission = (user, permission) =>
  hasWorkspacePermission(user, permission);

export const requirePermission = (permission) => (req, res, next) => {
  if (!hasWorkspacePermission(req.user, permission)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return next();
};

export const requirePermissionOrClubManager = (permission) => async (req, res, next) => {
  try {
    if (hasWorkspacePermission(req.user, permission)) return next();
    const clubId = req.params?.clubId || req.query?.clubId || req.body?.clubId;
    if (!clubId) return res.status(403).json({ message: "Forbidden" });
    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club not found" });
    const access = await resolveClubAccess({ club, user: req.user });
    if (!access.managePermissions) return res.status(403).json({ message: "Forbidden" });
    return next();
  } catch (error) {
    return next(error);
  }
};
