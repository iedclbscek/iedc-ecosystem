import mongoose from "mongoose";

const staffGuestRegistrationSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },

    // staff | guest only
    userType: {
      type: String,
      enum: ["staff", "guest"],
      required: true,
      index: true,
    },

    department: String,
    organization: String,

    status: {
      type: String,
      default: "active",
      enum: ["active", "inactive"],
      index: true,
    },

    membershipId: { type: String, required: true, unique: true, index: true },
    accessCode: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model(
  "StaffGuestRegistration",
  staffGuestRegistrationSchema,
  "staff_guest_registrations"
);
