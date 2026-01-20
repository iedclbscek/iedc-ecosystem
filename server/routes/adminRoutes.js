import express from "express";
import {
  getRegistrations,
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
} from "../controllers/teamController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  listEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  sendTestEmailTemplate,
  sendBulkEmailTemplate,
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

// Require auth for everything below
router.use(requireAuth);

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
router.get("/registrations", getRegistrations);

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
router.delete("/registrations/:id", deleteRegistration);

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
router.get("/users", listUsers);

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
router.get("/users/search", searchStudents);

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
router.post("/users/promote", promoteToTeam);

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
router.patch("/users/:id", updateUser);

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
router.delete("/users/:id", deleteUser);

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
router.get("/team/years", listWebsiteTeamYears);

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
router.get("/team/entries", listWebsiteTeamEntries);

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
router.post("/team/entries", createWebsiteTeamEntry);

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
router.patch("/team/entries/:id", updateWebsiteTeamEntry);

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
router.delete("/team/entries/:id", deleteWebsiteTeamEntry);

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
router.post("/team/entries/reorder", reorderWebsiteTeamEntries);

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
router.get("/email/templates", listEmailTemplates);

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
router.get("/email/templates/:id", getEmailTemplate);

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
router.post("/email/templates", createEmailTemplate);

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
router.patch("/email/templates/:id", updateEmailTemplate);

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
router.post("/email/templates/:id/test", sendTestEmailTemplate);

/**
 * @openapi
 * /api/admin/email/templates/{id}/bulk:
 *   post:
 *     tags:
 *       - Admin Email Templates
 *     summary: Send a bulk email using a template
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
 *         description: Dispatched
 */
router.post("/email/templates/:id/bulk", sendBulkEmailTemplate);

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

export default router;
