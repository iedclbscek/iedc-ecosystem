import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    membershipId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    role: { type: String, trim: true },
    permissions: [{ type: String, trim: true }],

    // Admin portal access can be revoked without deleting the user.
    portalAccessEnabled: { type: Boolean, default: true },

    // Public website profile (execom/team page)
    websiteProfile: {
      visible: { type: Boolean, default: false },
      order: { type: Number, default: 0 },
      roleTitle: { type: String, trim: true },
      group: { type: String, trim: true },
    },
    registrationRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
    },

    passwordSetupTokenHash: { type: String, select: false },
    passwordSetupExpiresAt: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.index({ "websiteProfile.visible": 1, "websiteProfile.order": 1, createdAt: 1 });

export default mongoose.model("User", userSchema, "users");
