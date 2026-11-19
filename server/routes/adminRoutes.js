import express from "express";
import {
  getRegistrations,
  updateRegistration,
  deleteRegistration,
} from "../controllers/adminController.js";
import {
  login,
  logout,
  me,
  setPassword,
} from "../controllers/authController.js";
import {
  listUsers,
  updateUser,
  deleteUser,
  promoteToTeam,
  searchStudents,
  promoteClubPortalMember,
  updateClubPortalMember,
  listWebsiteTeamYears,
  listWebsiteTeamEntries,
  createWebsiteTeamEntry,
  updateWebsiteTeamEntry,
  deleteWebsiteTeamEntry,
  reorderWebsiteTeamEntries,
  uploadCloudinaryImage,
  requestWebsiteTeamUpdateEmail,
} from "../controllers/teamController.js";
import {
  requireAuth,
  requirePermission,
  requirePermissionOrClubManager,
} from "../middleware/requireAuth.js";
import { getOverview } from "../controllers/overviewController.js";
import {
  listEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  sendTestEmailTemplate,
  sendBulkEmailTemplate,
  getActiveMemberAudience,
} from "../controllers/emailTemplateController.js";
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  listClubEvents,
  createClubEvent,
  updateClubEvent,
  deleteClubEvent,
} from "../controllers/eventController.js";
import {
  listClubs,
  createClub,
  updateClub,
  deleteClub,
  getClubAccess,
} from "../controllers/clubController.js";
import {
  getApplications as getFirstYearRepApplications,
  getApplicationDetail as getFirstYearRepApplicationDetail,
  updateApplication as updateFirstYearRepApplication,
  deleteApplication as deleteFirstYearRepApplication,
  exportApplications as exportFirstYearRepApplications,
  getSettings as getFirstYearRepSettings,
  updateSettings as updateFirstYearRepSettings,
} from "../controllers/adminFirstYearRepController.js";
import {
  getApplications as getSecondYearRepApplications,
  getApplicationDetail as getSecondYearRepApplicationDetail,
  updateApplication as updateSecondYearRepApplication,
  deleteApplication as deleteSecondYearRepApplication,
  exportApplications as exportSecondYearRepApplications,
  getSettings as getSecondYearRepSettings,
  updateSettings as updateSecondYearRepSettings,
} from "../controllers/adminSecondYearRepController.js";

import { getClubPage, bindClubPage, saveClubPageDraft, publishClubPage, unpublishClubPage, getNexusOrder, putNexusOrder } from "../controllers/clubPageController.js";

import { getClubPageTeam } from "../controllers/clubPageTeamController.js";
const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Admin Auth
 *   - name: Admin Registrations
 *   - name: Admin Users
 *   - name: Admin Website Team
 *   - name: Admin Clubs
 *   - name: Admin Events
 *   - name: Admin Email Templates
 */

// Auth
/**
 * @openapi
 * /api/admin/auth/login:
 *   post:
 *     tags:
 *       - Admin Auth
 *     summary: Login (sets auth cookie)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               membershipId:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - membershipId
 *               - password
 *     responses:
 *       200:
 *         description: Logged in
 *       401:
 *         description: Invalid credentials
 */
router.post("/auth/login", login);

/**
 * @openapi
 * /api/admin/auth/logout:
 *   post:
 *     tags:
 *       - Admin Auth
 *     summary: Logout
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post("/auth/logout", logout);

/**
 * @openapi
 * /api/admin/auth/me:
 *   get:
 *     tags:
 *       - Admin Auth
 *     summary: Current user (requires auth)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 *       401:
 *         description: Not authenticated
 */
router.get("/auth/me", me);

/**
 * @openapi
 * /api/admin/auth/set-password:
 *   post:
 *     tags:
 *       - Admin Auth
 *     summary: Set password (token-based)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - token
 *               - password
 *     responses:
 *       200:
 *         description: Password set
 */
router.post("/auth/set-password", setPassword);

