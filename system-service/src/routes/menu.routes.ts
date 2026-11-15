import { Router } from "express";
import { MenuController } from "../controllers/menu.controller";
import { requireAdmin } from "../middlewares/require-role.middleware";

const router = Router();

// ─── User Dynamic Menu Route ──────────────────────────────────────────────────
// Returns menu tree tailored for the authenticated user's role
router.get("/my-menu", MenuController.getMyMenu);

// ─── Admin Management Routes ──────────────────────────────────────────────────
// Only users with role: 'admin' can access these CRUD endpoints
router.get("/icons/search", requireAdmin, MenuController.searchIcons);
router.get("/", requireAdmin, MenuController.getAllMenus);
router.get("/:id", requireAdmin, MenuController.getMenuById);
router.post("/", requireAdmin, MenuController.createMenu);
router.put("/:id", requireAdmin, MenuController.updateMenu);
router.delete("/:id", requireAdmin, MenuController.deleteMenu);
router.patch("/reorder", requireAdmin, MenuController.reorderMenus);
router.post("/cache/clear", requireAdmin, MenuController.clearCache);

export default router;
