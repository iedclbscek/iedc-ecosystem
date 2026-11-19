import mongoose from "mongoose";

// Keep representative codes out of the legacy, email-only OTP flows.
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  membershipId: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  requestedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("SecondYearRepOTP", otpSchema, "second_year_rep_otps");
