import mongoose from "mongoose";

const EmailTemplateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: { type: String, required: true, trim: true },
    subject: { type: String, default: "", trim: true },
    html: { type: String, required: true },
    isBase: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("EmailTemplate", EmailTemplateSchema);
