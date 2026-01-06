import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import crypto from "crypto";

const COOKIE_NAME = "token";

const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    domain: isProd ? process.env.COOKIE_DOMAIN : undefined,
    path: "/",
  };
};

export const login = async (req, res) => {
  const { membershipId, password } = req.body;

  if (!membershipId || !password) {
    return res
      .status(400)
      .json({ message: "membershipId and password are required" });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "JWT_SECRET is not configured" });
  }

  try {
    const normalizedMembershipId = String(membershipId).trim().toLowerCase();
    const user = await User.findOne({ membershipId: normalizedMembershipId });
    if (!user)
      return res.status(401).json({ message: "Invalid Membership ID" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        permissions: Array.isArray(user.permissions) ? user.permissions : [],
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res
      .cookie(COOKIE_NAME, token, {
        ...getCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        id: user._id,
        name: user.name,
        email: user.email,
        membershipId: user.membershipId,
        role: user.role,
        permissions: user.permissions,
      });
  } catch (error) {
    res.status(500).json({ message: "Login Error", error: error.message });
  }
};

export const logout = async (req, res) => {
  res.clearCookie(COOKIE_NAME, getCookieOptions());
  res.json({ message: "Logged out" });
};

export const me = async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET is not configured" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("-password");
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      membershipId: user.membershipId,
      role: user.role,
      permissions: user.permissions,
    });
  } catch (error) {
    res.status(401).json({ message: "Not authenticated" });
  }
};

export const setPassword = async (req, res) => {
  const { userId, token, password } = req.body;

  if (!userId || !token || !password) {
    return res
      .status(400)
      .json({ message: "userId, token and password are required" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.passwordSetupTokenHash || !user.passwordSetupExpiresAt) {
      return res
        .status(400)
        .json({ message: "Password setup link is invalid" });
    }

    if (user.passwordSetupExpiresAt.getTime() < Date.now()) {
      return res
        .status(400)
        .json({ message: "Password setup link has expired" });
    }

    const incomingHash = crypto
      .createHash("sha256")
      .update(String(token))
      .digest("hex");
    if (incomingHash !== user.passwordSetupTokenHash) {
      return res
        .status(400)
        .json({ message: "Password setup link is invalid" });
    }

    const hashed = await bcrypt.hash(String(password), 10);
    user.password = hashed;
    user.passwordSetupTokenHash = undefined;
    user.passwordSetupExpiresAt = undefined;
    await user.save();

    res.json({ message: "Password set successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to set password", error: error.message });
  }
};