// Allow CORS preflight requests (OPTIONS) without authentication
router.options("*", (req, res) => {
  res.sendStatus(200);
});

// Require auth for everything below
router.use(requireAuth);
router.get("/clubs/:clubId/page", getClubPage);
router.get("/clubs/:clubId/page/team", getClubPageTeam);
router.patch("/clubs/:clubId/public-binding", bindClubPage);
router.put("/clubs/:clubId/page/draft", saveClubPageDraft);
router.post("/clubs/:clubId/page/publish", publishClubPage);
router.post("/clubs/:clubId/page/unpublish", unpublishClubPage);
router.get("/nexus/order", getNexusOrder);
router.put("/nexus/order", putNexusOrder);
/**
 * @openapi
 * /api/admin/overview:
 *   get:
 *     tags: [Admin Events]
 *     summary: Workspace dashboard metrics, activity and upcoming events
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: clubId, schema: { type: string }, description: Club workspace ID. Omit for IEDC. }
 *       - { in: query, name: days, schema: { type: integer, enum: [7, 30, 90], default: 30 } }
 *     responses:
 *       200: { description: Metrics available to the signed-in user }
 *       403: { description: Workspace access denied }
 */
router.get("/overview", getOverview);

// Registrations
/**
 * @openapi
 * /api/admin/registrations:
 *   get:
 *     tags:
 *       - Admin Registrations
 *     summary: List members/registrations
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: memberType
 *         schema:
 *           type: string
 *           enum: [student, staff, guest]
 *     responses:
 *       200:
 *         description: List response
 */
router.get("/registrations", requirePermission("registrations"), getRegistrations);

/**
 * @openapi
 * /api/admin/registrations/{id}:
 *   patch:
 *     tags:
 *       - Admin Registrations
 *     summary: Update a registration/member
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: memberType
 *         schema:
 *           type: string
 *           enum: [student, staff, guest]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string, format: email }
 *               department: { type: string }
 *               phone: { type: string }
 *               whatsappNumber: { type: string }
 *               admissionNo: { type: string, description: Student admission number. Send an empty string to clear it. }
 *               semester: { type: string, description: Students only. }
 *               membershipId: { type: string, description: Staff and guests only. }
 *               organization: { type: string, description: Guests only. }
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Invalid input
 *       404:
 *         description: No member matches the ID and category
 *       409:
 *         description: Email or identifier is already in use
 */
router.patch("/registrations/:id", requirePermission("registrations"), updateRegistration);

/**
 * @openapi
 * /api/admin/registrations/{id}:
 *   delete:
 *     tags:
 *       - Admin Registrations
 *     summary: Delete a registration/member
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: memberType
 *         schema:
 *           type: string
 *           enum: [student, staff, guest]
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete("/registrations/:id", requirePermission("registrations"), deleteRegistration);

// Team/User management
/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     tags:
 *       - Admin Users
 *     summary: List users
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users list
 */
router.get("/users", requirePermission("users"), listUsers);

/**
 * @openapi
 * /api/admin/users/search:
 *   get:
 *     tags:
 *       - Admin Users
 *     summary: Search members to promote
 *     description: Searches across supported member types.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Search results
 */
router.get("/users/search", requirePermissionOrClubManager("users"), searchStudents);

/**
 * @openapi
 * /api/admin/users/promote:
 *   post:
 *     tags:
 *       - Admin Users
 *     summary: Promote a member/registration to a portal user
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               registrationId: { type: string }
 *               memberType:
 *                 type: string
 *                 enum: [student, staff, guest]
 *                 description: Optional; helps resolve the source collection
 *               role:
 *                 type: string
 *                 description: One of Admin/Execom/Editor/Custom (case-insensitive)
 *               customRole:
 *                 type: string
 *                 description: Required when role is Custom
 *               permissions:
 *                 type: array
 *                 items: { type: string }
 *               portalAccessEnabled: { type: boolean }
 *             required:
 *               - registrationId
 *               - role
 *     responses:
 *       200:
 *         description: Promoted
 *       400:
 *         description: Validation error
 *       404:
 *         description: Member not found
 */
