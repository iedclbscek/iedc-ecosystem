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
    entryType: {
      type: String,
      enum: ["user", "custom"],
      default: "user",
    },
    userRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    customName: { type: String, trim: true },
    customEmail: { type: String, trim: true },
    customMembershipId: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    github: { type: String, trim: true },
    twitter: { type: String, trim: true },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    roleTitle: { type: String, trim: true },
  },
  { timestamps: true },
);
// Require either a linked user or a custom name
websiteTeamEntrySchema.pre("validate", function (next) {
  if (this.entryType === "custom") {
    if (!this.customName) {
      return next(new Error("customName is required for custom entries"));
    }
    this.userRef = undefined;
  } else {
    if (!this.userRef) {
      return next(new Error("userRef is required for user entries"));
    }
    this.customName = undefined;
    this.customEmail = undefined;
    this.customMembershipId = undefined;
  }
  next();
});

// Unique per year/category for user-backed entries
websiteTeamEntrySchema.index(
  { category: 1, year: 1, userRef: 1 },
  { unique: true, partialFilterExpression: { userRef: { $exists: true } } },
);

websiteTeamEntrySchema.index({ category: 1, year: 1, order: 1, createdAt: 1 });

export default mongoose.model(
  "WebsiteTeamEntry",
  websiteTeamEntrySchema,
  "website_team_entries",
);
