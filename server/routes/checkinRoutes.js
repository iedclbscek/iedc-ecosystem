import express from "express";
import User from "../models/User.js";
import CheckInLog from "../models/CheckInLog.js";
import UserStatus from "../models/UserStatus.js";
import BannedMembershipId from "../models/BannedMembershipId.js";
import {
  requireAuth,
  requirePermission,
} from "../middleware/requireAuth.js";

const router = express.Router();

const CHECKIN_COOLDOWN_SECONDS = Number.parseInt(
  process.env.CHECKIN_COOLDOWN_SECONDS ?? "3",
  10,
);

const CHECKIN_COOLDOWN_MS =
  Number.isFinite(CHECKIN_COOLDOWN_SECONDS) && CHECKIN_COOLDOWN_SECONDS > 0
    ? CHECKIN_COOLDOWN_SECONDS * 1000
    : 0;

const normalizeMembershipId = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const parsePositiveInt = (value, fallback) => {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (Number.isFinite(n) && n > 0) return n;
  return fallback;
};

/**
 * @openapi
 * tags:
 *   - name: Check-In
 *     description: Check-in system endpoints (IN/OUT, live status, history)
 */

/**
 * @openapi
 * /api/makerspace/checkin:
 *   post:
 *     tags:
 *       - Check-In
 *     summary: Check a member IN/OUT
 *     description: Lookup user by membershipId, write history log, and upsert live status.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               membershipId:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [IN, OUT]
 *             required:
 *               - membershipId
 *               - action
 *     responses:
 *       201:
 *         description: Check-in recorded
 *       400:
 *         description: Invalid input
 *       404:
 *         description: User not found
 *       409:
 *         description: Invalid state transition (already IN / not IN yet)
 *       429:
 *         description: Scan too frequent (cooldown)
 */
