import express from "express";
import {
  getPublicEventById,
  listPublicEvents,
} from "../controllers/eventController.js";

const router = express.Router();

/**
 * @openapi
 * /api/events:
 *   get:
 *     tags:
 *       - Public
 *     summary: List all public events
 *     responses:
 *       200:
 *         description: Events list
 */
router.get("/events", listPublicEvents);

/**
 * @openapi
 * /api/events/{id}:
 *   get:
 *     tags:
 *       - Public
 *     summary: Get one public event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Event
 *       404:
 *         description: Not found
 */
router.get("/events/:id", getPublicEventById);

export default router;
