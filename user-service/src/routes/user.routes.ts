import { Router } from "express";
import {
  getMyProfileController,
  updateMyProfileController,
  uploadMyAvatarController,
  deleteMyAvatarController,
  createProfileController,
  getProfileController,
  updateProfileController,
} from "../controllers/user.controller";
import { authenticate } from "../middlewares/authenticate.middleware";
import { uploadImageMiddleware } from "../middlewares/upload.middleware";

const router = Router();

// Apply authentication middleware to all user endpoints
router.use(authenticate);

// Current user (/me) profile & avatar endpoints
router.get("/me", getMyProfileController);
router.put("/me", updateMyProfileController);
router.post(
  "/me/avatar",
  uploadImageMiddleware.single("avatar"),
  uploadMyAvatarController,
);
router.patch(
  "/me/avatar",
  uploadImageMiddleware.single("avatar"),
  uploadMyAvatarController,
);
router.delete("/me/avatar", deleteMyAvatarController);

// REST profile creation (Owner or Admin authorization checked inside controller)
router.post("/", createProfileController);

// Profile lookup and update by authUserId (Owner or Admin authorization checked inside controller)
router.get("/:authUserId", getProfileController);
router.put("/:authUserId", updateProfileController);

export default router;
