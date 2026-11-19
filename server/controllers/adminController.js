import Registration from "../models/Registration.js";
import StaffGuestRegistration from "../models/StaffGuestRegistration.js";
import { paginationMeta, parsePagination } from "../utils/pagination.js";

const normalizeMemberType = (value) => {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  if (!v) return "student";
  if (v === "student" || v === "staff" || v === "guest") return v;
  return null;
};

// GET registrations with Pagination
export const getRegistrations = async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query, { defaultLimit: 10 });
    const search = String(req.query.search || "").trim();
    const memberType = normalizeMemberType(req.query.memberType);
    if (!memberType) {
      return res
        .status(400)
        .json({ message: "memberType must be 'student', 'staff', or 'guest'" });
    }
    const baseQuery = memberType === "student" ? {} : { userType: memberType };
    let query = baseQuery;
    if (search) {
      const escapedSearch = search.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const or = [
        { firstName: { $regex: escapedSearch, $options: "i" } },
        { lastName: { $regex: escapedSearch, $options: "i" } },
        { department: { $regex: escapedSearch, $options: "i" } },
        { membershipId: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
      ];

      if (memberType === "student") {
        or.push({ admissionNo: { $regex: escapedSearch, $options: "i" } });
      }
      if (memberType === "guest") {
        or.push({ organization: { $regex: escapedSearch, $options: "i" } });
      }

      query = { $and: [baseQuery, { $or: or }] };
    }

    const Model =
      memberType === "student" ? Registration : StaffGuestRegistration;

    const total = await Model.countDocuments(query);
    const meta = paginationMeta({ page, limit, total });
    const members = await Model.find(query)
      .select("firstName lastName email membershipId admissionNo department semester phone phoneNumber whatsappNumber organization status")
      .sort({ createdAt: -1, _id: -1 })
      .skip((meta.page - 1) * limit)
      .limit(limit).lean();

    res.json({
      memberType,
      members,
      totalPages: meta.totalPages,
      currentPage: meta.page,
      totalMembers: total,

      // Backwards compatibility for older UI
      students: members,
      totalStudents: total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE a registration
export const updateRegistration = async (req, res) => {
  try {
    const memberType = normalizeMemberType(req.query.memberType);
    if (!memberType) {
      return res
        .status(400)
        .json({ message: "memberType must be 'student', 'staff', or 'guest'" });
    }

    const Model =
      memberType === "student" ? Registration : StaffGuestRegistration;

    const filter = { _id: req.params.id };
    if (memberType !== "student") filter.userType = memberType;
    const input = req.body || {};
    const allowedFields = [
      "firstName", "lastName", "email", "department", "phone", "whatsappNumber",
      ...(memberType === "student" ? ["admissionNo", "semester"] : ["membershipId"]),
      ...(memberType === "guest" ? ["organization"] : []),
    ];
    const fields = {};
    for (const field of allowedFields) {
      const value = field === "phone" ? input.phone ?? input.phoneNumber : input[field];
      if (value === undefined) continue;
      if (typeof value !== "string") {
        return res.status(400).json({ message: `${field} must be text` });
      }
      fields[field] = value.trim();
    }
    if (fields.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    const update = { $set: fields };
    if (fields.admissionNo === "") {
      delete fields.admissionNo;
      update.$unset = { admissionNo: 1 };
    }
    const doc = await Model.findOneAndUpdate(filter, update, {
      new: true, runValidators: true,
    }).select("-accessCode");
    if (!doc) return res.status(404).json({ message: "Member not found" });
    res.json({ message: "Record updated successfully", member: doc });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Another member already uses that identifier or email." });
    if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({ message: "Check the member details and try again." });
    res.status(500).json({ message: "Could not update this member." });
  }
};

// DELETE a registration
export const deleteRegistration = async (req, res) => {
  try {
    const memberType = normalizeMemberType(req.query.memberType);
    if (!memberType) {
      return res
        .status(400)
        .json({ message: "memberType must be 'student', 'staff', or 'guest'" });
    }

    const Model =
      memberType === "student" ? Registration : StaffGuestRegistration;
    const filter = { _id: req.params.id };
    if (memberType !== "student") filter.userType = memberType;
    const doc = await Model.findOneAndDelete(filter);
    if (!doc) return res.status(404).json({ message: "Member not found" });
    res.json({ message: "Record deleted successfully" });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid member ID." });
    res.status(500).json({ message: "Could not delete this member." });
  }
};
