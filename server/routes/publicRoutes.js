import express from "express";
import User from "../models/User.js";
import WebsiteTeamEntry from "../models/WebsiteTeamEntry.js";
import { getMemberById } from "../controllers/publicMemberController.js";
import { sendOTP, verifyOTP } from "../controllers/authController.js";
import {
  verifyMember,
  registerStaffGuest,
} from "../controllers/registrationController.js";
import { createCheckIn } from "../controllers/checkInController.js";

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Public
 */

// Public: website team list
// Intended for main site consumption.
/**
 * @openapi
 * /api/public/team:
 *   get:
 *     tags:
 *       - Public
 *     summary: Public website team list (visible users)
 *     responses:
 *       200:
 *         description: Team list
 */
router.get("/team", async (req, res) => {
  try {
    const users = await User.find({ "websiteProfile.visible": true })
      .select("name membershipId websiteProfile registrationRef")
      .populate("registrationRef", "firstName lastName department semester")
      .sort({ "websiteProfile.order": 1, createdAt: 1 });

    res.json({ team: users });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch team", error: error.message });
  }
});

// Public: year-wise Execom list
// Intended for website team page consumption.
/**
 * @openapi
 * /api/public/execom:
 *   get:
 *     tags:
 *       - Public
 *     summary: Public execom list (year-wise)
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: string }
 *         description: Filter to a specific year
 *     responses:
 *       200:
 *         description: Years + members
 */
router.get("/execom", async (req, res) => {
  try {
    const year = String(req.query.year ?? "").trim();

    const filter = { category: "execom", visible: true };
    if (year) filter.year = year;

    const entries = await WebsiteTeamEntry.find(filter)
      .populate({
        path: "userRef",
        select: "name membershipId registrationRef",
        populate: {
          path: "registrationRef",
          select: "firstName lastName department semester",
        },
      })
      .sort({ year: -1, order: 1, createdAt: 1 });

    const yearsMap = new Map();
    for (const entry of entries) {
      const y = String(entry.year || "").trim();
      if (!y) continue;
      if (!yearsMap.has(y)) yearsMap.set(y, []);

      const u = entry.userRef;
      yearsMap.get(y).push({
        id: entry._id,
        year: y,
        order: entry.order,
        roleTitle: entry.roleTitle || "",
        user: u
          ? {
              id: u._id,
              name: u.name,
              membershipId: u.membershipId,
              registration: u.registrationRef || null,
            }
          : null,
      });
    }

    const years = Array.from(yearsMap.keys()).sort((a, b) =>
      b.localeCompare(a),
    );
    return res.json({
      years: years.map((y) => ({ year: y, members: yearsMap.get(y) })),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch execom", error: error.message });
  }
});

// Public: available Execom years
/**
 * @openapi
 * /api/public/execom/years:
 *   get:
 *     tags:
 *       - Public
 *     summary: List years for which execom entries exist
 *     responses:
 *       200:
 *         description: Years list
 */
router.get("/execom/years", async (req, res) => {
  try {
    const years = await WebsiteTeamEntry.distinct("year", {
      category: "execom",
      visible: true,
    });

    const normalizedYears = years
      .map((y) => String(y ?? "").trim())
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));

    return res.json({ years: normalizedYears });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch execom years", error: error.message });
  }
});

// Public (makerspace): lookup member profile by membershipId
// New canonical endpoint: GET /api/public/makerspace/members/:membershipId
// Compatibility: also accepts ?id=... or ?membershipId=...
/**
 * @openapi
 * /api/public/makerspace/members/{membershipId}:
 *   get:
 *     tags:
 *       - Public
 *     summary: Lookup a member profile by membership ID
 *     parameters:
 *       - in: path
 *         name: membershipId
 *         required: false
 *         schema: { type: string }
 *       - in: query
 *         name: id
 *         schema: { type: string }
 *         description: Legacy alias for membershipId
 *       - in: query
 *         name: membershipId
 *         schema: { type: string }
 *         description: Alternative query alias
 *     responses:
 *       200:
 *         description: Member data
 */
router.get("/makerspace/members/:membershipId?", getMemberById);

// Requested compatibility: /api/public/member?id=IEDC24IT029
/**
 * @openapi
 * /api/public/member:
 *   get:
 *     tags:
 *       - Public
 *     summary: Legacy-compatible member lookup
 *     parameters:
 *       - in: query
 *         name: id
 *         schema: { type: string }
 *       - in: query
 *         name: membershipId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Member data
 */
