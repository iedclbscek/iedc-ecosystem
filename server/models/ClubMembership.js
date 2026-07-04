import mongoose from "mongoose";

const clubMembershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
    },
    role: {
      type: String,
      trim: true,
      enum: ["lead", "editor", "member", "viewer"],
      default: "member",
    },
    permissions: [{ type: String, trim: true }],
    scope: {
      type: String,
      trim: true,
      default: "club",
    },
    status: {
      type: String,
      trim: true,
      enum: ["active", "inactive"],
      default: "active",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

clubMembershipSchema.index({ userId: 1, clubId: 1 }, { unique: true });

export default mongoose.model(
  "ClubMembership",
  clubMembershipSchema,
  "club_memberships",
);
