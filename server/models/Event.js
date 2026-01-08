import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club" },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    location: { type: String, trim: true },
    startAt: { type: Date },
    endAt: { type: Date },
    coordinatorUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Backward compatible field (old single coordinator). Keep for now.
    coordinatorUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema, "events");
