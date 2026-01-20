import mongoose from "mongoose";

const hasTruthy = (obj, key) =>
  Boolean(obj && Object.prototype.hasOwnProperty.call(obj, key) && obj[key]);

/**
 * Fixes legacy index on registrations.admissionNo:
 * - Previously created as { unique: true } (NOT sparse)
 * - This breaks inserts when admissionNo is missing (null duplicates)
 */
export const ensureRegistrationAdmissionNoIndex = async () => {
  const conn = mongoose.connection;
  if (!conn?.db) return;

  const collection = conn.collection("registrations");

  let indexes = [];
  try {
    indexes = await collection.indexes();
  } catch {
    return;
  }

  const admissionIndex = indexes.find((i) => i?.name === "admissionNo_1");

  // If it's unique but not sparse, it's the problematic legacy index.
  if (
    admissionIndex &&
    hasTruthy(admissionIndex, "unique") &&
    !hasTruthy(admissionIndex, "sparse")
  ) {
    try {
      await collection.dropIndex("admissionNo_1");
    } catch {
      // ignore drop errors; we'll still try to create the right index
    }

    try {
      await collection.createIndex(
        { admissionNo: 1 },
        { name: "admissionNo_1", unique: true, sparse: true, background: true },
      );
    } catch {
      // ignore create errors (e.g., permissions). Without this fix, inserts may fail.
    }

    return;
  }

  // If missing entirely, create the safe index.
  if (!admissionIndex) {
    try {
      await collection.createIndex(
        { admissionNo: 1 },
        { name: "admissionNo_1", unique: true, sparse: true, background: true },
      );
    } catch {
      // ignore
    }
  }
};
