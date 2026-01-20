import express from "express";
import { createStudentRegistration } from "../controllers/registrationController.js";

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Registrations
 */

/**
 * @openapi
 * /api/registrations:
 *   post:
 *     tags:
 *       - Registrations
 *     summary: Submit a student registration (main-site form)
 *     description: |
 *       Requires an `otpToken` from `/api/public/verify-otp` (recommended).
 *       Legacy fallback: provide raw `otp`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               otpToken: { type: string }
 *               otp: { type: string }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               phone: { type: string }
 *               admissionNo: { type: string }
 *               referralCode: { type: string }
 *               department: { type: string }
 *               yearOfJoining: { type: string }
 *               semester: { type: string }
 *               isLateralEntry: { type: boolean }
 *               interests:
 *                 type: array
 *                 items: { type: string }
 *               nonTechInterests: { type: string }
 *               experience: { type: string }
 *               motivation: { type: string }
 *               linkedin: { type: string }
 *               github: { type: string }
 *               portfolio: { type: string }
 *               profilePhoto: { type: string, nullable: true }
 *               idPhoto: { type: string, nullable: true }
 *             required:
 *               - email
 *               - firstName
 *               - lastName
 *               - phone
 *               - referralCode
 *               - department
 *               - yearOfJoining
 *               - semester
 *               - motivation
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Validation error
 *       409:
 *         description: Duplicate email
 */
router.post("/", createStudentRegistration);

export default router;
