import SecondYearRepresentativeApplication from "../models/SecondYearRepresentativeApplication.js";
import SystemSetting from "../models/SystemSetting.js";
import { hasPermission } from "../middleware/requireAuth.js";

const statuses = SecondYearRepresentativeApplication.schema.path("status").enumValues;

// Utility for formatting error responses
const handleError = (res, error, customMessage = "Server error") => {
  console.error(error);
  const status = ["CastError", "ValidationError"].includes(error.name) ? 400 : 500;
  res.status(status).json({ message: customMessage, error: error.message });
};

// @desc    Get all Second-Year representative applications with filtering and pagination
// @route   GET /api/admin/Second-Year-reps
// @access  Private (Admin + SecondYearReps permission)
export const getApplications = async (req, res) => {
  try {
    if (!hasPermission(req.user, "secondYearReps")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parameters = ["page", "limit", "search", "department", "class", "status", "sort"];
    if (parameters.some(key => req.query[key] !== undefined && typeof req.query[key] !== "string")) {
      return res.status(400).json({ message: "Query parameters must be strings" });
    }

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const skip = (page - 1) * limit;
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(skip)) {
      return res.status(400).json({ message: "page must be a positive integer and limit must be between 1 and 100" });
    }
    if (req.query.status && !statuses.includes(req.query.status)) {
      return res.status(400).json({ message: "Invalid application status" });
    }

    const query = {};

    if (req.query.search) {
      const regex = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { "memberSnapshot.name": regex },
        { "memberSnapshot.admissionNumber": regex },
        { membershipId: regex },
        { "memberSnapshot.email": regex },
      ];
    }

    if (req.query.department) {
      query["memberSnapshot.department"] = req.query.department;
    }

    if (req.query.class) {
      query["memberSnapshot.class"] = req.query.class;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    let sort = { createdAt: -1 };
    if (req.query.sort) {
      const sortField = req.query.sort.replace(/^-/, "");
      const sortOrder = req.query.sort.startsWith("-") ? -1 : 1;
      if (!["submittedAt", "createdAt", "membershipId", "status", "memberSnapshot.name", "memberSnapshot.admissionNumber", "memberSnapshot.department", "memberSnapshot.class"].includes(sortField)) {
        return res.status(400).json({ message: "Invalid sort field" });
      }
      // map submittedAt to createdAt since timestamps are standard
      sort = { [sortField === "submittedAt" ? "createdAt" : sortField]: sortOrder };
    }

    const applications = await SecondYearRepresentativeApplication.find(query)
      .select("membershipId memberSnapshot.name memberSnapshot.admissionNumber memberSnapshot.department memberSnapshot.class status createdAt")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await SecondYearRepresentativeApplication.countDocuments(query);
    
    // Aggregation for stats (Applied, Reviewed, Shortlisted, Selected, etc.)
    const statsAggr = await SecondYearRepresentativeApplication.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    
    const stats = {
      total: statsAggr.reduce((sum, s) => sum + s.count, 0),
      applied: 0,
      reviewed: 0,
      shortlisted: 0,
      interview: 0,
      selected: 0,
      rejected: 0
    };
    
    statsAggr.forEach(s => {
      const key = String(s._id).toLowerCase();
      if (stats[key] !== undefined) stats[key] = s.count;
    });

    res.json({
      applications: applications.map(app => ({
        _id: app._id,
        membershipId: app.membershipId,
        name: app.memberSnapshot.name,
        admissionNumber: app.memberSnapshot.admissionNumber,
        department: app.memberSnapshot.department,
        class: app.memberSnapshot.class,
        status: app.status,
        submittedAt: app.createdAt
      })),
      stats,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    handleError(res, error, "Failed to fetch applications");
  }
};

// @desc    Get single application detail
// @route   GET /api/admin/Second-Year-reps/:id
// @access  Private (Admin + SecondYearReps permission)
export const getApplicationDetail = async (req, res) => {
  try {
    if (!hasPermission(req.user, "secondYearReps")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const application = await SecondYearRepresentativeApplication.findById(req.params.id)
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
// @route   PATCH /api/admin/Second-Year-reps/:id
// @access  Private (Admin + SecondYearReps permission)
export const updateApplication = async (req, res) => {
  try {
    if (!hasPermission(req.user, "secondYearReps")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { status, remarks } = req.body || {};
    if (status === undefined && remarks === undefined) {
      return res.status(400).json({ message: "Provide a status or remarks to update" });
    }
    if (status !== undefined && !statuses.includes(status)) {
      return res.status(400).json({ message: "Invalid application status" });
    }
    if (remarks !== undefined && typeof remarks !== "string") {
      return res.status(400).json({ message: "Remarks must be a string" });
    }
    
    const application = await SecondYearRepresentativeApplication.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (status) application.status = status;

    if (status !== "Applied" || remarks !== undefined) {
      application.review = application.review || {};
      if (remarks !== undefined) application.review.remarks = remarks;
      application.review.reviewedBy = req.user.id;
      application.review.reviewedAt = new Date();
    }

    await application.save();

    res.json({ message: "Application updated successfully", application });
  } catch (error) {
    handleError(res, error, "Failed to update application");
  }
};

// @desc    Delete an application
// @route   DELETE /api/admin/Second-Year-reps/:id
// @access  Private (Admin + SecondYearReps permission)
export const deleteApplication = async (req, res) => {
  try {
    if (!hasPermission(req.user, "secondYearReps")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const application = await SecondYearRepresentativeApplication.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    await SecondYearRepresentativeApplication.findByIdAndDelete(req.params.id);

    res.json({ message: "Application deleted successfully" });
  } catch (error) {
    handleError(res, error, "Failed to delete application");
  }
};

// @desc    Export applications to CSV
// @route   GET /api/admin/Second-Year-reps/export/csv
// @access  Private (Admin + SecondYearReps permission)
export const exportApplications = async (req, res) => {
  try {
    if (!hasPermission(req.user, "secondYearReps")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const applications = await SecondYearRepresentativeApplication.find({})
      .select("-review.reviewedBy") // Exclude sensitive/unnecessary refs
      .sort({ createdAt: -1 })
      .lean();

    const csvCell = (value) => {
      const text = String(value ?? "");
      const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
      return `"${safeText.replace(/"/g, '""')}"`;
    };

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
      csvCell(app.memberSnapshot?.name),
      csvCell(app.membershipId),
      csvCell(app.memberSnapshot?.admissionNumber),
      csvCell(app.memberSnapshot?.department),
      csvCell(app.memberSnapshot?.semester),
      csvCell(app.memberSnapshot?.class),
      csvCell(app.memberSnapshot?.email),
      csvCell(app.memberSnapshot?.phone),
      csvCell(app.status),
      csvCell(app.createdAt?.toISOString?.() || app.createdAt),
    ]);

    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="second_year_reps.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    handleError(res, error, "Failed to export applications");
  }
};

// @desc    Get Second-Year reps settings (e.g. application open/closed status)
// @route   GET /api/admin/Second-Year-reps/settings
// @access  Private (Admin + SecondYearReps permission)
export const getSettings = async (req, res) => {
  try {
    if (!hasPermission(req.user, "secondYearReps")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const setting = await SystemSetting.findOne({ key: "second_year_reps_open" }).lean();
    const isOpen = setting ? Boolean(setting.value) : true;

    res.json({ isOpen });
  } catch (error) {
    handleError(res, error, "Failed to fetch settings");
  }
};

// @desc    Update Second-Year reps settings (toggle applications open/closed)
// @route   PATCH /api/admin/Second-Year-reps/settings
// @access  Private (Admin + SecondYearReps permission)
export const updateSettings = async (req, res) => {
  try {
    if (!hasPermission(req.user, "secondYearReps")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { isOpen } = req.body || {};
    if (typeof isOpen !== "boolean") {
      return res.status(400).json({ message: "isOpen must be a boolean" });
    }

    await SystemSetting.findOneAndUpdate(
      { key: "second_year_reps_open" },
      { key: "second_year_reps_open", value: isOpen },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      isOpen,
      message: `Second-Year Representative applications are now ${isOpen ? "open" : "closed"}.`,
    });
  } catch (error) {
    handleError(res, error, "Failed to update settings");
  }
};
