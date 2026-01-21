import mongoose from "mongoose";

const checkInLogSchema = new mongoose.Schema(
  {
    membershipId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    userName: { type: String, required: true, trim: true },
    action: {
      type: String,
      enum: ["IN", "OUT"],
      required: true,
    },
    timestamp: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true },
);

// Required indexes: timestamp and membershipId
checkInLogSchema.index({ membershipId: 1, timestamp: -1 });
checkInLogSchema.index({ timestamp: -1 });

export default mongoose.model("CheckInLog", checkInLogSchema, "checkin_logs");
