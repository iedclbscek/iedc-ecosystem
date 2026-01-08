import mongoose from "mongoose";

const clubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },

    // Users who can view/manage this club's events
    memberUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Users who can manage membership for this club
    managerUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model("Club", clubSchema, "clubs");
