import Registration from "../models/Registration.js";
import StaffGuestRegistration from "../models/StaffGuestRegistration.js";

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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = String(req.query.search || "").trim();
    const memberType = normalizeMemberType(req.query.memberType);
    if (!memberType) {
      return res
        .status(400)
        .json({ message: "memberType must be 'student', 'staff', or 'guest'" });
    }
    const skip = (page - 1) * limit;

    const baseQuery = memberType === "student" ? {} : { userType: memberType };
    let query = baseQuery;
    if (search) {
      const or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { membershipId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];

      if (memberType === "student") {
        or.push({ admissionNo: { $regex: search, $options: "i" } });
      }
      if (memberType === "guest") {
        or.push({ organization: { $regex: search, $options: "i" } });
      }

      query = { $and: [baseQuery, { $or: or }] };
    }

    const Model =
      memberType === "student" ? Registration : StaffGuestRegistration;

    const [members, total] = await Promise.all([
      Model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Model.countDocuments(query),
    ]);

    res.json({
      memberType,
      members,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalMembers: total,

      // Backwards compatibility for older UI
      students: members,
      totalStudents: total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Member not found" });
    res.json({ message: "Record deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
