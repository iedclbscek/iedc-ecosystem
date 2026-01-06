import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    email: { type: String, unique: true, required: true },
    admissionNo: { type: String, unique: true },
    department: String,
    semester: String,
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "active", "rejected"],
    },
    membershipId: String,
    hashedPassword: { type: String, select: false },
  },
  { timestamps: true }
);

export default mongoose.model(
  "Registration",
  registrationSchema,
  "registrations"
);