router.post("/users/promote", requirePermission("users"), promoteToTeam);

/**
 * @openapi
 * /api/admin/users/{id}:
 *   patch:
 *     tags:
 *       - Admin Users
 *     summary: Update a portal user
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role: { type: string }
 *               customRole: { type: string }
 *               permissions:
 *                 type: array
 *                 items: { type: string }
 *               portalAccessEnabled: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch("/users/:id", requirePermission("users"), updateUser);

/**
 * @openapi
 * /api/admin/users/{id}:
 *   delete:
 *     tags:
 *       - Admin Users
 *     summary: Delete a portal user
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete("/users/:id", requirePermission("users"), deleteUser);

// Website Team (Execom) year-wise entries
/**
 * @openapi
 * /api/admin/team/years:
 *   get:
 *     tags:
 *       - Admin Website Team
 *     summary: List years for a team category
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string, example: execom }
 *     responses:
 *       200:
 *         description: Years list
 */
router.get("/team/years", requirePermission("users"), listWebsiteTeamYears);

/**
 * @openapi
 * /api/admin/team/entries:
 *   get:
 *     tags:
 *       - Admin Website Team
 *     summary: List team entries
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string, example: execom }
 *       - in: query
 *         name: year
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Entries list
 */
router.get("/team/entries", requirePermission("users"), listWebsiteTeamEntries);

/**
 * @openapi
 * /api/admin/team/entries:
 *   post:
 *     tags:
 *       - Admin Website Team
 *     summary: Create a team entry
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category: { type: string, example: execom }
 *               year: { type: string }
 *               userId: { type: string }
 *               roleTitle: { type: string }
 *               visible: { type: boolean }
 *             required:
 *               - year
 *               - userId
 *     responses:
 *       201:
 *         description: Created
 *       409:
 *         description: Already exists
 */
router.post("/team/entries", requirePermission("users"), createWebsiteTeamEntry);

/**
 * @openapi
 * /api/admin/team/entries/{id}:
 *   patch:
 *     tags:
 *       - Admin Website Team
 *     summary: Update a team entry
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               year: { type: string }
 *               roleTitle: { type: string }
 *               visible: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch("/team/entries/:id", requirePermission("users"), updateWebsiteTeamEntry);

/**
 * @openapi
 * /api/admin/team/entries/{id}/request-update-email:
 *   post:
 *     tags:
 *       - Admin Website Team
 *     summary: Send self-update email for a team entry
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Email sent
 */
router.post(
  "/team/entries/:id/request-update-email",
  requirePermission("users"),
  requestWebsiteTeamUpdateEmail,
);

/**
 * @openapi
 * /api/admin/team/entries/{id}:
 *   delete:
 *     tags:
 *       - Admin Website Team
 *     summary: Delete a team entry
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete("/team/entries/:id", requirePermission("users"), deleteWebsiteTeamEntry);

/**
 * @openapi
 * /api/admin/team/entries/reorder:
 *   post:
 *     tags:
 *       - Admin Website Team
 *     summary: Reorder team entries within a year
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category: { type: string, example: execom }
 *               year: { type: string }
 *               orderedIds:
 *                 type: array
 *                 items: { type: string }
 *             required:
 *               - year
 *               - orderedIds
 *     responses:
 *       200:
 *         description: Reordered
 */
router.post("/team/entries/reorder", requirePermission("users"), reorderWebsiteTeamEntries);

// Media uploads (Cloudinary for execom photos)
router.post("/uploads/cloudinary", uploadCloudinaryImage);

// Club-scoped portal members (club leads)
/**
 * @openapi
 * /api/admin/clubs/{clubId}/portal-members:
 *   post:
 *     tags:
 *       - Admin Users
 *     summary: Create/enable a club portal member
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Depends on club portal flow
 *     responses:
 *       200:
 *         description: Updated/created
 */
