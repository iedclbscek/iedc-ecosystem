import FirstYearRepresentativeApplication from "../models/FirstYearRepresentativeApplication.js";
import { paginationMeta, parsePagination } from "../utils/pagination.js";
import SystemSetting from "../models/SystemSetting.js";
import { hasPermission } from "../middleware/requireAuth.js";

// Utility for formatting error responses
const handleError = (res, error, customMessage = "Server error") => {
  console.error(error);
  res.status(500).json({ message: customMessage, error: error.message });
};

function applicationFilter(params) {
  const query = {};
  const search = typeof params.search === "string" ? params.search.trim().slice(0, 100) : "";
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = ["memberSnapshot.name", "memberSnapshot.admissionNumber", "membershipId", "memberSnapshot.email"]
      .map((field) => ({ [field]: regex }));
  }
  for (const [key, field] of [["department", "memberSnapshot.department"], ["class", "memberSnapshot.class"], ["status", "status"]]) {
    if (typeof params[key] === "string" && params[key]) query[field] = params[key];
  }
  return query;
}

// @desc    Get all first-year representative applications with filtering and pagination
// @route   GET /api/admin/first-year-reps
// @access  Private (Admin + firstYearReps permission)
export const getApplications = async (req, res) => {
  try {
    if (!hasPermission(req.user, "firstYearReps")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { page, limit } = parsePagination(req.query, { defaultLimit: 20 });

    const query = applicationFilter(req.query);

    let sort = { createdAt: -1 };
    if (typeof req.query.sort === "string" && req.query.sort) {
      const sortField = req.query.sort.replace("-", "");
      const sortOrder = req.query.sort.startsWith("-") ? -1 : 1;
      // map submittedAt to createdAt since timestamps are standard
      sort = { [sortField === "submittedAt" ? "createdAt" : sortField]: sortOrder };
    }

    const [total, statsAggr] = await Promise.all([
      FirstYearRepresentativeApplication.countDocuments(query),
      FirstYearRepresentativeApplication.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 }, departments: { $addToSet: "$memberSnapshot.department" } } },
      ]),
    ]);
    const meta = paginationMeta({ page, limit, total });
    const applications = await FirstYearRepresentativeApplication.find(query)
      .select("membershipId memberSnapshot.name memberSnapshot.admissionNumber memberSnapshot.department memberSnapshot.class status createdAt")
      .sort({ ...sort, _id: -1 })
      .skip((meta.page - 1) * limit)
      .limit(limit)
      .lean();

    const stats = {
      total: 0,
      applied: 0,
      reviewed: 0,
      shortlisted: 0,
      interview: 0,
      selected: 0,
      rejected: 0
    };

    statsAggr.forEach(s => {
      stats.total += s.count;
      const key = String(s._id).toLowerCase();
      if (stats[key] !== undefined) stats[key] = s.count;
    });

    res.json({
      applications: applications.map(app => ({
        _id: app._id,
        membershipId: app.membershipId,
        name: app.memberSnapshot?.name,
        admissionNumber: app.memberSnapshot?.admissionNumber,
        department: app.memberSnapshot?.department,
        class: app.memberSnapshot?.class,
        status: app.status,
        submittedAt: app.createdAt
      })),
      stats,
      departments: [...new Set(statsAggr.flatMap(row => row.departments).filter(Boolean))].sort(),
      page: meta.page,
      pages: meta.totalPages,
      limit,
      total,
    });
  } catch (error) {
    handleError(res, error, "Failed to fetch applications");
  }
};

