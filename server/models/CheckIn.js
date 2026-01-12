import mongoose from "mongoose";

const checkInSchema = new mongoose.Schema(
  {
    membershipId: { type: String, required: true, index: true },
    userType: {
      type: String,
      enum: ["student", "staff", "guest"],
      required: true,
    },
    registrationRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      required: true,
      index: true,
    },
    checkedInAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true }
);

export default mongoose.model("CheckIn", checkInSchema, "checkins");
