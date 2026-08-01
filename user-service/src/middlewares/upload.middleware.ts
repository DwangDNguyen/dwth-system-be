import multer from "multer";
import { AppError } from "../utils/base.error";
import { HTTP_STATUS } from "../constants/http-status";

// Use MemoryStorage so raw file Buffer can be passed directly to sharp
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const uploadImageMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          "Invalid file type. Only JPG, PNG, and WebP images are allowed.",
          HTTP_STATUS.BAD_REQUEST,
        ),
      );
    }
  },
});
