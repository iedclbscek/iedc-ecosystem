import express from "express";
import {
  getApplicationStatus,
  requestVerification,
  verifyOtp,
  getProfile,
  submitApplication,
} from "../controllers/SecondYearRepController.js";

const router = express.Router();

// Second-Year Representatives Routes
router.get("/status", getApplicationStatus);
router.post("/request-verification", requestVerification);
router.post("/verify-otp", verifyOtp);
router.get("/profile", getProfile);
router.post("/apply", submitApplication);

export default router;


