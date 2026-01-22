import mongoose from "mongoose";

const bannedMembershipIdSchema = new mongoose.Schema(
  {
    membershipId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    bannedAt: {
      type: Date,
      default: Date.now,
    },
    bannedBy: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model(
  "BannedMembershipId",
  bannedMembershipIdSchema,
  "banned_membership_ids",
);
