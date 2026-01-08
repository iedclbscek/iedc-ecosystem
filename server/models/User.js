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

    passwordSetupTokenHash: { type: String },
    passwordSetupExpiresAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema, "users");
