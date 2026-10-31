import { Router } from "express";
import menuRoutes from "./menu.routes";

const router = Router();

// Menu & Navigation RBAC routes -> /api/v1/menus
router.use("/menus", menuRoutes);

export default router;
