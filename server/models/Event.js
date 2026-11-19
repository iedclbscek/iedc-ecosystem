import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club" },
    scope: {
      type: String,
      trim: true,
      enum: ["iedc", "club"],
      default: "club",
    },
    status: {
      type: String,
      trim: true,
      enum: ["draft", "published", "completed", "cancelled"],
      default: "draft",
    },
    visibility: {
      type: String,
      trim: true,
      enum: ["public", "private"],
      default: "public",
    },
    title: { type: String, required: true, trim: true },
    // Retained for pre-club events; current events derive their public category from club.
    category: { type: String, trim: true },
    description: { type: String, trim: true },
    shortDescription: { type: String, trim: true },
    venue: { type: String, trim: true },
    location: { type: String, trim: true },
    mode: { type: String, trim: true },
    startAt: { type: Date },
    endAt: { type: Date },
    posterUrl: { type: String, trim: true },
    posterPublicId: { type: String, trim: true },
    registrationUrl: { type: String, trim: true },
    registrationLink: { type: String, trim: true },
    externalLink: { type: String, trim: true },
    coordinatorUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Backward compatible field (old single coordinator). Keep for now.
    coordinatorUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    publishedAt: { type: Date },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

eventSchema.index({ status: 1, visibility: 1, startAt: -1, createdAt: -1 });
eventSchema.index({ club: 1, startAt: 1, _id: 1 });

eventSchema.index({ scope: 1, startAt: -1, createdAt: -1, _id: -1 });

export default mongoose.model("Event", eventSchema, "events");
