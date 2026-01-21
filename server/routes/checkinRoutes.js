import express from "express";
import User from "../models/User.js";
import CheckInLog from "../models/CheckInLog.js";
import UserStatus from "../models/UserStatus.js";
import { requireAuth } from "../middleware/requireAuth.js";

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
 * /api/checkin:
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
router.post("/checkin", async (req, res) => {
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
 * /api/active:
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
router.get("/active", requireAuth, async (req, res) => {
  const active = await UserStatus.find({ currentStatus: "IN" })
    .sort({ userName: 1 })
    .lean();

  return res.json({ total: active.length, data: active });
});

/**
 * @openapi
 * /api/history:
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
router.get("/history", requireAuth, async (req, res) => {
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
      .sort({ timestamp: -1 })
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

export default router;
