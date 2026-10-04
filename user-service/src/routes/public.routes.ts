import { Router } from "express";
import { getLandingDataController } from "../controllers/public.controller";

const router = Router();

// GET /api/v1/public/landing-data
// No authentication required — public endpoint
router.get("/landing-data", getLandingDataController);

export default router;
