import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import { buildPublicEventsPipeline } from "./publicEventQuery.js";

const mongoUri = process.env.TEST_MONGO_URI;

test("public event pipeline filters and orders legacy ISO and BSON dates", { skip: !mongoUri }, async () => {
  await mongoose.connect(mongoUri);
  const collection = mongoose.connection.collection("events");
  const marker = `legacy-public-${Date.now()}`;
  const now = new Date("2026-11-19T00:00:00.000Z");

  try {
    await collection.insertMany([
      {
        title: `${marker}-iso`,
        startDate: "2026-11-20T09:00:00.000Z",
        endDate: "2026-11-20T10:00:00.000Z",
        image: "https://example.test/iso.webp",
        status: "published",
        visibility: "public",
        createdAt: now,
      },
      {
        title: `${marker}-bson`,
        date: new Date("2026-11-21T09:00:00.000Z"),
        status: "published",
        visibility: "public",
        createdAt: now,
      },
    ]);

    const rows = await collection.aggregate(buildPublicEventsPipeline({
      now,
      time: "upcoming",
      page: 1,
      limit: 10,
      extraMatch: { title: { $regex: `^${marker}` } },
    })).toArray();

    assert.deepEqual(rows.map((row) => row.title), [`${marker}-iso`, `${marker}-bson`]);
    assert.equal(rows[0].posterUrl, "https://example.test/iso.webp");
  } finally {
    await collection.deleteMany({ title: { $regex: `^${marker}` } });
    await mongoose.disconnect();
  }
});
