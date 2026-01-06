import Registration from "../models/Registration.js";

// GET registrations with Pagination
export const getRegistrations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = String(req.query.search || "").trim();
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query = {
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { admissionNo: { $regex: search, $options: "i" } },
          { department: { $regex: search, $options: "i" } },
          { membershipId: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
    }

    const [students, total] = await Promise.all([
      Registration.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Registration.countDocuments(query),
    ]);

    res.json({
      students,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalStudents: total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE a registration
export const deleteRegistration = async (req, res) => {
  try {
    const student = await Registration.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json({ message: "Record deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
