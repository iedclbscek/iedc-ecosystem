import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    email: { type: String, unique: true, required: true },
    admissionNo: { type: String, unique: true },
    department: String,
    organization: String,
    semester: String,
    userType: {
      type: String,
      enum: ["student", "staff", "guest"],
      default: "student",
      index: true,
    },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "active", "rejected"],
    },
    membershipId: String,
    accessCode: String,
    hashedPassword: { type: String, select: false },
  },
  { timestamps: true }
);

export default mongoose.model(
  "Registration",
  registrationSchema,
  "registrations"
);
