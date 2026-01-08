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

// Auth
router.post("/auth/login", login);
router.post("/auth/logout", logout);
router.get("/auth/me", me);
router.post("/auth/set-password", setPassword);

// Require auth for everything below
router.use(requireAuth);

// Registrations
router.get("/registrations", getRegistrations);
router.delete("/registrations/:id", deleteRegistration);

// Team/User management
router.get("/users", listUsers);
router.get("/users/search", searchStudents);
router.post("/users/promote", promoteToTeam);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Club-scoped portal members (club leads)
router.post("/clubs/:clubId/portal-members", promoteClubPortalMember);
router.patch("/clubs/:clubId/portal-members/:userId", updateClubPortalMember);

// Email templates
router.get("/email/templates", listEmailTemplates);
router.get("/email/templates/:id", getEmailTemplate);
router.post("/email/templates", createEmailTemplate);
router.patch("/email/templates/:id", updateEmailTemplate);
router.post("/email/templates/:id/test", sendTestEmailTemplate);
router.post("/email/templates/:id/bulk", sendBulkEmailTemplate);

// Events
router.get("/events", listEvents);
router.post("/events", createEvent);
router.patch("/events/:id", updateEvent);
router.delete("/events/:id", deleteEvent);

// Club Events
router.get("/clubs/:clubId/events", listClubEvents);
router.post("/clubs/:clubId/events", createClubEvent);
router.patch("/clubs/:clubId/events/:eventId", updateClubEvent);
router.delete("/clubs/:clubId/events/:eventId", deleteClubEvent);

// Clubs
router.get("/clubs", listClubs);
router.post("/clubs", createClub);
router.get("/clubs/:id", getClubAccess);
router.patch("/clubs/:id", updateClub);
router.delete("/clubs/:id", deleteClub);

export default router;