router.post("/clubs/:clubId/portal-members", promoteClubPortalMember);

/**
 * @openapi
 * /api/admin/clubs/{clubId}/portal-members/{userId}:
 *   patch:
 *     tags:
 *       - Admin Users
 *     summary: Update a club portal member
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch("/clubs/:clubId/portal-members/:userId", updateClubPortalMember);

// Email templates
/**
 * @openapi
 * /api/admin/email/templates:
 *   get:
 *     tags:
 *       - Admin Email Templates
 *     summary: List email templates
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates list
 */
router.get("/email/templates", requirePermission("mailer"), listEmailTemplates);

/**
 * @openapi
 * /api/admin/email/templates/{id}:
 *   get:
 *     tags:
 *       - Admin Email Templates
 *     summary: Get one email template
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Template
 */
router.get("/email/templates/:id", requirePermission("mailer"), getEmailTemplate);

/**
 * @openapi
 * /api/admin/email/templates:
 *   post:
 *     tags:
 *       - Admin Email Templates
 *     summary: Create an email template
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key: { type: string }
 *               name: { type: string }
 *               subject: { type: string }
 *               html: { type: string }
 *             required: [key, name, html]
 *     responses:
 *       201:
 *         description: Created
 */
router.post("/email/templates", requirePermission("mailer"), createEmailTemplate);

/**
 * @openapi
 * /api/admin/email/templates/{id}:
 *   patch:
 *     tags:
 *       - Admin Email Templates
 *     summary: Update an email template
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               subject: { type: string }
 *               html: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch("/email/templates/:id", requirePermission("mailer"), updateEmailTemplate);

/**
 * @openapi
 * /api/admin/email/templates/{id}:
 *   delete:
 *     tags:
 *       - Admin Email Templates
 *     summary: Delete an email template (non-base only)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 *       400:
 *         description: Cannot delete base template
 */
router.delete("/email/templates/:id", requirePermission("mailer"), deleteEmailTemplate);

/**
 * @openapi
 * /api/admin/email/templates/{id}/test:
 *   post:
 *     tags:
 *       - Admin Email Templates
 *     summary: Send a test email using a template
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to: { type: string }
 *               data: { type: object }
 *             required: [to]
 *     responses:
 *       200:
 *         description: Sent
 */
router.post("/email/templates/:id/test", requirePermission("mailer"), sendTestEmailTemplate);

/**
 * @openapi
 * /api/admin/email/active-member-audience:
 *   get:
 *     tags: [Admin Email Templates]
 *     summary: Preview a filtered active-member email audience
 *     description: The total applies both filters together. Options cover all active registrations with a valid email address. Only requests with a page parameter include recipient identities. Results are ordered by first name, last name and registration ID.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: department
 *         description: Exact department label, ignoring case and surrounding whitespace.
 *         schema: { type: string, minLength: 1 }
 *       - in: query
 *         name: yearOfJoining
 *         schema: { type: string, pattern: '^[0-9]{4}$' }
 *       - in: query
 *         name: page
 *         description: One-based recipient page of up to 10 members. A page beyond the final page returns an empty array.
 *         schema: { type: integer, minimum: 1, maximum: 100000 }
 *     responses:
 *       200:
 *         description: Available department labels, joining years (newest first) and current recipient count.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [departments, years, total]
 *               properties:
 *                 departments: { type: array, items: { type: string } }
 *                 years: { type: array, items: { type: string } }
 *                 total: { type: integer, minimum: 0 }
 *                 page: { type: integer, minimum: 1, description: Requested page when pagination is enabled. }
 *                 totalPages: { type: integer, minimum: 1 }
 *                 members:
 *                   type: array
 *                   maxItems: 10
 *                   items:
 *                     type: object
 *                     required: [id, firstName, lastName, email, department, yearOfJoining]
 *                     properties:
 *                       id: { type: string }
 *                       firstName: { type: string }
 *                       lastName: { type: string }
 *                       email: { type: string, format: email }
 *                       department: { type: string }
 *                       yearOfJoining: { type: string }
 *       400:
 *         description: Invalid audience filter
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Mailer permission required
 */
