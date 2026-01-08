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
} from "../controllers/teamController.js";
import {
  listEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  sendTestEmailTemplate,
} from "../controllers/emailTemplateController.js";
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../controllers/eventController.js";

const router = express.Router();

// Auth
router.post("/auth/login", login);
router.post("/auth/logout", logout);
router.get("/auth/me", me);
router.post("/auth/set-password", setPassword);

// Registrations
router.get("/registrations", getRegistrations);
router.delete("/registrations/:id", deleteRegistration);

// Team/User management
router.get("/users", listUsers);
router.get("/users/search", searchStudents);
router.post("/users/promote", promoteToTeam);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Email templates
router.get("/email/templates", listEmailTemplates);
router.get("/email/templates/:id", getEmailTemplate);
router.post("/email/templates", createEmailTemplate);
router.patch("/email/templates/:id", updateEmailTemplate);
router.post("/email/templates/:id/test", sendTestEmailTemplate);

// Events
router.get("/events", listEvents);
router.post("/events", createEvent);
router.patch("/events/:id", updateEvent);
router.delete("/events/:id", deleteEvent);

export default router;
