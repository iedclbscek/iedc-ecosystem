import express from "express";
import User from "../models/User.js";
import { getMemberById } from "../controllers/publicMemberController.js";
import { sendOTP, verifyOTP } from "../controllers/authController.js";
import {
  verifyMember,
  registerStaffGuest,
} from "../controllers/registrationController.js";
import { createCheckIn } from "../controllers/checkInController.js";

const router = express.Router();

// Public: website team list
// Intended for main site consumption.
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

// Public (makerspace): lookup member profile by membershipId
// New canonical endpoint: GET /api/public/makerspace/members/:membershipId
// Compatibility: also accepts ?id=... or ?membershipId=...
router.get("/makerspace/members/:membershipId?", getMemberById);

// Requested compatibility: /api/public/member?id=IEDC24IT029
router.get("/member", getMemberById);

// Makerspace: OTP flow (public)
router.post("/makerspace/send-otp", sendOTP);
router.post("/makerspace/verify-otp", verifyOTP);

// Aliases (short paths): /api/public/send-otp and /api/public/verify-otp
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);

// Makerspace: registration flow (public)
router.get("/makerspace/verify-member", verifyMember);
router.post("/makerspace/register-staff-guest", registerStaffGuest);

// Aliases (short paths): /api/public/verify-member and /api/public/register-staff-guest
router.get("/verify-member", verifyMember);
router.post("/register-staff-guest", registerStaffGuest);

// Makerspace: check-in (public)
router.post("/makerspace/check-in", createCheckIn);

// Alias (short path): /api/public/check-in
router.post("/check-in", createCheckIn);

export default router;
