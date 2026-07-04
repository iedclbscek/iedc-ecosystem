import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import WebsiteTeamEntry from "../models/WebsiteTeamEntry.js";
import { extractCloudinaryPublicIdFromUrl } from "../utils/cloudinaryHelpers.js";

dotenv.config();

const run = async () => {
  await connectDB();

  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const entries = await WebsiteTeamEntry.find({
    imageUrl: { $type: "string", $ne: "" },
    $or: [
      { imagePublicId: { $exists: false } },
      { imagePublicId: null },
      { imagePublicId: "" },
    ],
  }).select("_id imageUrl imagePublicId");

  let updated = 0;
  let skippedNonCloudinary = 0;
  let skippedNoMatch = 0;
  let failed = 0;

  for (const entry of entries) {
    const extracted = extractCloudinaryPublicIdFromUrl(entry.imageUrl, cloudName);

    if (!extracted) {
      if (entry.imageUrl) {
        if (
          /res\.cloudinary\.com/i.test(
            String(entry.imageUrl).toLowerCase(),
          )
        ) {
          skippedNoMatch += 1;
        } else {
          skippedNonCloudinary += 1;
        }
      }
      continue;
    }

    entry.imagePublicId = extracted;
    try {
      await entry.save();
      updated += 1;
    } catch (error) {
      failed += 1;
      console.error(`Failed to update WebsiteTeamEntry ${entry._id}:`, error.message);
    }
  }

  console.log("Cloudinary backfill completed:", {
    scanned: entries.length,
    updated,
    skippedNonCloudinary,
    skippedNoMatch,
    failed,
  });

  await mongoose.connection.close();
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Backfill failed:", error.message);
    process.exit(1);
  });
