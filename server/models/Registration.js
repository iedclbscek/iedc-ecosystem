import mongoose from "mongoose";
import RegistrationCounter from "./RegistrationCounter.js";

const departmentCodeMap = {
  "Computer Science and Engineering": "CS",
  "Computer Science and Business Systems": "CSBS",
  "Computer Science and Engineering(AI & Data Science)": "AI",
  "Electrical and Electronics Engineering": "EE",
  "Electronics and Communication Engineering": "EC",
  "Information Technology": "IT",
  "Mechanical Engineering": "ME",
  "Civil Engineering": "CE",
};

const registrationSchema = new mongoose.Schema(
  {
    // Personal
    firstName: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true, required: true },
    email: { type: String, unique: true, required: true, lowercase: true },
    phone: { type: String, trim: true, required: true },

    // Student academic info
    // Optional: only some forms provide this. Must be sparse-unique to avoid
    // duplicate key errors when the field is missing.
    admissionNo: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
    },
    referralCode: { type: String, trim: true, required: true },
    department: { type: String, required: true },
    yearOfJoining: { type: String, required: true },
    semester: { type: String, required: true },
    isLateralEntry: { type: Boolean, default: false },

    // Interests
    interests: [{ type: String }],
    nonTechInterests: { type: String, trim: true },

    // Experience & motivation
    experience: { type: String, trim: true },
    motivation: { type: String, trim: true, required: true },

    // Online profiles
    linkedin: { type: String, trim: true },
    github: { type: String, trim: true },
    portfolio: { type: String, trim: true },

    // Photo URLs
    profilePhoto: { type: String, default: null },
    idPhoto: { type: String, default: null },

    // Status / metadata
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
      index: true,
    },
    adminNotes: { type: String, trim: true },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Generated IDs
    membershipId: { type: String, unique: true, sparse: true, index: true },
    accessCode: { type: String },

    // For legacy portal users (if ever used)
    hashedPassword: { type: String, select: false },
  },
  { timestamps: true },
);

registrationSchema.pre("save", async function (next) {
  if (this.membershipId || String(this.userType || "student") !== "student") {
    return next();
  }

  try {
    const year = String(this.yearOfJoining ?? "").trim();
    const yearSuffix = year.slice(-2);
    const deptCode = departmentCodeMap[this.department] || "XX";
    const isLateral =
      this.isLateralEntry === true || this.isLateralEntry === "true";

    // Use a counter to avoid duplicates (and avoid depending on historical
    // department strings being perfectly normalized).
    const counterKey = `student:${yearSuffix}:${deptCode}`;

    const basePrefix = `IEDC${yearSuffix}${deptCode}`;
    const extractSeq = (membershipId) => {
      const m = String(membershipId || "").match(/(\d{3})$/);
      return m ? Number(m[1]) : 0;
    };

    // Initialize the counter from existing membershipIds (once per key).
    const [lastNonLateral, lastLateral] = await Promise.all([
      this.constructor
        .findOne({ membershipId: new RegExp(`^${basePrefix}\\d{3}$`, "i") })
        .select("membershipId")
        .sort({ membershipId: -1 })
        .lean(),
      this.constructor
        .findOne({ membershipId: new RegExp(`^${basePrefix}L\\d{3}$`, "i") })
        .select("membershipId")
        .sort({ membershipId: -1 })
        .lean(),
    ]);
    const maxExistingSeq = Math.max(
      extractSeq(lastNonLateral?.membershipId),
      extractSeq(lastLateral?.membershipId),
    );

    // MongoDB doesn't allow $setOnInsert and $inc on the same path in one update.
    await RegistrationCounter.updateOne(
      { key: counterKey },
      { $setOnInsert: { seq: maxExistingSeq } },
      { upsert: true },
    );

    const counter = await RegistrationCounter.findOneAndUpdate(
      { key: counterKey },
      { $inc: { seq: 1 } },
      { new: true },
    ).lean();

    const seq = String(Number(counter?.seq || maxExistingSeq + 1)).padStart(
      3,
      "0",
    );

    this.membershipId = isLateral
      ? `IEDC${yearSuffix}${deptCode}L${seq}`
      : `IEDC${yearSuffix}${deptCode}${seq}`;

    if (!this.accessCode) {
      this.accessCode = this.membershipId;
    }

    return next();
  } catch (err) {
    return next(err);
  }
});

export default mongoose.model(
  "Registration",
  registrationSchema,
  "registrations",
);
