import FirstYearRepresentativeApplication from "../models/FirstYearRepresentativeApplication.js";
import SystemSetting from "../models/SystemSetting.js";
import { hasPermission } from "../middleware/requireAuth.js";

// Utility for formatting error responses
const handleError = (res, error, customMessage = "Server error") => {
  console.error(error);
  res.status(500).json({ message: customMessage, error: error.message });
};

// @desc    Get all first-year representative applications with filtering and pagination
// @route   GET /api/admin/first-year-reps
// @access  Private (Admin + firstYearReps permission)
export const getApplications = async (req, res) => {
  try {
    if (!hasPermission(req.user, "firstYearReps")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.search) {
      const regex = new RegExp(req.query.search, "i");
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
      const sortField = req.query.sort.replace("-", "");
      const sortOrder = req.query.sort.startsWith("-") ? -1 : 1;
      // map submittedAt to createdAt since timestamps are standard
      sort = { [sortField === "submittedAt" ? "createdAt" : sortField]: sortOrder };
    }

    const applications = await FirstYearRepresentativeApplication.find(query)
      .select("membershipId memberSnapshot.name memberSnapshot.admissionNumber memberSnapshot.department memberSnapshot.class status createdAt")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await FirstYearRepresentativeApplication.countDocuments(query);
    
    // Aggregation for stats (Applied, Reviewed, Shortlisted, Selected, etc.)
    const statsAggr = await FirstYearRepresentativeApplication.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    
    const stats = {
      total,
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
    
    const application = await FirstYearRepresentativeApplication.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (status) application.status = status;
    
    // Update review object if provided
    if (status !== "Applied") {
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

    const applications = await FirstYearRepresentativeApplication.find({})
      .select("-review.reviewedBy") // Exclude sensitive/unnecessary refs
      .sort({ createdAt: -1 })
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
      `"${(app.memberSnapshot.name || "").replace(/"/g, '""')}"`,
      `"${app.membershipId}"`,
      `"${app.memberSnapshot.admissionNumber}"`,
      `"${app.memberSnapshot.department}"`,
      `"${app.memberSnapshot.semester}"`,
      `"${app.memberSnapshot.class || ""}"`,
      `"${app.memberSnapshot.email}"`,
      `"${app.memberSnapshot.phone}"`,
      `"${app.status}"`,
      `"${app.createdAt.toISOString()}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");

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

