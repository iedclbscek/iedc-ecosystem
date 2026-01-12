import express from "express";
import User from "../models/User.js";
import { getMemberById } from "../controllers/publicMemberController.js";

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

export default router;