router.get("/email/active-member-audience", requirePermission("mailer"), getActiveMemberAudience);

/**
 * @openapi
 * /api/admin/email/templates/{id}/bulk:
 *   post:
 *     tags: [Admin Email Templates]
 *     summary: Send a saved email template to active members or supplied recipients
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required: [sendTo]
 *                 properties:
 *                   sendTo: { type: string, enum: [all] }
 *                   data: { type: object, additionalProperties: true }
 *                   filters:
 *                     type: object
 *                     additionalProperties: false
 *                     description: Omit both filters for all eligible active members. Supplying both selects their intersection.
 *                     properties:
 *                       department: { type: string, minLength: 1 }
 *                       yearOfJoining: { type: string, pattern: '^[0-9]{4}$' }
 *               - type: object
 *                 required: [sendTo, recipients]
 *                 properties:
 *                   sendTo: { type: string, enum: [list] }
 *                   data: { type: object, additionalProperties: true }
 *                   recipients:
 *                     type: array
 *                     minItems: 1
 *                     maxItems: 2000
 *                     items:
 *                       type: object
 *                       required: [email]
 *                       properties:
 *                         email: { type: string, format: email }
 *                         data: { type: object, additionalProperties: true }
 *     responses:
 *       200:
 *         description: Delivery totals for the selected recipients, including up to ten failures.
 *       400:
 *         description: Invalid audience filter or recipient list
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Mailer permission required
 *       404:
 *         description: Template not found
 */
router.post("/email/templates/:id/bulk", requirePermission("mailer"), sendBulkEmailTemplate);

// Events
/**
 * @openapi
 * /api/admin/events:
 *   get:
 *     tags:
 *       - Admin Events
 *     summary: List events (legacy)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Events
 */
router.get("/events", listEvents);

/**
 * @openapi
 * /api/admin/events:
 *   post:
 *     tags:
 *       - Admin Events
 *     summary: Create an event (legacy)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 */
router.post("/events", createEvent);

/**
 * @openapi
 * /api/admin/events/{id}:
 *   patch:
 *     tags:
 *       - Admin Events
 *     summary: Update an event (legacy)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch("/events/:id", updateEvent);

/**
 * @openapi
 * /api/admin/events/{id}:
 *   delete:
 *     tags:
 *       - Admin Events
 *     summary: Delete an event (legacy)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete("/events/:id", deleteEvent);

// Club Events
/**
 * @openapi
 * /api/admin/clubs/{clubId}/events:
 *   get:
 *     tags:
 *       - Admin Events
 *     summary: List events for a club
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Club events
 */
router.get("/clubs/:clubId/events", listClubEvents);

/**
 * @openapi
 * /api/admin/clubs/{clubId}/events:
 *   post:
 *     tags:
 *       - Admin Events
 *     summary: Create an event for a club
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 */
router.post("/clubs/:clubId/events", createClubEvent);

/**
 * @openapi
 * /api/admin/clubs/{clubId}/events/{eventId}:
 *   patch:
 *     tags:
 *       - Admin Events
 *     summary: Update a club event
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch("/clubs/:clubId/events/:eventId", updateClubEvent);

/**
 * @openapi
 * /api/admin/clubs/{clubId}/events/{eventId}:
 *   delete:
 *     tags:
 *       - Admin Events
 *     summary: Delete a club event
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete("/clubs/:clubId/events/:eventId", deleteClubEvent);

// Clubs
/**
 * @openapi
 * /api/admin/clubs:
 *   get:
 *     tags:
 *       - Admin Clubs
 *     summary: List clubs
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Clubs list
 */