// @desc    Get single application detail
// @route   GET /api/admin/first-year-reps/:id
// @access  Private (Admin + firstYearReps permission)
export const getApplicationDetail = async (req, res) => {
  try {
    if (!hasPermission(req.user, "firstYearReps")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const application = await FirstYearRepresentativeApplication.findById(req.params.id)
      .populate("review.reviewedBy", "name")
      .lean();

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json(application);
  } catch (error) {
    handleError(res, error, "Failed to fetch application detail");
  }
};

// @desc    Update application status & remarks
// @route   PATCH /api/admin/first-year-reps/:id
// @access  Private (Admin + firstYearReps permission)
export const updateApplication = async (req, res) => {
  try {
    if (!hasPermission(req.user, "firstYearReps")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { status, remarks } = req.body;

    const changes = {};
    if (status !== undefined) {
      const statuses = FirstYearRepresentativeApplication.schema.path("status").enumValues;
      if (!statuses.includes(status)) return res.status(400).json({ message: "Invalid application status" });
      changes.status = status;
    }
    if (remarks !== undefined) {
      if (typeof remarks !== "string") return res.status(400).json({ message: "Invalid reviewer notes" });
      changes["review.remarks"] = remarks;
    }
    if (!Object.keys(changes).length) return res.status(400).json({ message: "No changes supplied" });
    changes["review.reviewedBy"] = req.user.id;
    changes["review.reviewedAt"] = new Date();
    const application = await FirstYearRepresentativeApplication.findByIdAndUpdate(req.params.id, { $set: changes }, { new: true, runValidators: true })
      .populate("review.reviewedBy", "name");
    if (!application) return res.status(404).json({ message: "Application not found" });

    res.json({ message: "Application updated successfully", application });
  } catch (error) {
    handleError(res, error, "Failed to update application");
  }
};

// @desc    Delete an application
// @route   DELETE /api/admin/first-year-reps/:id
// @access  Private (Admin + firstYearReps permission)
export const deleteApplication = async (req, res) => {
  try {
    if (!hasPermission(req.user, "firstYearReps")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const application = await FirstYearRepresentativeApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    await FirstYearRepresentativeApplication.findByIdAndDelete(req.params.id);

    res.json({ message: "Application deleted successfully" });
  } catch (error) {
    handleError(res, error, "Failed to delete application");
  }
};

// @desc    Export applications to CSV
// @route   GET /api/admin/first-year-reps/export/csv
// @access  Private (Admin + firstYearReps permission)
export const exportApplications = async (req, res) => {
  try {
    if (!hasPermission(req.user, "firstYearReps")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const applications = await FirstYearRepresentativeApplication.find(applicationFilter(req.query))
      .select("memberSnapshot membershipId status createdAt")
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    // Create CSV header
    const headers = [
      "Name",
      "Membership ID",
      "Admission Number",
      "Department",
      "Semester",
      "Class",
      "Email",
      "Phone",
      "Status",
      "Submitted At"
    ];

    const rows = applications.map((app) => [
      app.memberSnapshot?.name, app.membershipId, app.memberSnapshot?.admissionNumber,
      app.memberSnapshot?.department, app.memberSnapshot?.semester, app.memberSnapshot?.class,
      app.memberSnapshot?.email, app.memberSnapshot?.phone, app.status, app.createdAt?.toISOString()
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(field => {
      const text = String(field ?? "");
      const safe = /^[\s]*[=+@-]/.test(text) ? "'" + text : text;
      return '"' + safe.replaceAll('"', '""') + '"';
    }).join(",")).join("\r\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="first_year_reps.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    handleError(res, error, "Failed to export applications");
  }
};

// @desc    Get first-year reps settings (e.g. application open/closed status)
// @route   GET /api/admin/first-year-reps/settings
// @access  Private (Admin + firstYearReps permission)
export const getSettings = async (req, res) => {
  try {
    if (!hasPermission(req.user, "firstYearReps")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const setting = await SystemSetting.findOne({ key: "first_year_reps_open" }).lean();
    const isOpen = setting ? Boolean(setting.value) : true;

    res.json({ isOpen });
  } catch (error) {
    handleError(res, error, "Failed to fetch settings");
  }
};

// @desc    Update first-year reps settings (toggle applications open/closed)
// @route   PATCH /api/admin/first-year-reps/settings
// @access  Private (Admin + firstYearReps permission)
export const updateSettings = async (req, res) => {
  try {
    if (!hasPermission(req.user, "firstYearReps")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { isOpen } = req.body;
    if (typeof isOpen !== "boolean") {
      return res.status(400).json({ message: "isOpen must be a boolean" });
    }

    await SystemSetting.findOneAndUpdate(
      { key: "first_year_reps_open" },
      { key: "first_year_reps_open", value: isOpen },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      isOpen,
      message: `First-Year Representative applications are now ${isOpen ? "open" : "closed"}.`,
    });
  } catch (error) {
    handleError(res, error, "Failed to update settings");
  }
};

