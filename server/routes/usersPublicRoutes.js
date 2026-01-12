import express from "express";
import { getMemberById } from "../controllers/publicMemberController.js";

const router = express.Router();

// Legacy-style endpoint: /api/users/member?id=IEDC24IT029
router.get("/member", getMemberById);

export default router;
