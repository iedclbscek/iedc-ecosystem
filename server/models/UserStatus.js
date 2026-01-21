import mongoose from "mongoose";

const userStatusSchema = new mongoose.Schema(
  {
    membershipId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    userName: { type: String, required: true, trim: true },
    currentStatus: {
      type: String,
      enum: ["IN", "OUT"],
      required: true,
      default: "OUT",
      index: true,
    },
    lastUpdated: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true },
);

export default mongoose.model("UserStatus", userStatusSchema, "user_statuses");
