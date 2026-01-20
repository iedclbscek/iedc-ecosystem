import express from "express";
import { getMemberById } from "../controllers/publicMemberController.js";

const router = express.Router();

// Legacy-style endpoint: /api/users/member?id=IEDC24IT029
/**
 * @openapi
 * /api/users/member:
 *   get:
 *     tags:
 *       - Public
 *     summary: Legacy member lookup (users namespace)
 *     parameters:
 *       - in: query
 *         name: id
 *         schema: { type: string }
 *       - in: query
 *         name: membershipId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Member data
 */
router.get("/member", getMemberById);

export default router;
