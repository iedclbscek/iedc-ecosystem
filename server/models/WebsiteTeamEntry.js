import mongoose from "mongoose";

const websiteTeamEntrySchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: ["execom"],
      default: "execom",
    },
    year: { type: String, required: true, trim: true },
    userRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    roleTitle: { type: String, trim: true },
  },
  { timestamps: true }
);

websiteTeamEntrySchema.index(
  { category: 1, year: 1, userRef: 1 },
  { unique: true }
);

websiteTeamEntrySchema.index({ category: 1, year: 1, order: 1, createdAt: 1 });

export default mongoose.model(
  "WebsiteTeamEntry",
  websiteTeamEntrySchema,
  "website_team_entries"
);
