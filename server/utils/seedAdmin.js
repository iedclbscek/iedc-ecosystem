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

  const adminPayload = {
    name: "Super Admin",
    email: process.env.ADMIN_EMAIL || "iedc@lbscek.ac.in",
    membershipId,
    role: "Admin",
    permissions: ["dashboard", "registrations", "users", "settings"],
  };

  if (!existing) {
    const hash = await bcrypt.hash(password, 10);
    await User.create({ ...adminPayload, password: hash });
    return { seeded: true, action: "created" };
  }

  const passwordMatches = await bcrypt.compare(password, existing.password);
  const permissionsMatch =
    JSON.stringify(existing.permissions || []) ===
    JSON.stringify(adminPayload.permissions);
  const profileMatches =
    existing.name === adminPayload.name &&
    existing.email === adminPayload.email &&
    existing.role === adminPayload.role &&
    permissionsMatch;

  if (passwordMatches && profileMatches) {
    return { seeded: false, action: "unchanged" };
  }

  existing.name = adminPayload.name;
  existing.email = adminPayload.email;
  existing.role = adminPayload.role;
  existing.permissions = adminPayload.permissions;
  if (!passwordMatches) existing.password = await bcrypt.hash(password, 10);
  await existing.save();

  return { seeded: true, action: "updated" };
};
