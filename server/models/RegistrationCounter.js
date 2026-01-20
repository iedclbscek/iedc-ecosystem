import mongoose from "mongoose";

const registrationCounterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model(
  "RegistrationCounter",
  registrationCounterSchema,
  "registration_counters",
);
