import mongoose from "mongoose";

const checkInSchema = new mongoose.Schema(
  {
    membershipId: { type: String, required: true, index: true },
    userType: {
      type: String,
      enum: ["student", "staff", "guest"],
      required: true,
    },
    registrationModel: {
      type: String,
      enum: ["Registration", "StaffGuestRegistration"],
      required: true,
    },
    registrationRef: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "registrationModel",
      required: true,
      index: true,
    },
    checkedInAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true }
);

export default mongoose.model("CheckIn", checkInSchema, "checkins");
