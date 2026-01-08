import express from "express";
import User from "../models/User.js";

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

export default router;
