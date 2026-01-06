import bcrypt from "bcryptjs";
import User from "../models/User.js";

export const seedAdminUser = async () => {
  const membershipId = String(process.env.ADMIN_MEMBERSHIP_ID || "admin")
    .trim()
    .toLowerCase();

  const password = String(process.env.ADMIN_PASSWORD || "");

  // If you didn't configure an admin password, don't try to seed.
  if (!password) {
    return { seeded: false, reason: "ADMIN_PASSWORD not configured" };
  }

  const existing = await User.findOne({ membershipId });

  const hash = await bcrypt.hash(password, 10);

  const adminPayload = {
    name: "Super Admin",
    email: process.env.ADMIN_EMAIL || "iedc@lbscek.ac.in",
    membershipId,
    password: hash,
    role: "Admin",
    permissions: ["dashboard", "registrations", "users", "settings"],
  };

  if (!existing) {
    await User.create(adminPayload);
    return { seeded: true, action: "created" };
  }

  // Ensure membershipId 'admin' always has the expected admin role/permissions,
  // and rotate password to ADMIN_PASSWORD when provided.
  existing.name = adminPayload.name;
  existing.email = adminPayload.email;
  existing.role = adminPayload.role;
  existing.permissions = adminPayload.permissions;
  existing.password = adminPayload.password;
  await existing.save();

  return { seeded: true, action: "updated" };
};