router.get("/clubs", listClubs);

/**
 * @openapi
 * /api/admin/clubs:
 *   post:
 *     tags:
 *       - Admin Clubs
 *     summary: Create a club
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 */
router.post("/clubs", createClub);

/**
 * @openapi
 * /api/admin/clubs/{id}:
 *   get:
 *     tags:
 *       - Admin Clubs
 *     summary: Get a club (access check)
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Club
 */
router.get("/clubs/:id", getClubAccess);

/**
 * @openapi
 * /api/admin/clubs/{id}:
 *   patch:
 *     tags:
 *       - Admin Clubs
 *     summary: Update a club
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch("/clubs/:id", updateClub);

/**
 * @openapi
 * /api/admin/clubs/{id}:
 *   delete:
 *     tags:
 *       - Admin Clubs
 *     summary: Delete a club
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete("/clubs/:id", deleteClub);

// First-Year Representatives
/**
 * @openapi
 * /api/admin/first-year-reps:
 *   get:
 *     tags:
 *       - Admin First-Year Reps
 *     summary: List first-year representative applications
 *     security:
 *       - cookieAuth: []
 */
router.get("/first-year-reps", requirePermission("firstYearReps"), getFirstYearRepApplications);

/**
 * @openapi
 * /api/admin/first-year-reps/settings:
 *   get:
 *     tags:
 *       - Admin First-Year Reps
 *     summary: Get first-year rep application settings
 *     security:
 *       - cookieAuth: []
 */
router.get("/first-year-reps/settings", requirePermission("firstYearReps"), getFirstYearRepSettings);

/**
 * @openapi
 * /api/admin/first-year-reps/settings:
 *   patch:
 *     tags:
 *       - Admin First-Year Reps
 *     summary: Update first-year rep application settings (e.g. open/close)
 *     security:
 *       - cookieAuth: []
 */
router.patch("/first-year-reps/settings", requirePermission("firstYearReps"), updateFirstYearRepSettings);

/**
 * @openapi
 * /api/admin/first-year-reps/export/csv:
 *   get:
 *     tags:
 *       - Admin First-Year Reps
 *     summary: Export applications to CSV
 *     security:
 *       - cookieAuth: []
 */
router.get("/first-year-reps/export/csv", requirePermission("firstYearReps"), exportFirstYearRepApplications);

/**
 * @openapi
 * /api/admin/first-year-reps/{id}:
 *   get:
 *     tags:
 *       - Admin First-Year Reps
 *     summary: Get single application detail
 *     security:
 *       - cookieAuth: []
 */
router.get("/first-year-reps/:id", requirePermission("firstYearReps"), getFirstYearRepApplicationDetail);

/**
 * @openapi
 * /api/admin/first-year-reps/{id}:
 *   patch:
 *     tags:
 *       - Admin First-Year Reps
 *     summary: Update application status and remarks
 *     security:
 *       - cookieAuth: []
 */
router.patch("/first-year-reps/:id", requirePermission("firstYearReps"), updateFirstYearRepApplication);

/**
 * @openapi
 * /api/admin/first-year-reps/{id}:
 *   delete:
 *     tags:
 *       - Admin First Year Reps
 *     summary: Delete an application
 *     security:
 *       - cookieAuth: []
 */
router.delete("/first-year-reps/:id", requirePermission("firstYearReps"), deleteFirstYearRepApplication);

// Second Year Reps
router.get("/second-year-reps", getSecondYearRepApplications);
router.get("/second-year-reps/settings", getSecondYearRepSettings);
router.patch("/second-year-reps/settings", updateSecondYearRepSettings);
router.get("/second-year-reps/export/csv", exportSecondYearRepApplications);
router.get("/second-year-reps/:id", getSecondYearRepApplicationDetail);
router.patch("/second-year-reps/:id", updateSecondYearRepApplication);
router.delete("/second-year-reps/:id", deleteSecondYearRepApplication);

export default router;