router.get("/member", getMemberById);

// Makerspace: OTP flow (public)
/**
 * @openapi
 * /api/public/makerspace/send-otp:
 *   post:
 *     tags:
 *       - Public
 *     summary: Send OTP (makerspace/registration flows)
 *     description: |
 *       Provide either `email` or `membershipId`. OTP is never returned.
 *       For student registration, pass `purpose: "registration"` to get a 409 if already registered.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               membershipId: { type: string }
 *               purpose:
 *                 type: string
 *                 example: registration
 *             oneOf:
 *               - required: [email]
 *               - required: [membershipId]
 *     responses:
 *       200:
 *         description: Sent
 *       409:
 *         description: Email already registered (registration purpose)
 */
router.post("/makerspace/send-otp", sendOTP);

/**
 * @openapi
 * /api/public/makerspace/verify-otp:
 *   post:
 *     tags:
 *       - Public
 *     summary: Verify OTP and receive otpToken
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               membershipId: { type: string }
 *               otp: { type: string }
 *             required:
 *               - otp
 *     responses:
 *       200:
 *         description: Verified
 *       400:
 *         description: Invalid/expired
 */
router.post("/makerspace/verify-otp", verifyOTP);

// Aliases (short paths): /api/public/send-otp and /api/public/verify-otp
/**
 * @openapi
 * /api/public/send-otp:
 *   post:
 *     tags:
 *       - Public
 *     summary: Send OTP (alias)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Sent
 */
router.post("/send-otp", sendOTP);

/**
 * @openapi
 * /api/public/verify-otp:
 *   post:
 *     tags:
 *       - Public
 *     summary: Verify OTP (alias)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Verified
 */
router.post("/verify-otp", verifyOTP);

// Makerspace: registration flow (public)
/**
 * @openapi
 * /api/public/makerspace/verify-member:
 *   get:
 *     tags:
 *       - Public
 *     summary: Check whether a membership ID is registered
 *     parameters:
 *       - in: query
 *         name: id
 *         schema: { type: string }
 *         description: Legacy alias for membershipId
 *       - in: query
 *         name: membershipId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Verification result
 */
router.get("/makerspace/verify-member", verifyMember);

/**
 * @openapi
 * /api/public/makerspace/register-staff-guest:
 *   post:
 *     tags:
 *       - Public
 *     summary: Register staff/guest
 *     description: |
 *       Preferred verification: `otpToken` obtained from verify-otp.
 *       Legacy fallback: `otp`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               otpToken: { type: string }
 *               otp: { type: string }
 *               userType:
 *                 type: string
 *                 enum: [staff, guest]
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               department: { type: string }
 *               organization: { type: string }
 *             required:
 *               - email
 *               - userType
 *               - firstName
 *               - lastName
 *     responses:
 *       200:
 *         description: Registered
 *       400:
 *         description: Validation error
 */
router.post("/makerspace/register-staff-guest", registerStaffGuest);

// Aliases (short paths): /api/public/verify-member and /api/public/register-staff-guest
/**
 * @openapi
 * /api/public/verify-member:
 *   get:
 *     tags:
 *       - Public
 *     summary: Verify member (alias)
 *     parameters:
 *       - in: query
 *         name: id
 *         schema: { type: string }
 *       - in: query
 *         name: membershipId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Verification result
 */
router.get("/verify-member", verifyMember);

/**
 * @openapi
 * /api/public/register-staff-guest:
 *   post:
 *     tags:
 *       - Public
 *     summary: Register staff/guest (alias)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Registered
 */
router.post("/register-staff-guest", registerStaffGuest);

// Makerspace: check-in (public)
/**
 * @openapi
 * /api/public/makerspace/check-in:
 *   post:
 *     tags:
 *       - Public
 *     summary: Create a makerspace check-in
 *     parameters:
 *       - in: query
 *         name: id
 *         schema: { type: string }
 *       - in: query
 *         name: membershipId
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               membershipId: { type: string }
 *     responses:
 *       200:
 *         description: Checked in
 */
router.post("/makerspace/check-in", createCheckIn);

// Alias (short path): /api/public/check-in
/**
 * @openapi
 * /api/public/check-in:
 *   post:
 *     tags:
 *       - Public
 *     summary: Create a makerspace check-in (alias)
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Checked in
 */
router.post("/check-in", createCheckIn);

export default router;
