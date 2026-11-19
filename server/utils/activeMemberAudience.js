import Registration from "../models/Registration.js";

export const validEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const joiningYearPattern = /^\d{4}$/;
const pageSize = 10;
const maxPage = 100_000;

export class AudienceFilterError extends Error {}

export function parseAudienceFilters(filters = {}) {
  if (filters === null || typeof filters !== "object" || Array.isArray(filters)) {
    throw new AudienceFilterError("filters must be an object");
  }
  const match = {};
  for (const [key, value] of Object.entries(filters)) {
    if (key !== "department" && key !== "yearOfJoining") {
      throw new AudienceFilterError("Only department and yearOfJoining filters are supported");
    }
    if (typeof value !== "string" || !value.trim()) {
      throw new AudienceFilterError(`${key} must be a non-empty string`);
    }
    const trimmed = value.trim();
    if (key === "department") {
      match.departmentKey = trimmed.toLowerCase();
    } else {
      if (!joiningYearPattern.test(trimmed)) {
        throw new AudienceFilterError("yearOfJoining must be a four-digit year");
      }
      match.joiningYear = trimmed;
    }
  }
  return match;
}

export function parseAudiencePage(value) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > maxPage) {
    throw new AudienceFilterError(`page must be an integer from 1 to ${maxPage}`);
  }
  return Number(value);
}

// Count and delivery share these stages, including validation after trimming.
// Project only the fields needed for the particular operation.
function eligibleMembers(fields = { _id: 0 }) {
  return [
    { $match: { status: "active", $expr: { $eq: [{ $type: "$email" }, "string"] } } },
    { $project: {
      ...fields,
      email: { $trim: { input: "$email" } },
      departmentLabel: { $trim: { input: { $cond: [{ $eq: [{ $type: "$department" }, "string"] }, "$department", ""] } } },
      joiningYear: { $trim: { input: { $convert: { input: "$yearOfJoining", to: "string", onError: "", onNull: "" } } } },
    } },
    { $match: { email: validEmailPattern } },
    { $set: { departmentKey: { $toLower: "$departmentLabel" } } },
  ];
}

export async function getAudienceSummary(match, page) {
  const includeMembers = page !== undefined;
  const identityFields = { _id: 1, firstName: 1, lastName: 1 };
  const [result] = await Registration.aggregate([
    ...eligibleMembers(includeMembers ? identityFields : undefined),
    { $facet: {
      departments: [
        { $match: { departmentLabel: { $ne: "" } } },
        { $group: { _id: "$departmentKey", label: { $min: "$departmentLabel" } } },
        { $sort: { _id: 1 } },
      ],
      years: [
        { $match: { joiningYear: joiningYearPattern } },
        { $group: { _id: "$joiningYear" } },
        { $sort: { _id: -1 } },
      ],
      selected: [{ $match: match }, { $count: "total" }],
      ...(includeMembers && {
        members: [
          { $match: match },
          { $set: { firstNameKey: { $toLower: "$firstName" }, lastNameKey: { $toLower: "$lastName" } } },
          { $sort: { firstNameKey: 1, lastNameKey: 1, _id: 1 } },
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
          { $project: {
            _id: 0,
            id: { $toString: "$_id" },
            firstName: { $ifNull: ["$firstName", ""] },
            lastName: { $ifNull: ["$lastName", ""] },
            email: 1,
            department: "$departmentLabel",
            yearOfJoining: "$joiningYear",
          } },
        ],
      }),
    } },
  ]);
  const total = result.selected[0]?.total || 0;
  return {
    departments: result.departments.map(option => option.label),
    years: result.years.map(option => option._id),
    total,
    ...(includeMembers && { members: result.members, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) }),
  };
}

export function findAudienceMembers(match) {
  return Registration.aggregate([
    ...eligibleMembers({
      _id: 1, firstName: 1, lastName: 1, membershipId: 1, admissionNo: 1,
      department: 1, semester: 1, yearOfJoining: 1, status: 1,
    }),
    { $match: match },
    { $unset: ["departmentLabel", "joiningYear", "departmentKey"] },
  ]);
}