router.post("/makerspace/checkin", async (req, res) => {
  const membershipId = normalizeMembershipId(req.body?.membershipId);
  const action = String(req.body?.action ?? "")
    .trim()
    .toUpperCase();

  if (!membershipId) {
    return res.status(400).json({ message: "membershipId is required" });
  }

  if (action !== "IN" && action !== "OUT") {
    return res.status(400).json({ message: "action must be one of: IN, OUT" });
  }

  // Check if banned
  const isBanned = await BannedMembershipId.findOne({ membershipId }).lean();
  if (isBanned && action === "IN") {
    return res
      .status(403)
      .json({ message: "This membership ID is banned from makerspace" });
  }

  const user = await User.findOne({ membershipId }).select("name membershipId");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const existingStatus = await UserStatus.findOne({
    membershipId: user.membershipId,
  })
    .select("currentStatus")
    .lean();

  if (action === "IN" && existingStatus?.currentStatus === "IN") {
    return res.status(409).json({
      message: "User is already checked in",
      membershipId: user.membershipId,
      currentStatus: "IN",
    });
  }

  if (action === "OUT" && existingStatus?.currentStatus !== "IN") {
    return res.status(409).json({
      message: "User is not currently checked in",
      membershipId: user.membershipId,
      currentStatus: existingStatus?.currentStatus ?? "OUT",
    });
  }

  if (CHECKIN_COOLDOWN_MS > 0) {
    const last = await CheckInLog.findOne({ membershipId: user.membershipId })
      .select("timestamp")
      .sort({ timestamp: -1 })
      .lean();

    const lastTs = last?.timestamp ? new Date(last.timestamp).getTime() : null;
    const nowTs = Date.now();

    if (lastTs && nowTs - lastTs < CHECKIN_COOLDOWN_MS) {
      const retryAfterMs = CHECKIN_COOLDOWN_MS - (nowTs - lastTs);
      const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
      res.set("Retry-After", String(retryAfterSeconds));

      return res.status(429).json({
        message: "Scan too frequent. Please try again shortly.",
        membershipId: user.membershipId,
        retryAfterSeconds,
      });
    }
  }

  const now = new Date();

  const logEntry = await CheckInLog.create({
    membershipId: user.membershipId,
    userName: user.name,
    action,
    timestamp: now,
  });

  const status = await UserStatus.findOneAndUpdate(
    { membershipId: user.membershipId },
    {
      $set: {
        userName: user.name,
        currentStatus: action,
        lastUpdated: now,
      },
      $setOnInsert: {
        membershipId: user.membershipId,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return res.status(201).json({
    message: "Recorded",
    membershipId: user.membershipId,
    userName: user.name,
    action,
    timestamp: logEntry.timestamp,
    currentStatus: status.currentStatus,
    lastUpdated: status.lastUpdated,
  });
});

/**
 * @openapi
 * /api/makerspace/active:
 *   get:
 *     tags:
 *       - Check-In
 *     summary: List currently active (IN) members
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active users
 *       401:
 *         description: Not authenticated
 */
router.get("/makerspace/active", requireAuth, requirePermission("makerspace"), async (req, res) => {
  const active = await UserStatus.find({ currentStatus: "IN" })
    .sort({ userName: 1 })
    .lean();

  return res.json({ total: active.length, data: active });
});

/**
 * @openapi
 * /api/makerspace/history:
 *   get:
 *     tags:
 *       - Check-In
 *     summary: Paginated check-in history
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: membershipId
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [IN, OUT]
 *     responses:
 *       200:
 *         description: History page
 *       401:
 *         description: Not authenticated
 */
router.get("/makerspace/history", requireAuth, requirePermission("makerspace"), async (req, res) => {
  const page = parsePositiveInt(req.query?.page, 1);
  const limit = Math.min(parsePositiveInt(req.query?.limit, 20), 100);

  const membershipId = normalizeMembershipId(req.query?.membershipId);
  const action = String(req.query?.action ?? "")
    .trim()
    .toUpperCase();

  const filter = {};
  if (membershipId) filter.membershipId = membershipId;
  if (action === "IN" || action === "OUT") filter.action = action;

  const skip = (page - 1) * limit;

  const [total, data] = await Promise.all([
    CheckInLog.countDocuments(filter),
    CheckInLog.find(filter)
      .sort({ timestamp: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return res.json({
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    data,
  });
});

/**
 * @openapi
 * /api/makerspace/checkout:
 *   post:
 *     tags:
 *       - Check-In
 *     summary: Force checkout a member
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               membershipId:
 *                 type: string
 *             required:
 *               - membershipId
 *     responses:
 *       200:
 *         description: Member checked out
 *       400:
 *         description: Invalid input
 *       404:
 *         description: User not found
 *       409:
 *         description: User not checked in
 */
router.post("/makerspace/checkout", requireAuth, requirePermission("makerspace"), async (req, res) => {
  const membershipId = normalizeMembershipId(req.body?.membershipId);

  if (!membershipId) {
    return res.status(400).json({ message: "membershipId is required" });
  }

  const user = await User.findOne({ membershipId }).select("name membershipId");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const existingStatus = await UserStatus.findOne({
    membershipId: user.membershipId,
  })
    .select("currentStatus")
    .lean();

  if (existingStatus?.currentStatus !== "IN") {
    return res.status(409).json({
      message: "User is not currently checked in",
      membershipId: user.membershipId,
      currentStatus: existingStatus?.currentStatus ?? "OUT",
    });
  }

  const now = new Date();

  await CheckInLog.create({
    membershipId: user.membershipId,
    userName: user.name,
    action: "OUT",
    timestamp: now,
  });

  const status = await UserStatus.findOneAndUpdate(
    { membershipId: user.membershipId },
    {
      $set: {
        currentStatus: "OUT",
        lastUpdated: now,
      },
    },
    { new: true },
  ).lean();

  return res.json({
    message: "Checked out",
    membershipId: user.membershipId,
    userName: user.name,
    currentStatus: status.currentStatus,
    lastUpdated: status.lastUpdated,
  });
});

async function banAndCheckOut(fields, session) {
  const [ban] = await BannedMembershipId.create([fields], { session });
  let member;
  try {
    member = await UserStatus.findOneAndUpdate(
      { membershipId: fields.membershipId, currentStatus: "IN" },
      { $set: { currentStatus: "OUT", lastUpdated: ban.bannedAt } },
      { session, new: false },
    ).lean();
    if (member) {
      await CheckInLog.create([{
        _id: ban._id,
        membershipId: member.membershipId,
        userName: member.userName,
        action: "OUT",
        timestamp: ban.bannedAt,
      }], { session });
    }
  } catch (error) {
    if (!session) {
      // A standalone MongoDB has no multi-document transactions.
      // If a log write succeeded but its acknowledgement was lost, the work is complete.
      if (member && await CheckInLog.exists({ _id: ban._id })) return;
      if (member) {
        await UserStatus.updateOne(
          { _id: member._id, currentStatus: "OUT", lastUpdated: ban.bannedAt },
          { $set: { currentStatus: "IN", lastUpdated: member.lastUpdated, updatedAt: member.updatedAt } },
          { timestamps: false },
        );
      }
      await BannedMembershipId.deleteOne({ _id: ban._id });
    }
    throw error;
  }
}

/**
 * @openapi
 * /api/makerspace/ban:
 *   post:
 *     tags:
 *       - Check-In
 *     summary: Ban a membership ID from makerspace
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               membershipId:
 *                 type: string
 *               reason:
 *                 type: string
 *             required:
 *               - membershipId
 *     responses:
 *       201:
 *         description: Membership ID banned
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Already banned
 */
router.post("/makerspace/ban", requireAuth, requirePermission("makerspace"), async (req, res) => {
  const membershipId = normalizeMembershipId(req.body?.membershipId);
  const reason = String(req.body?.reason ?? "").trim();

  if (!membershipId) {
    return res.status(400).json({ message: "membershipId is required" });
  }

  const fields = { membershipId, reason, bannedBy: req.user?.membershipId || "unknown" };
  try {
    try {
      await BannedMembershipId.db.transaction(session => banAndCheckOut(fields, session));
    } catch (error) {
      if (error.code !== 20 || !/replica set member or mongos/i.test(error.message)) throw error;
      await banAndCheckOut(fields, null);
    }
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.membershipId) {
      return res.status(409).json({ message: "Membership ID is already banned" });
    }
    console.error("Could not block makerspace access", error);
    return res.status(500).json({ message: "Could not block makerspace access" });
  }

  return res.status(201).json({
    message: "Banned",
    membershipId,
  });
});

/**
 * @openapi
 * /api/makerspace/unban:
 *   post:
 *     tags:
 *       - Check-In
 *     summary: Unban a membership ID from makerspace
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               membershipId:
 *                 type: string
 *             required:
 *               - membershipId
 *     responses:
 *       200:
 *         description: Membership ID unbanned
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Not banned
 */
router.post("/makerspace/unban", requireAuth, requirePermission("makerspace"), async (req, res) => {
  const membershipId = normalizeMembershipId(req.body?.membershipId);

  if (!membershipId) {
    return res.status(400).json({ message: "membershipId is required" });
  }

  const result = await BannedMembershipId.deleteOne({ membershipId });

  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "Membership ID is not banned" });
  }

  return res.json({
    message: "Unbanned",
    membershipId,
  });
});

export default router;
