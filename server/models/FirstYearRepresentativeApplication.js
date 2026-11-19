import mongoose from "mongoose";

const memberSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    admissionNumber: { type: String, trim: true, required: true },
    department: { type: String, trim: true, required: true },
    semester: { type: String, trim: true },
    class: { type: String, trim: true },
    email: { type: String, trim: true, required: true, lowercase: true },
    phone: { type: String, trim: true, required: true },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    membershipId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    memberSnapshot: {
      type: memberSnapshotSchema,
      required: true,
    },
    motivation: {
      type: String,
      required: true,
      trim: true,
    },
    teamworkInitiative: {
      type: String,
      trim: true,
    },
    representativeIdea: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Applied", "Reviewed", "Shortlisted", "Interview", "Selected", "Rejected"],
      default: "Applied",
      index: true,
    },
    review: {
      remarks: { type: String, trim: true },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reviewedAt: { type: Date },
    },
  },
  { timestamps: true }
);

applicationSchema.index({ createdAt: -1, _id: -1 });
applicationSchema.index({ status: 1, createdAt: -1, _id: -1 });
applicationSchema.index({ "memberSnapshot.department": 1, createdAt: -1, _id: -1 });

export default mongoose.model("FirstYearRepresentativeApplication", applicationSchema, "first_year_rep_applications");
